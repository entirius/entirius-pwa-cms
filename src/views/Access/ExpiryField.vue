<template>
  <FormField :label="$t('access.tokens.expires')" :required="required" :error="error">
    <BasicRadioGroup v-model="mode" :options="modeOptions" data-testid="expiry-mode" />
  </FormField>
  <FormField v-if="mode === DATE" :label="$t('access.tokens.expiry_date')" :required="required">
    <BasicDatePicker
      :model-value="modelValue"
      :config="pickerConfig"
      data-testid="expiry-date"
      @update:model-value="(date) => $emit('update:modelValue', date)"
    />
  </FormField>
</template>

<script setup>
// A token's expiry in the token dialogs: "No expiry" or a date (the start of that local day). `required` (a secret
// token) disables "No expiry"; `capped` limits the date to 365 days ahead (D21); past days are never offered. The
// model is the date string ("" = no expiry); picking "On a date" proposes the latest allowed day.
import { computed, ref, watch } from "vue";
import { t } from "@/i18n";
import { maxExpiryDate, minExpiryDate } from "./tokens";

const NONE = "none";
const DATE = "date";

const props = defineProps({
  modelValue: { type: String, default: "" },
  required: { type: Boolean, default: false },
  capped: { type: Boolean, default: false },
  error: { type: String, default: "" },
});
const emit = defineEmits(["update:modelValue"]);

const mode = ref(props.modelValue || props.required ? DATE : NONE);
const modeOptions = computed(() => [
  { label: t("access.tokens.no_expiry"), value: NONE, disabled: props.required, testid: "expiry-none" },
  { label: t("access.tokens.on_date"), value: DATE, testid: "expiry-on-date" },
]);
const pickerConfig = computed(() => ({
  mode: "single",
  wrap: true,
  inline: true,
  minDate: minExpiryDate(),
  ...(props.capped ? { maxDate: maxExpiryDate() } : {}),
}));

function proposeDate() {
  if (!props.modelValue) emit("update:modelValue", maxExpiryDate());
}

watch(mode, (next) => (next === DATE ? proposeDate() : emit("update:modelValue", "")));
// A selection that turns secret leaves "No expiry" for a date.
watch(
  () => props.required,
  (required) => {
    if (!required) return;
    mode.value = DATE;
    proposeDate();
  }
);
if (mode.value === DATE) proposeDate();
</script>
