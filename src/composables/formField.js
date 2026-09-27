import { inject, ref, useId } from "vue";

// Contract between FormField and its control (plan 10; FormField provides it in plan 16, BasicSelect and the
// inputs consume it in plans 15/16). FormField provides FORM_FIELD = { id, describedBy, invalid, required, disabled },
// every value a ref: the control puts `id` on its native element (the label's `for`), `describedBy` into
// `aria-describedby`, and reflects `invalid` / `required` / `disabled`.
export const FORM_FIELD = Symbol("FormField");

// Call in setup(). Outside a FormField the control stands alone: its own id, nothing else set.
export function useFormFieldControl() {
  return (
    inject(FORM_FIELD, null) ?? {
      id: ref(useId()),
      describedBy: ref(""),
      invalid: ref(false),
      required: ref(false),
      disabled: ref(false),
    }
  );
}
