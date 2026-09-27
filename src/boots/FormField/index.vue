<template>
  <div class="form-field" :class="[`form-field--${layout}`, { 'form-field--invalid': !!error }]">
    <div v-if="label || tooltip" class="form-field__head">
      <label
        v-if="label"
        :id="labelId"
        :for="controlId"
        class="form-field__label field-label"
        :class="{ required }"
        >{{ label }}</label
      >
      <BasicTooltip v-if="tooltip" variant="help" :text="tooltip" />
    </div>
    <div class="form-field__body">
      <slot />
      <p v-if="error" :id="errorId" class="form-field__error" role="alert">
        <span aria-hidden="true" class="form-field__error-icon">⚠</span>
        <span>{{ error }}</span>
      </p>
      <p v-else-if="description" :id="descriptionId" class="form-field__desc">{{ description }}</p>
    </div>
  </div>
</template>

<script setup>
// The only owner of a field's label, hint (`description`), required marker, error and help `tooltip`
// (docs/ui-components.md § P3 inputs). It provides FORM_FIELD (src/composables/formField.js) to the control inside:
// `id` for the label's `for`, `describedBy` (the hint or error shown), `invalid`, `required`, `disabled`; plus
// `labelId` for a control a `for` cannot name (a radio group, a segmented control). `layout="inline"`: label left,
// control right from 1024 px, stacked below.
import { computed, provide, useId } from "vue";
import { FORM_FIELD } from "@/composables/formField";
import BasicTooltip from "@/boots/BasicTooltip/index.vue";

const props = defineProps({
  label: { type: String, default: "" },
  description: { type: String, default: "" },
  tooltip: { type: String, default: "" },
  required: { type: Boolean, default: false },
  error: { type: String, default: "" },
  disabled: { type: Boolean, default: false },
  // The control's id when a caller needs a fixed one (a test id, an e2e selector); generated otherwise.
  id: { type: String, default: "" },
  layout: { type: String, default: "stacked", validator: (value) => ["stacked", "inline"].includes(value) },
});

const generatedId = useId();
const controlId = computed(() => props.id || `${generatedId}-control`);
const labelId = `${generatedId}-label`;
const errorId = `${generatedId}-error`;
const descriptionId = `${generatedId}-description`;

provide(FORM_FIELD, {
  id: controlId,
  describedBy: computed(() => (props.error ? errorId : props.description ? descriptionId : "")),
  invalid: computed(() => !!props.error),
  required: computed(() => props.required),
  disabled: computed(() => props.disabled),
  labelId: computed(() => (props.label ? labelId : "")),
});
</script>

<style lang="scss" scoped>
@import "@/assets/scss/utils/media-query";

.form-field,
.form-field__body {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.form-field__head {
  display: inline-flex;
  align-items: center;
  gap: 2px;
}

// Figma "Język treści": label and control on one row on desktop, the label vertically centred on the control.
@media only screen and (min-width: $bp-desktop) {
  .form-field--inline {
    flex-direction: row;
    align-items: flex-start;
    gap: var(--space-3);

    .form-field__head {
      flex-shrink: 0;
      min-height: var(--elem-height);
    }

    .form-field__body {
      flex: 1;
      min-width: 0;
    }
  }
}

.form-field__desc {
  font-size: var(--fs-200);
  color: var(--text-muted);
  margin: 0;
}

.form-field__error {
  font-size: var(--fs-200);
  color: var(--negative);
  margin: 0;
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
}

.form-field__error-icon {
  font-size: 0.9em;
  line-height: 1;
}

// Transition (plan 19 deletes it with Dropdown and TextAreaBasic): a control that does not read the contract yet
// carries no aria-invalid, so the field still paints its border. Contract controls paint their own.
.form-field--invalid :deep(:is(input, textarea, .dropdown__trigger):not([aria-invalid])) {
  border-color: var(--negative);
}
</style>
