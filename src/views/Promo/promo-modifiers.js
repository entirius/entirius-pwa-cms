// Short, human-readable labels for discount-rule modifiers.
//
// The backend discount-meta `label` is the long Django enum description
// (e.g. "The role defining how many units of the gratis product should be...")
// — far too long for dropdowns and badges. Use these short labels in the UI;
// keep the long one only as a hover title where space allows.
export const MODIFIER_SHORT_LABELS = {
  None: "None",
  percent_discount: "Percent %",
  price_discount: "Amount off",
  step_qty_percent_discount: "Step qty %",
  step_qty_percent_discount_whole_cart: "Step qty % (cart)",
  step_qty_price_discount_whole_cart: "Step amount (cart)",
  step_qty_fixed_price_per_currency: "Fixed price/qty",
  step_price_percent_discount: "Step price %",
  cheapest_gratis: "Cheapest gratis",
  most_expensive_gratis: "Most exp. gratis",
  gratis_stepped: "Gratis stepped",
  gratis_by_sku_in_cart: "Gratis by SKU",
};

export function modifierShortLabel(value, fallback) {
  return MODIFIER_SHORT_LABELS[value] || fallback || value;
}
