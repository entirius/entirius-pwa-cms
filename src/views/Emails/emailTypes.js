// The translated name of an e-mail template type; an unknown type shows its slug.
export function emailTypeLabel(t, type) {
  const key = `emails.types.${type}`;
  const label = t(key);
  return label === key ? type : label;
}

// The types with a preview endpoint and the sample variants each one renders (`value` goes to the API, `label` is an
// i18n key under emails.preview.variants); a type missing here has no preview.
const variant = (value, label = value) => ({ value, label: `emails.preview.variants.${label}` });
export const PREVIEW_VARIANTS = {
  "checkout-order-confirmation": [variant("transfer"), variant("cod"), variant("paid", "paid_online"), variant("split")],
  "checkout-order-canceled": [variant("unpaid"), variant("paid")],
};
