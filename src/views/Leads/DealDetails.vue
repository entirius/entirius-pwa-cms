<template>
  <BasicCard :title="$t('leads.company.details')" data-testid="deal-details">
    <template #actions>
      <ActionBar v-if="editing" :labelled="false">
        <BasicButton variant="secondary" :disabled="saving" data-testid="deal-details-cancel" @click="editing = false">
          {{ $t("leads.company.cancel") }}
        </BasicButton>
        <BasicButton variant="secondary" mutates :loading="saving" data-testid="deal-details-save" @click="save">{{ $t("leads.company.save") }}</BasicButton>
      </ActionBar>
      <!-- an archived deal is read-only until Restore -->
      <BasicButton v-else-if="!deal.archived_at" mutates size="sm" data-testid="deal-details-edit" @click="edit">{{ $t("leads.company.edit") }}</BasicButton>
    </template>
    <div v-if="editing" class="flex-column gap-5">
      <DealForm :form="form" :contacts="contacts" :currencies="currencies" :errors="errors">
        <FormField :label="$t('leads.deal.owner')" :error="errors.owner_id || ''">
          <BasicSelect v-model="form.ownerId" :options="owners" searchable clearable data-testid="deal-owner" />
        </FormField>
      </DealForm>
      <CustomFields v-model="form.attributes" :fields="fields" :errors="attrErrors" />
    </div>
    <dl v-else class="details m-0">
      <template v-for="row in rows" :key="row.key">
        <dt class="t-muted fs-200">{{ row.label }}</dt>
        <dd class="m-0" :class="{ 't-muted': row.muted }" :data-testid="row.testid">{{ row.value || "—" }}</dd>
      </template>
    </dl>
  </BasicCard>
</template>

<script setup>
import { computed, reactive, ref } from "vue";
import { t } from "@/i18n";
import { GET_AssignableUsers, PATCH_Deal } from "@/api/leads/api";
import { extractApiMessage, useFormErrors } from "@/composables/useFormErrors";
import { useNotifyStore } from "@/stores/notify";
import { formatDay } from "@/utils/format";
import CustomFields from "./CustomFields.vue";
import DealForm from "./DealForm.vue";
import { changedValues, formatValue, validateValues } from "./customFields";
import { currencyOptions, dealBody, dealForm, dealFormErrors, loadCurrencies, oneOffText, recurringValueText } from "./deals";

// Deal card → Details (modelled on CompanyDetails.vue): the values, dates, contact, owner and the deal's custom
// fields; Edit turns the card into a form (secondary actions: the page's primary stays Mark won). Save hands the answer up.
const props = defineProps({
  deal: { type: Object, required: true },
  contacts: { type: Array, default: () => [] },
  fields: { type: Array, default: () => [] },
});
const emit = defineEmits(["saved"]);
const notify = useNotifyStore();
const { handleApiError, getFieldError, clearErrors } = useFormErrors();
const API_FIELDS = ["title", "contact_id", "owner_id", "value_one_off", "value_recurring", "currency", "expected_close_date"];
const editing = ref(false);
const saving = ref(false);
const owners = ref([]);
const codes = ref([]);
const form = reactive({ ...dealForm(), ownerId: null, attributes: {} });
const localErrors = ref({});
const attrLocal = ref({});

const ownerName = (owner) => owner.name || owner.username;
const currencies = computed(() => currencyOptions(codes.value, props.deal.currency));
// A custom field nobody filled stays off the read view (Edit still lists it): "Licences — —" says nothing.
const filledFields = computed(() => props.fields.filter((field) => formatValue(field, props.deal.attributes?.[field.key])));
const rows = computed(() => [
  { key: "one_off", label: t("leads.deal.value_one_off"), value: oneOffText(props.deal), testid: "deal-value-one-off" },
  { key: "recurring", label: t("leads.deal.value_recurring"), value: recurringValueText(props.deal), testid: "deal-value-recurring" },
  { key: "close", label: t("leads.deal.expected_close"), value: formatDay(props.deal.expected_close_date), testid: "deal-expected-close" },
  { key: "contact", label: t("leads.deal.contact"), value: props.deal.contact?.name, testid: "deal-contact" },
  { key: "owner", label: t("leads.deal.owner"), value: props.deal.owner ? ownerName(props.deal.owner) : t("leads.company.unassigned"), muted: !props.deal.owner, testid: "deal-owner" },
  { key: "since", label: t("leads.deal.in_stage_since"), value: formatDay(props.deal.stage_entered_at) },
  ...filledFields.value.map((field) => ({ key: field.key, label: field.label, value: formatValue(field, props.deal.attributes?.[field.key]), testid: `custom-field-${field.key}` })),
]);
const errors = computed(() => ({
  ...Object.fromEntries(API_FIELDS.map((name) => [name, getFieldError(name)?.msg]).filter(([, msg]) => msg)),
  ...localErrors.value,
}));
const attrErrors = computed(() => ({
  ...Object.fromEntries(props.fields.map((field) => [field.key, getFieldError(`attributes.${field.key}`)?.msg]).filter(([, msg]) => msg)),
  ...attrLocal.value,
}));

// The current owner stays in the list even when the picker no longer offers them (a deactivated user).
async function loadOptions() {
  const own = props.deal.owner;
  const [users, money] = await Promise.all([GET_AssignableUsers().catch(() => []), loadCurrencies()]);
  const list = own && !users.some((user) => user.id === own.id) ? [own, ...users] : users;
  owners.value = list.map((user) => ({ value: user.id, label: ownerName(user) }));
  codes.value = money.codes;
}

function edit() {
  Object.assign(form, dealForm(props.deal), { ownerId: props.deal.owner?.id ?? null, attributes: { ...(props.deal.attributes || {}) } });
  localErrors.value = {};
  attrLocal.value = {};
  clearErrors();
  editing.value = true;
  loadOptions();
}

function body() {
  const changes = dealBody(form);
  const attributes = changedValues(props.fields, form.attributes, props.deal.attributes);
  if (Object.keys(attributes).length) changes.attributes = attributes;
  if (form.ownerId !== (props.deal.owner?.id ?? null)) changes.owner_id = form.ownerId;
  return changes;
}

function validate() {
  localErrors.value = dealFormErrors(form);
  attrLocal.value = validateValues(props.fields, form.attributes);
  return !Object.keys(localErrors.value).length && !Object.keys(attrLocal.value).length;
}

async function save() {
  if (!validate()) return;
  saving.value = true;
  clearErrors();
  try {
    const { data } = await PATCH_Deal(props.deal.id, body());
    notify.spawnNotification({ msg: t("leads.company.saved"), type: "positive" });
    editing.value = false;
    emit("saved", data);
  } catch (err) {
    handleApiError(err);
    if (!Object.keys(errors.value).length && !Object.keys(attrErrors.value).length) {
      notify.spawnNotification({ msg: extractApiMessage(err, t("leads.common.error")), type: "negative" });
    }
  } finally {
    saving.value = false;
  }
}
</script>

<style scoped>
.details {
  display: grid;
  grid-template-columns: max-content minmax(0, 1fr);
  gap: var(--space-3) var(--space-6);
  align-items: baseline;
  overflow-wrap: anywhere;
}
</style>
