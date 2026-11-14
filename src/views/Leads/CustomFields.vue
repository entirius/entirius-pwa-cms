<template>
  <!-- The channel's custom fields of one entity: FormField + the boot of each kind (company, contact, deal forms) -->
  <div class="custom-fields form-grid">
    <FormField
      v-for="field in fields"
      :key="field.key"
      :label="field.label"
      :required="field.required"
      :error="errors[field.key] || ''"
      :disabled="disabled"
      :data-testid="`custom-field-${field.key}`"
    >
      <BasicSwitch v-if="field.kind === 'bool'" :model-value="Boolean(modelValue[field.key])" :disabled="disabled" @update:model-value="set(field, $event)" />
      <NumberInput
        v-else-if="field.kind === 'number'"
        :model-value="modelValue[field.key] ?? ''"
        :min="-1e12"
        :max="1e12"
        :step="0.01"
        :disabled="disabled"
        @update:model-value="set(field, $event)"
      />
      <BasicDatePicker v-else-if="field.kind === 'date'" :model-value="modelValue[field.key] || ''" :disabled="disabled" @update:model-value="set(field, $event)" />
      <BasicSelect
        v-else-if="field.kind === 'select' || field.kind === 'multiselect'"
        :model-value="valueOf(field)"
        :options="field.options"
        :multiple="field.kind === 'multiselect'"
        :clearable="!field.required"
        :disabled="disabled"
        @update:model-value="set(field, $event)"
      />
      <BasicInput
        v-else
        :model-value="modelValue[field.key] || ''"
        :format="field.kind === 'url' ? 'url' : undefined"
        :maxlength="2000"
        :disabled="disabled"
        @update:model-value="set(field, $event)"
      />
    </FormField>
  </div>
</template>

<script setup>
// Leads-local renderer (ux/new-components.md): definitions from `fieldsFromDefinitions`, values by key in `modelValue`.
const props = defineProps({
  fields: { type: Array, required: true },
  modelValue: { type: Object, required: true },
  errors: { type: Object, default: () => ({}) },
  disabled: { type: Boolean, default: false },
});
const emit = defineEmits(["update:modelValue"]);

const valueOf = (field) => props.modelValue[field.key] ?? (field.kind === "multiselect" ? [] : null);
const set = (field, value) => emit("update:modelValue", { ...props.modelValue, [field.key]: value });
</script>
