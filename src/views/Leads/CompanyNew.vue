<template>
  <form class="ld-page add-lead" data-testid="add-lead" novalidate @submit.prevent="save">
    <h2 class="ld-title">{{ $t("leads.add.title") }}</h2>

    <!-- the company is saved; only its contact failed — it stays here, one tap from the card -->
    <p v-if="company" class="add-lead__saved" role="status" data-testid="add-lead-company-saved">
      {{ $t("leads.add.company_saved") }}
      <router-link :to="cardRoute(company.id)">{{ company.name }}</router-link>
    </p>

    <fieldset class="add-lead__group" :disabled="Boolean(company)">
      <legend>{{ $t("leads.add.company") }}</legend>
      <label class="ld-field">
        <span>{{ $t("leads.add.domain") }} *</span>
        <input v-model.trim="form.domain" class="ld-input" inputmode="url" autocomplete="off" :placeholder="$t('leads.add.domain_hint')" data-testid="add-lead-domain" />
        <span v-if="fieldError('domain')" class="ld-error" data-testid="add-lead-domain-error">{{ fieldError("domain") }}</span>
        <span v-if="existing" class="ld-error" data-testid="add-lead-exists">
          {{ $t("leads.add.exists") }}
          <router-link :to="cardRoute(existing.id)">{{ existing.name || existing.domain }}</router-link>
        </span>
      </label>
      <label class="ld-field">
        <span>{{ $t("leads.add.name") }}</span>
        <input v-model.trim="form.name" class="ld-input" data-testid="add-lead-name" />
      </label>
      <label class="ld-field">
        <span>{{ $t("leads.add.lead_type") }}</span>
        <select v-model="form.lead_type" class="ld-input" data-testid="add-lead-type">
          <option value="UNKNOWN">{{ $t("leads.lead_types.unknown") }}</option>
          <option v-for="type in leadTypes.active" :key="type.code" :value="type.code">{{ type.label }}</option>
        </select>
        <span v-if="fieldError('lead_type')" class="ld-error">{{ fieldError("lead_type") }}</span>
      </label>
    </fieldset>

    <fieldset class="add-lead__group">
      <legend>{{ $t("leads.add.contact") }}</legend>
      <ContactFields :form="form" :error-of="fieldError" testid="add-lead" />
    </fieldset>

    <p v-if="error" class="ld-error" data-testid="add-lead-error">{{ error }}</p>
    <div class="ld-row">
      <button type="submit" class="ld-btn ld-btn--primary" :disabled="busy || !form.domain" data-testid="add-lead-save">
        {{ $t(company ? "leads.add.save_contact" : "leads.add.save") }}
      </button>
      <router-link v-if="!company" :to="{ name: 'LeadsCompanies' }" class="ld-btn add-lead__cancel">{{ $t("common.cancel") }}</router-link>
    </div>
  </form>
</template>

<script setup>
import { onMounted, reactive, ref } from "vue";
import { useRouter } from "vue-router";
import { t } from "@/i18n";
import { GET_Companies, POST_Company, POST_Contact } from "@/api/leads/api";
import { extractApiMessage, useFormErrors } from "@/composables/useFormErrors";
import { useLeadTypesStore } from "@/stores/leadTypes";
import ContactFields from "./ContactFields.vue";

// One lead by hand (UX-006): the company, then its contact — the two creates the API offers, so the company lands
// where an imported row lands (first stage, "company created"). Legal basis stays optional as in the import: the
// outreach gate refuses a contact without one. The rest (phone, job title, industry) lives on the company card.
const CONTACT_FIELDS = ["email", "first_name", "last_name", "legal_basis", "consent_ref"];

const router = useRouter();
const { handleApiError, getFieldError, clearErrors } = useFormErrors();
const form = reactive({ domain: "", name: "", lead_type: "UNKNOWN", email: "", first_name: "", last_name: "", legal_basis: "", consent_ref: "" });
const leadTypes = useLeadTypesStore();
const company = ref(null); // set once the company exists — a retry saves the contact only
const existing = ref(null);
const error = ref("");
const busy = ref(false);

const cardRoute = (id) => ({ name: "LeadsThread", params: { id } });
const fieldError = (name) => getFieldError(name)?.msg || "";
const errorCode = (err) => (err?.response?.data || err)?.error || "";
const hasContact = () => ["email", "first_name", "last_name"].some((field) => form[field]);

// The host a user typed ("https://www.shop.pl/x" → "shop.pl") — enough to find the company that already holds it.
const hostOf = (value) => value.replace(/^[a-z]+:\/\//i, "").split(/[/?#]/)[0].replace(/^www\./i, "").toLowerCase();

async function findExisting() {
  const host = hostOf(form.domain);
  const { data } = await GET_Companies({ search: host });
  return (data.results || []).find((row) => host === row.domain || host.endsWith(`.${row.domain}`)) || null;
}

async function createCompany() {
  const body = { domain: form.domain, lead_type: form.lead_type, ...(form.name ? { name: form.name } : {}) };
  try {
    company.value = (await POST_Company(body)).data;
    return true;
  } catch (err) {
    if (errorCode(err) === "DOMAIN_EXISTS") {
      existing.value = await findExisting().catch(() => null);
      if (!existing.value) error.value = t("leads.add.exists");
      return false;
    }
    handleApiError(err);
    if (!fieldError("domain") && !fieldError("lead_type")) error.value = extractApiMessage(err, t("leads.review.error"));
    return false;
  }
}

async function createContact() {
  const body = Object.fromEntries(CONTACT_FIELDS.filter((field) => form[field]).map((field) => [field, form[field]]));
  try {
    await POST_Contact({ company_id: company.value.id, ...body });
    return true;
  } catch (err) {
    handleApiError(err);
    error.value = extractApiMessage(err, t("leads.review.error"));
    return false;
  }
}

async function save() {
  if (busy.value) return;
  busy.value = true;
  error.value = "";
  existing.value = null;
  clearErrors();
  try {
    if (!company.value && !(await createCompany())) return;
    if (hasContact() && !(await createContact())) return;
    router.push(cardRoute(company.value.id));
  } finally {
    busy.value = false;
  }
}

onMounted(() => leadTypes.load()); // a failed load leaves Unknown only
</script>

<style src="./desktop.css"></style>
<style scoped>
.add-lead {
  max-width: 640px;
}
.add-lead__group {
  display: flex;
  flex-direction: column;
  gap: var(--space-200);
  margin: 0;
  padding: 0;
  border: none;
}
.add-lead__group legend {
  margin-bottom: var(--space-200);
  font-weight: 600;
}
.add-lead .ld-input {
  min-height: 44px;
  width: 100%;
  box-sizing: border-box;
}
.add-lead__saved {
  margin: 0;
  padding: var(--space-200) var(--space-300);
  border-radius: 8px;
  background: var(--surface-raised);
}
.add-lead__cancel {
  display: inline-flex;
  align-items: center;
  text-decoration: none;
}
</style>
