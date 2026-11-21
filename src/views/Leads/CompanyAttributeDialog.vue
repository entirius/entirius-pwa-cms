<template>
  <BasicModal
    :open="Boolean(field)"
    :title="$t('leads.companies.attribute_title', { name: field?.label })"
    size="sm"
    :actions="actions"
    data-testid="company-attribute-modal"
    @update:open="$emit('close')"
  >
    <CustomFields v-if="field" v-model="values" :fields="[{ ...field, required: false }]" :errors="errors" />
  </BasicModal>
</template>

<script setup>
import { computed, reactive, ref, watch } from "vue";
import { t } from "@/i18n";
import CustomFields from "./CustomFields.vue";
import { apiValue } from "./customFields";

// Bulk "Set attribute" (CompanyList): the value of the chosen attribute, in the input of its kind (the one the company
// card uses). `field` set = open; Apply emits `apply` with the value, "Clear value" emits `apply` with null; the
// list makes the call and closes the dialog by resetting `field`.
const props = defineProps({ field: { type: Object, default: null } });
const emit = defineEmits(["close", "apply"]);

const values = ref({});
const errors = reactive({});
const actions = computed(() => [
  { key: "cancel", role: "secondary", label: t("common.cancel"), onClick: () => emit("close") },
  { key: "clear", role: "secondary", label: t("leads.companies.attribute_clear"), mutates: true, testid: "company-attribute-clear", onClick: () => emit("apply", null) },
  { key: "apply", role: "primary", label: t("leads.companies.attribute_apply"), mutates: true, testid: "company-attribute-apply", onClick: apply },
]);

watch(
  () => props.field,
  () => {
    values.value = {};
    errors[props.field?.key] = "";
  }
);

function apply() {
  const value = apiValue(props.field, values.value[props.field.key]);
  const empty = value === null && props.field.kind !== "bool";
  errors[props.field.key] = empty ? t("leads.fields.required_error") : "";
  if (!empty) emit("apply", value ?? false);
}
</script>
