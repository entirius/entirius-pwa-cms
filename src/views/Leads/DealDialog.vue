<template>
  <!-- Open a deal (ux/screens/deal-card.md § Open a deal): owner and stage are not asked, both change on the card -->
  <BasicModal :open="open" :title="$t('leads.deal.open_title')" size="md" :persistent="saving" :actions="actions" data-testid="deal-dialog" @update:open="close">
    <div class="flex-column gap-4">
      <FormField v-if="!company" :label="$t('leads.deal.company')" required :error="errors.company_id || ''">
        <EntitySearchPicker
          v-model="picked.id"
          v-model:display-value="picked.name"
          :fetch-fn="findCompanies"
          :placeholder="$t('leads.task.company_search')"
          data-testid="deal-dialog-company"
          @update:model-value="pickCompany"
        />
      </FormField>
      <DealForm :form="form" :contacts="contacts" :currencies="currencies" :errors="errors" title-testid="deal-dialog-title" />
    </div>
  </BasicModal>
</template>

<script setup>
import { computed, nextTick, reactive, ref, watch } from "vue";
import { useRouter } from "vue-router";
import { t } from "@/i18n";
import { GET_Companies, GET_Company, POST_Deal } from "@/api/leads/api";
import { extractApiMessage, useFormErrors } from "@/composables/useFormErrors";
import { useNotifyStore } from "@/stores/notify";
import DealForm from "./DealForm.vue";
import { contactOptions, currencyOptions, dealBody, dealForm, dealFormErrors, loadCurrencies } from "./deals";

// `company` ({ id, name, contacts }) = the company card's; without it (the deal list) a company picker shows.
// Success opens the new deal's card.
const props = defineProps({
  open: { type: Boolean, default: false },
  company: { type: Object, default: null },
});
const emit = defineEmits(["update:open"]);
const router = useRouter();
const notify = useNotifyStore();
const { handleApiError, getFieldError, clearErrors } = useFormErrors();
const FIELDS = ["company_id", "title", "contact_id", "value_one_off", "value_recurring", "currency", "expected_close_date"];
const form = reactive(dealForm());
const picked = reactive({ id: null, name: "", contacts: [] });
const localErrors = ref({});
const saving = ref(false);
const currencyContext = ref({ codes: [], fallback: null });

const subject = computed(() => props.company || (picked.id ? { id: Number(picked.id), contacts: picked.contacts } : null));
const contacts = computed(() => contactOptions(subject.value?.contacts));
const currencies = computed(() => currencyOptions(currencyContext.value.codes, currencyContext.value.fallback));
const errors = computed(() => ({
  ...Object.fromEntries(FIELDS.map((name) => [name, getFieldError(name)?.msg]).filter(([, msg]) => msg)),
  ...localErrors.value,
}));
const actions = computed(() => [
  { key: "cancel", label: t("common.cancel"), role: "secondary", disabled: saving.value, onClick: () => close(false) },
  { key: "submit", label: t("leads.deals.open_deal"), role: "primary", mutates: true, loading: saving.value, testid: "deal-dialog-submit", onClick: submit },
]);

async function reset() {
  Object.assign(form, dealForm({ title: props.company?.name || "" }));
  Object.assign(picked, { id: null, name: "", contacts: [] });
  form.contactId = contacts.value[0]?.value ?? null;
  localErrors.value = {};
  clearErrors();
  currencyContext.value = await loadCurrencies();
  form.currency ??= currencyContext.value.fallback;
}

watch(() => props.open, (open) => open && reset());

const findCompanies = async (search) =>
  (await GET_Companies({ search, page: 1 })).data.results.map((row) => ({ value: String(row.id), label: row.name || row.domain, secondary: row.domain }));

// The picker sends the id before its label: the title is pre-filled after both arrived.
async function pickCompany(id) {
  picked.contacts = [];
  if (!id) return;
  await nextTick();
  if (!form.title) form.title = picked.name;
  picked.contacts = (await GET_Company(id)).data.contacts || [];
  form.contactId = contacts.value[0]?.value ?? null;
}

function close(value = false) {
  if (!value && !saving.value) emit("update:open", false);
}

function validate() {
  localErrors.value = dealFormErrors(form, currencyContext.value.fallback);
  if (!subject.value) localErrors.value.company_id = t("leads.deal.company_required");
  return !Object.keys(localErrors.value).length;
}

async function submit() {
  if (!validate()) return;
  saving.value = true;
  clearErrors();
  try {
    const { data } = await POST_Deal({ ...dealBody(form), company_id: subject.value.id, ...(form.currency ? {} : { currency: undefined }) });
    emit("update:open", false);
    router.push({ name: "LeadsDeal", params: { id: data.id } });
  } catch (err) {
    handleApiError(err);
    if (!Object.keys(errors.value).length) {
      notify.spawnNotification({ msg: extractApiMessage(err, t("leads.common.error")), type: "negative" });
      emit("update:open", false);
    }
  } finally {
    saving.value = false;
  }
}
</script>
