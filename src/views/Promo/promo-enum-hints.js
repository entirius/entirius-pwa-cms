// i18n keys for per-option descriptions (Dropdown `el.description`) of voucher
// enum dropdowns. The backend meta gives terse labels; these add a muted second
// line explaining each choice. Keyed by the enum's `value` (matches
// django_checkout_voucher/models/enums.py). Shared across the voucher views.
export const VOUCHER_ENUM_DESC = {
  tax_type: { mpv: "promo.tax_mpv_desc", spv: "promo.tax_spv_desc" },
  validity_precision: {
    date: "promo.precision_date_desc",
    datetime: "promo.precision_datetime_desc",
  },
  expiry_starts_from: {
    purchase: "promo.expiry_purchase_desc",
    activation: "promo.expiry_activation_desc",
  },
  filter_mode: {
    inclusion: "promo.mode_inclusion_desc",
    exclusion: "promo.mode_exclusion_desc",
  },
  campaign_type: {
    sale: "promo.campaign_sale_desc",
    admin_issued: "promo.campaign_admin_desc",
  },
};

// Returns the i18n key for an option's description, or "" when none is defined.
export function enumDescKey(kind, value) {
  return VOUCHER_ENUM_DESC[kind]?.[value] || "";
}
