<template>
  <!-- One condition (field · op · value [· points] [· label]): a wrapping row of labelled fields, Scoring and Rules -->
  <div class="condition-row flex ai-fe flex-wrap gap-4" data-testid="condition-row">
    <FormField class="condition-row__field" :label="$t('leads.condition.field')" :error="error">
      <BasicSelect :model-value="modelValue.field" :options="fieldOptions" searchable :disabled="disabled" data-testid="condition-field" @update:model-value="setField" />
    </FormField>
    <StatusBadge v-if="modelValue.field && !field" tone="warning" :label="$t('leads.condition.inactive_field')" />
    <FormField :label="$t('leads.condition.is')">
      <BasicSelect :model-value="modelValue.op" :options="opOptions" :disabled="disabled" data-testid="condition-op" @update:model-value="set({ op: $event, value: null })" />
    </FormField>
    <FormField v-if="modelValue.op !== 'empty'" class="condition-row__value" :label="$t('leads.condition.value')">
      <BasicSelect
        v-if="field?.options?.length"
        :model-value="modelValue.value"
        :options="field.options"
        :multiple="modelValue.op === 'in'"
        :disabled="disabled"
        data-testid="condition-value"
        @update:model-value="set({ value: $event })"
      />
      <BasicSwitch v-else-if="kind === 'bool'" :model-value="Boolean(modelValue.value)" :disabled="disabled" data-testid="condition-value" @update:model-value="set({ value: $event })" />
      <NumberInput v-else-if="kind === 'number'" :model-value="modelValue.value ?? ''" :min="-1e12" :max="1e12" :step="0.01" :disabled="disabled" data-testid="condition-value" @update:model-value="set({ value: Number($event) })" />
      <BasicDatePicker v-else-if="kind === 'date'" :model-value="modelValue.value || ''" :disabled="disabled" data-testid="condition-value" @update:model-value="set({ value: $event })" />
      <BasicInput v-else :model-value="textValue" :maxlength="255" :disabled="disabled" data-testid="condition-value" @update:model-value="setText" />
    </FormField>
    <FormField v-if="withPoints" class="condition-row__points" :label="$t('leads.condition.points')">
      <NumberInput :model-value="modelValue.points ?? 0" :min="-1000" :max="1000" :disabled="disabled" data-testid="condition-points" @update:model-value="set({ points: Number($event) })" />
    </FormField>
    <FormField v-if="withLabel" :label="$t('leads.condition.label')">
      <BasicInput :model-value="modelValue.label || ''" :maxlength="128" :disabled="disabled" data-testid="condition-label" @update:model-value="set({ label: $event })" />
    </FormField>
    <IconButton v-if="!disabled" icon="delete" variant="danger" :label="$t('leads.condition.remove')" data-testid="condition-remove" @click="emit('remove')" />
  </div>
</template>

<script setup>
import { computed } from "vue";
import { t } from "@/i18n";

// Leads-local (ux/new-components.md): the value control follows the field's kind (`GET fields/`); "is empty" hides
// it; "one of" takes a list (a multiple select, or comma-separated text). A field no longer offered keeps its key
// with a warning.
const OPS = {
  number: ["eq", "ne", "gte", "lte", "empty"],
  date: ["eq", "ne", "gte", "lte", "empty"],
  bool: ["eq", "empty"],
  select: ["eq", "ne", "in", "empty"],
  multiselect: ["contains", "empty"],
  text: ["eq", "ne", "in", "contains", "empty"],
};
const props = defineProps({
  modelValue: { type: Object, required: true },
  fields: { type: Array, required: true },
  withPoints: { type: Boolean, default: false },
  withLabel: { type: Boolean, default: false },
  disabled: { type: Boolean, default: false },
  error: { type: String, default: "" },
});
const emit = defineEmits(["update:modelValue", "remove"]);

const field = computed(() => props.fields.find((item) => item.name === props.modelValue.field));
const kind = computed(() => field.value?.kind || "text");
const fieldOptions = computed(() => {
  const options = props.fields.map((item) => ({ value: item.name, label: item.label || item.name }));
  const raw = props.modelValue.field;
  return raw && !field.value ? [...options, { value: raw, label: raw }] : options;
});
const opOptions = computed(() => (OPS[kind.value] || OPS.text).map((value) => ({ value, label: t(`leads.condition.op.${value}`) })));
const textValue = computed(() => [].concat(props.modelValue.value ?? []).join(", "));

const set = (patch) => emit("update:modelValue", { ...props.modelValue, ...patch });
const setField = (name) => set({ field: name, op: (OPS[props.fields.find((item) => item.name === name)?.kind] || OPS.text)[0], value: null });
const setText = (text) => set({ value: props.modelValue.op === "in" ? text.split(",").map((part) => part.trim()).filter(Boolean) : text });
</script>

<style scoped>
.condition-row__field,
.condition-row__value {
  flex: 1 1 12rem;
  min-width: 0;
}
.condition-row__points {
  width: 8rem;
}
</style>
