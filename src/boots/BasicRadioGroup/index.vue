<template>
  <div
    :id="attrs.id"
    role="radiogroup"
    class="radio-group flex-column gap-2"
    :aria-labelledby="field.labelId?.value || undefined"
    :aria-describedby="attrs['aria-describedby']"
    :aria-invalid="attrs['aria-invalid']"
    :aria-required="attrs.required ? 'true' : undefined"
    :aria-disabled="controlDisabled ? 'true' : undefined"
  >
    <label
      v-for="option in options"
      :key="option.value"
      class="radio-group__option inline-flex ai-ct gap-2"
      :class="{ 'radio-group__option--disabled': controlDisabled || option.disabled }"
    >
      <input
        type="radio"
        class="radio-group__input"
        :name="groupName"
        :value="option.value"
        :checked="modelValue === option.value"
        :disabled="controlDisabled || option.disabled"
        :aria-invalid="attrs['aria-invalid']"
        @change="emit('update:modelValue', option.value)"
      />
      <span>{{ option.label }}</span>
    </label>
  </div>
</template>

<script setup>
// Single choice (docs/ui-components.md § P3 inputs): `options` [{ label, value, disabled? }], `v-model`, `name`,
// `disabled`. Native radios sharing one `name`: Tab enters the group on the checked option, the arrow keys move and
// select inside it (role="radiogroup"). Inside a FormField the group is named by the field's label and takes
// aria-describedby, aria-invalid, required and disabled from the contract.
import { computed, useId } from "vue";
import { useControlAttrs } from "@/boots/FormField/useControlAttrs";

const props = defineProps({
  options: { type: Array, required: true },
  modelValue: { type: [String, Number, Boolean], default: null },
  name: { type: String, default: "" },
  disabled: { type: Boolean, default: false },
});
const emit = defineEmits(["update:modelValue"]);

const { field, attrs, disabled: controlDisabled } = useControlAttrs({ disabled: () => props.disabled });
const generatedName = useId();
const groupName = computed(() => props.name || generatedName);
</script>

<style lang="scss" scoped>
.radio-group__option {
  cursor: pointer;
  color: var(--text-body);

  &--disabled {
    cursor: not-allowed;
    color: var(--text-muted);
  }
}

.radio-group__input {
  appearance: none;
  flex-shrink: 0;
  width: 20px;
  height: 20px;
  margin: 0;
  border: 1px solid var(--border-control);
  border-radius: var(--radius-full);
  background-color: var(--surface-sunken);
  cursor: inherit;
  transition: border-color 0.15s;

  &:hover:not(:disabled) {
    border-color: var(--border-strong);
  }

  // The dot: a radial fill, since an input draws no pseudo-element everywhere.
  &:checked {
    border-color: var(--accent);
    background: radial-gradient(circle, var(--accent) 0 5px, var(--surface-sunken) 5.5px);
  }

  &[aria-invalid="true"] {
    border-color: var(--negative);
  }

  &:disabled {
    border-color: var(--border-subtle);
    background-color: var(--surface-disabled);
  }

  &:disabled:checked {
    background: radial-gradient(circle, var(--text-muted) 0 5px, var(--surface-disabled) 5.5px);
  }
}
</style>
