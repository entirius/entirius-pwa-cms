<template>
  <BasicCard :title="$t('leads.company.details')" data-testid="company-details">
    <template #actions>
      <ActionBar v-if="editing" :labelled="false">
        <BasicButton variant="secondary" :disabled="saving" data-testid="company-details-cancel" @click="editing = false">
          {{ $t("leads.company.cancel") }}
        </BasicButton>
        <BasicButton variant="secondary" mutates :loading="saving" data-testid="company-details-save" @click="save">{{ $t("leads.company.save") }}</BasicButton>
      </ActionBar>
      <BasicButton v-else mutates size="sm" data-testid="company-details-edit" @click="edit">{{ $t("leads.company.edit") }}</BasicButton>
    </template>
    <div v-if="editing" class="flex-column gap-5">
      <div class="form-grid">
        <FormField :label="$t('leads.company.owner')" :error="errorOf('owner_id')">
          <BasicSelect v-model="form.ownerId" :options="owners" searchable clearable data-testid="company-owner" />
        </FormField>
        <FormField :label="$t('leads.company.origin')" :error="errorOf('origin')">
          <BasicInput v-model="form.origin" :maxlength="64" data-testid="company-origin" />
        </FormField>
      </div>
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
import { GET_AssignableUsers, PATCH_Company } from "@/api/leads/api";
import { extractApiMessage, useFormErrors } from "@/composables/useFormErrors";
import { useNotifyStore } from "@/stores/notify";
import CustomFields from "./CustomFields.vue";
import { changedValues, formatValue, validateValues } from "./customFields";

// Overview → Details: owner, origin and the company's custom fields; Edit turns the card into a form (its actions are
// secondary: the page's one primary stays Write mail). Save sends only what changed and hands the answer up.
const props = defineProps({
  company: { type: Object, required: true },
  fields: { type: Array, default: () => [] },
});
const emit = defineEmits(["saved"]);
const notify = useNotifyStore();
const { handleApiError, getFieldError, clearErrors } = useFormErrors();
const editing = ref(false);
const saving = ref(false);
const owners = ref([]);
const form = reactive({ ownerId: null, origin: "", attributes: {} });
const localErrors = ref({});

const ownerName = (owner) => owner.name || owner.username;
const rows = computed(() => [
  {
    key: "owner",
    label: t("leads.company.owner"),
    value: props.company.owner ? ownerName(props.company.owner) : t("leads.company.unassigned"),
    muted: !props.company.owner,
    testid: "company-owner",
  },
  { key: "origin", label: t("leads.company.origin"), value: props.company.origin, testid: "company-origin" },
  ...props.fields.map((field) => ({
    key: field.key,
    label: field.label,
    value: formatValue(field, props.company.attributes?.[field.key]),
    testid: `custom-field-${field.key}`,
  })),
]);
const errorOf = (name) => getFieldError(name)?.msg || "";
const attrErrors = computed(() => ({
  ...Object.fromEntries(props.fields.map((field) => [field.key, errorOf(`attributes.${field.key}`)]).filter(([, error]) => error)),
  ...localErrors.value,
}));

// The current owner stays in the list even when the picker no longer offers them (a deactivated user).
async function loadOwners() {
  const own = props.company.owner;
  try {
    const users = await GET_AssignableUsers();
    const list = own && !users.some((user) => user.id === own.id) ? [own, ...users] : users;
    owners.value = list.map((user) => ({ value: user.id, label: ownerName(user) }));
  } catch {
    owners.value = own ? [{ value: own.id, label: ownerName(own) }] : [];
  }
}

function edit() {
  Object.assign(form, {
    ownerId: props.company.owner?.id ?? null,
    origin: props.company.origin || "",
    attributes: { ...(props.company.attributes || {}) },
  });
  localErrors.value = {};
  clearErrors();
  editing.value = true;
  loadOwners();
}

function body() {
  const changes = { attributes: changedValues(props.fields, form.attributes, props.company.attributes) };
  if (form.ownerId !== (props.company.owner?.id ?? null)) changes.owner_id = form.ownerId;
  if (form.origin !== (props.company.origin || "")) changes.origin = form.origin.trim();
  if (!Object.keys(changes.attributes).length) delete changes.attributes;
  return changes;
}

async function save() {
  localErrors.value = validateValues(props.fields, form.attributes);
  if (Object.keys(localErrors.value).length) return;
  saving.value = true;
  clearErrors();
  try {
    const { data } = await PATCH_Company(props.company.id, body());
    notify.spawnNotification({ msg: t("leads.company.saved"), type: "positive" });
    editing.value = false;
    emit("saved", data);
  } catch (err) {
    handleApiError(err);
    if (!errorOf("owner_id") && !errorOf("origin") && !Object.keys(attrErrors.value).length) {
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
