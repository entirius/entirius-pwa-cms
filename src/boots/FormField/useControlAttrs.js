import { computed } from "vue";
import { useFormFieldControl } from "@/composables/formField";

// The native attributes a control reads from the FORM_FIELD contract (or sets alone, outside a FormField): `id`,
// `aria-describedby`, `aria-invalid`, `required`, `disabled`. `own` holds getters of the control's own props that win
// over the field: `id()`, `disabled()`, `invalid()`. Call in setup().
export function useControlAttrs(own = {}) {
  const field = useFormFieldControl();
  const disabled = computed(() => Boolean(own.disabled?.() || field.disabled.value));
  const invalid = computed(() => Boolean(own.invalid?.() || field.invalid.value));
  const attrs = computed(() => ({
    id: own.id?.() || field.id.value,
    "aria-describedby": field.describedBy.value || undefined,
    "aria-invalid": invalid.value ? "true" : undefined,
    required: field.required.value || undefined,
    disabled: disabled.value,
  }));
  return { field, disabled, invalid, attrs };
}
