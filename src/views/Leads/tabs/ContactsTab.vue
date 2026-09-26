<template>
  <div class="contacts" data-testid="contacts-tab">
    <form
      v-if="mode === 'add'"
      class="contacts__form"
      data-testid="contact-add-form"
      novalidate
      @submit.prevent="save(null)"
    >
      <p class="contacts__legend">{{ $t("leads.contacts.add") }}</p>
      <ContactFields
        :form="draft"
        :error-of="fieldError"
        testid="contact-new"
        full
      />
      <p v-if="error" class="ld-error" data-testid="contact-error">
        {{ error }}
      </p>
      <div class="ld-row">
        <button
          class="ld-btn ld-btn--primary"
          type="submit"
          :disabled="busy"
          data-testid="contact-save"
        >
          {{ $t("common.save") }}
        </button>
        <button
          class="ld-btn"
          type="button"
          data-testid="contact-cancel"
          @click="close"
        >
          {{ $t("common.cancel") }}
        </button>
      </div>
    </form>
    <div v-else class="ld-row">
      <button
        class="ld-btn ld-btn--primary"
        type="button"
        data-testid="contact-add"
        @click="open('add')"
      >
        {{ $t("leads.contacts.add") }}
      </button>
    </div>
    <p
      v-if="status"
      class="ld-muted"
      role="status"
      data-testid="contact-status"
    >
      {{ status }}
    </p>

    <div class="contacts__scroll">
      <table class="ld-table" data-testid="company-contacts">
        <thead>
          <tr>
            <th>{{ $t("leads.contacts.primary") }}</th>
            <th>{{ $t("leads.contacts.name") }}</th>
            <th>{{ $t("leads.contacts.email") }}</th>
            <th>{{ $t("leads.contacts.legal_basis") }}</th>
            <th>{{ $t("leads.contacts.suppressed") }}</th>
            <th>
              <span class="contacts__sr">{{
                $t("leads.contacts.actions")
              }}</span>
            </th>
          </tr>
        </thead>
        <tbody>
          <template v-for="contact in company.contacts" :key="contact.id">
            <tr v-if="mode === contact.id" data-testid="contact-edit-row">
              <td colspan="6">
                <form
                  class="contacts__form"
                  novalidate
                  data-testid="contact-edit-form"
                  @submit.prevent="save(contact)"
                >
                  <ContactFields
                    :form="draft"
                    :error-of="fieldError"
                    testid="contact-edit"
                    full
                    :email-locked="Boolean(contact.email)"
                    :consent-recorded="contact.legal_basis === 'consent'"
                  />
                  <p v-if="error" class="ld-error" data-testid="contact-error">
                    {{ error }}
                  </p>
                  <div class="ld-row">
                    <button
                      class="ld-btn ld-btn--primary"
                      type="submit"
                      :disabled="busy"
                      data-testid="contact-save"
                    >
                      {{ $t("common.save") }}
                    </button>
                    <button
                      class="ld-btn"
                      type="button"
                      data-testid="contact-cancel"
                      @click="close"
                    >
                      {{ $t("common.cancel") }}
                    </button>
                  </div>
                </form>
              </td>
            </tr>
            <tr
              v-else
              data-testid="contact-row"
              :class="{ 'contacts__row--anonymised': contact.anonymised_at }"
            >
              <td>
                <button
                  v-if="!contact.anonymised_at"
                  class="contacts__star"
                  :class="{ 'contacts__star--on': contact.is_primary }"
                  type="button"
                  :aria-pressed="contact.is_primary"
                  :title="
                    $t(
                      contact.is_primary
                        ? 'leads.contacts.primary'
                        : 'leads.contacts.make_primary'
                    )
                  "
                  :aria-label="
                    $t(
                      contact.is_primary
                        ? 'leads.contacts.primary'
                        : 'leads.contacts.make_primary'
                    )
                  "
                  :disabled="busy"
                  data-testid="contact-primary"
                  @click="togglePrimary(contact)"
                >
                  <FontAwesomeIcon icon="star" />
                </button>
              </td>
              <td>
                {{ contact.first_name }} {{ contact.last_name }}
                <span v-if="contact.job_title" class="ld-muted contacts__job">{{
                  contact.job_title
                }}</span>
              </td>
              <td class="contacts__email">{{ contact.email }}</td>
              <td>
                <span v-if="contact.anonymised_at" class="ld-badge">{{
                  $t("leads.contacts.anonymised")
                }}</span>
                <span v-else-if="contact.legal_basis" class="ld-badge">{{
                  legalBasisLabel(contact.legal_basis)
                }}</span>
              </td>
              <td>
                {{ isSuppressed(contact) ? $t("leads.contacts.yes") : "" }}
              </td>
              <td>
                <div
                  v-if="!contact.anonymised_at"
                  class="ld-row contacts__actions"
                >
                  <button
                    class="ld-btn"
                    type="button"
                    data-testid="contact-edit"
                    @click="open(contact.id, contact)"
                  >
                    {{ $t("common.edit") }}
                  </button>
                  <button
                    class="ld-btn ld-btn--danger"
                    type="button"
                    data-testid="contact-remove"
                    @click="confirming = contact"
                  >
                    {{ $t("leads.contacts.remove") }}
                  </button>
                </div>
              </td>
            </tr>
          </template>
        </tbody>
      </table>
    </div>

    <ConfirmSheet
      v-if="confirming"
      :title="$t('leads.contacts.remove_title', { name: nameOf(confirming) })"
      :message="$t('leads.contacts.remove_message')"
      :confirm-label="$t('leads.contacts.remove')"
      :cancel-label="$t('common.cancel')"
      @confirm="remove(confirming)"
      @cancel="confirming = null"
    />
  </div>
</template>

<script setup>
import { onMounted, reactive, ref } from "vue";
import { t } from "@/i18n";
import { GET_Suppressions } from "@/api/communicator/api";
import { DELETE_Contact, PATCH_Contact, POST_Contact } from "@/api/leads/api";
import { extractApiMessage, useFormErrors } from "@/composables/useFormErrors";
import { legalBasisLabel } from "@/utils/leadsLabels";
import ConfirmSheet from "../ConfirmSheet.vue";
import ContactFields from "../ContactFields.vue";

// Contacts of the company card (UX-011): add, edit in place, remove, primary star — one form open at a time.
// Remove answers 204 (never used, deleted) or 200 (used, anonymised: the thread and timeline keep it), and the line
// under the button says which. An anonymised row is history only: no star, no edit, no remove.
// Suppressed = opted out, anonymised, or the email/domain on the communicator suppression list.
const props = defineProps({ company: { type: Object, required: true } });
const emit = defineEmits(["changed"]);

const TEXT = [
  "email",
  "first_name",
  "last_name",
  "job_title",
  "phone",
  "language",
  "legal_basis",
];
const NULLABLE = ["language", "legal_basis"]; // "" clears them as null; the other text fields clear as ""
const { errors, handleApiError, getFieldError, clearErrors } = useFormErrors();
const suppressed = ref(new Set());
const mode = ref(null); // null | "add" | the id of the contact in edit
const draft = reactive({});
const confirming = ref(null);
const busy = ref(false);
const error = ref("");
const status = ref("");

const fieldError = (name) => getFieldError(name)?.msg || "";
const nameOf = (contact) =>
  `${contact.first_name} ${contact.last_name}`.trim() || contact.email || "—";
const valuesOf = (contact) => ({
  ...Object.fromEntries(TEXT.map((field) => [field, contact?.[field] || ""])),
  consent_ref: "",
  is_primary: Boolean(contact?.is_primary),
});

function isSuppressed(contact) {
  if (contact.opt_out_at || contact.anonymised_at) return true;
  return (
    suppressed.value.has(contact.email.toLowerCase()) ||
    suppressed.value.has(props.company.domain)
  );
}

function open(next, contact = null) {
  Object.assign(draft, valuesOf(contact));
  mode.value = next;
  error.value = "";
  status.value = "";
  clearErrors();
}

const close = () => (mode.value = null);

// A create sends what is filled; an edit sends what changed — "" clears, as null for language and legal basis.
function bodyOf(contact) {
  const before = valuesOf(contact);
  const changed = TEXT.filter((field) => draft[field] !== before[field]);
  const body = Object.fromEntries(
    changed.map((field) => [
      field,
      NULLABLE.includes(field) ? draft[field] || null : draft[field],
    ])
  );
  if (body.language) body.language = body.language.toLowerCase();
  if (draft.is_primary !== before.is_primary)
    body.is_primary = draft.is_primary;
  if (body.legal_basis === "consent") body.consent_ref = draft.consent_ref;
  if (!contact)
    return Object.fromEntries(
      Object.entries(body).filter(
        ([, value]) => value !== null && value !== false
      )
    );
  return body;
}

function showError(err) {
  handleApiError(err);
  const code = (err?.response?.data || err)?.error;
  if (code === "CONTACT_EXISTS")
    errors.email = { status: "error", msg: t("leads.contacts.exists") };
  const onField = Object.keys(errors).some((field) => field in draft);
  error.value = onField ? "" : extractApiMessage(err, t("leads.review.error"));
}

async function save(contact) {
  if (busy.value) return;
  const body = bodyOf(contact);
  if (contact && !Object.keys(body).length) return close();
  busy.value = true;
  error.value = "";
  clearErrors();
  try {
    await (contact
      ? PATCH_Contact(contact.id, body)
      : POST_Contact({ company_id: props.company.id, ...body }));
    status.value = t(contact ? "leads.contacts.saved" : "leads.contacts.added");
    close();
    emit("changed");
  } catch (err) {
    showError(err);
  } finally {
    busy.value = false;
  }
}

async function run(call, done) {
  busy.value = true;
  status.value = "";
  try {
    status.value = done(await call());
    emit("changed");
  } catch (err) {
    status.value = extractApiMessage(err, t("leads.review.error"));
  } finally {
    busy.value = false;
  }
}

const togglePrimary = (contact) =>
  run(
    () => PATCH_Contact(contact.id, { is_primary: !contact.is_primary }),
    () => ""
  );

// 204 = never used, deleted; 200 = used, so the API anonymised it instead.
function remove(contact) {
  confirming.value = null;
  if (mode.value === contact.id) close();
  return run(
    () => DELETE_Contact(contact.id),
    (response) =>
      t(
        response?.status === 204
          ? "leads.contacts.removed"
          : "leads.contacts.anonymised_done"
      )
  );
}

onMounted(async () => {
  const { data } = await GET_Suppressions();
  suppressed.value = new Set(data.results.map((row) => row.value));
});
</script>

<style src="../desktop.css"></style>
<style scoped>
.contacts {
  display: flex;
  flex-direction: column;
  gap: var(--space-300);
}
.contacts__form {
  display: flex;
  flex-direction: column;
  gap: var(--space-200);
  max-width: 640px;
}
.contacts__legend {
  margin: 0;
  font-weight: 600;
}
.contacts__form .ld-btn,
.contacts__actions .ld-btn {
  min-height: 44px;
}
.contacts__actions {
  justify-content: flex-end;
}
.contacts__scroll {
  overflow-x: auto;
}
.contacts__email {
  overflow-wrap: anywhere;
}
.contacts__job {
  display: block;
}
.contacts__star {
  min-width: 44px;
  min-height: 44px;
  border: none;
  background: none;
  color: var(--text-muted);
  cursor: pointer;
}
.contacts__star--on {
  color: var(--warning);
}
.contacts__row--anonymised td {
  color: var(--text-muted);
}
.contacts__sr {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
}
</style>
