import { describe, it, expect } from "vitest";
import en from "@/i18n/locales/en.json";
import pl from "@/i18n/locales/pl.json";
import { PREVIEW_VARIANTS } from "@/views/Emails/emailTypes";

// Order e-mail plan 03: every string of the order templates, their preview and the order page's e-mail section
// exists in both locales, and the Polish one is translated (it differs from the English one where a word differs).

const TYPES = Object.keys(PREVIEW_VARIANTS);
const FIELDS = ["preheader", "heading", "intro", "split_note", "transfer_heading", "transfer_note", "cod_note", "paid_note", "refund_note"];
const HINTS = [...FIELDS, "order_number", "help_order"];
const ORDER_KEYS = ["col_sku", "col_qty", "col_status", "col_unit_price", "col_total", "col_tax", "pickup_point"];

const resolve = (locale, key) => key.split(".").reduce((node, part) => node?.[part], locale);
const leaves = (node, prefix) =>
  Object.entries(node ?? {}).flatMap(([key, value]) =>
    typeof value === "object" ? leaves(value, `${prefix}.${key}`) : [`${prefix}.${key}`]
  );
const missingIn = (locale, keys) => keys.filter((key) => !String(resolve(locale, key) ?? "").trim());

const KEYS = [
  ...TYPES.flatMap((type) => [`emails.types.${type}`, `emails.type_desc.${type}`]),
  ...FIELDS.map((field) => `emails.fields.${field}`),
  ...HINTS.map((hint) => `emails.field_hints.${hint}`),
  ...Object.values(PREVIEW_VARIANTS).flat().map(({ label }) => label),
  ...leaves(en.emails.preview, "emails.preview"),
  ...ORDER_KEYS.map((key) => `checkout_orders.${key}`),
  ...leaves(en.checkout_orders.mails, "checkout_orders.mails"),
];

describe("order e-mail i18n keys", () => {
  it("every key exists in EN and PL", () => {
    expect(missingIn(en, KEYS)).toEqual([]);
    expect(missingIn(pl, KEYS)).toEqual([]);
  });

  it("the Polish preview and e-mail section are translated", () => {
    const same = [...leaves(en.emails.preview, "emails.preview"), ...leaves(en.checkout_orders.mails, "checkout_orders.mails")]
      .filter((key) => resolve(en, key) === resolve(pl, key) && key !== "checkout_orders.mails.status");
    expect(same).toEqual([]);
  });

  it("placeholders survive the translation", () => {
    const params = (text) => [...text.matchAll(/\{(\w+)\}/g)].map((match) => match[1]).sort();
    for (const key of KEYS) expect(params(resolve(pl, key)), key).toEqual(params(resolve(en, key)));
  });
});
