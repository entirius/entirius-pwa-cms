import { describe, it, expect } from "vitest";
import en from "@/i18n/locales/en.json";
import pl from "@/i18n/locales/pl.json";

// Access plan 23: every access string exists in both locales — the panel, its nav, the read-only notice, the non-staff
// wall, SecretReveal — plus one label per catalogue area and token scope (`access.areas.<key>`, `access.scopes.<key>`).
// The lists below are the django-access catalogue (49 areas, 9 scopes); a new area or scope needs a line here and a
// label in both files.

const AREAS = [
  "pim.products", "pim.categories", "pim.schema", "pim.quality", "pim.product_delete", "pim_translator.translate",
  "pricemanager.prices", "pricemanager.settings", "pricefighter.decisions", "pricefighter.rules", "qms.stock",
  "suppliers.sources", "suppliers.products", "suppliers.credentials", "atlas.sources", "atlas.products",
  "atlas.credentials", "enrichment.rules", "enrichment.proposals", "lookup.search", "content.pages", "content.publish",
  "content.media", "content.schema", "contentdb_translator.translate", "faq.faq", "deliverypoints.points",
  "email.templates", "agreements.definitions", "agreements.consents", "accounts.customers", "checkout.orders",
  "checkout.discounts", "returns.attachments", "contact_forms.submissions", "contact_forms.leads",
  "contact_forms.settings", "leads.companies", "leads.settings", "leads.gdpr", "communicator.review",
  "communicator.content", "communicator.conversations", "communicator.settings", "siteintel.audits",
  "notifications.inbox", "munin.config", "access.manage", "platform.devtools",
];

const SCOPES = [
  "checkout.storefront", "checkout.erase", "accounts.erase", "contact_forms.submit", "contact_forms.booking",
  "returns.api", "reviews.moderate", "vault.api", "agreements.subscribe",
];

// The namespaces the access work owns; `panels` is shared, so only its two access keys count.
const NAMESPACES = ["access", "nav.access", "secret_reveal"];
const PANEL_KEYS = ["panels.access", "panels.access_desc"];

const resolve = (locale, key) => key.split(".").reduce((node, part) => node?.[part], locale);
const leaves = (node, prefix) =>
  Object.entries(node ?? {}).flatMap(([key, value]) =>
    typeof value === "object" ? leaves(value, `${prefix}.${key}`) : [`${prefix}.${key}`]
  );
const missingIn = (locale, keys) => keys.filter((key) => !String(resolve(locale, key) ?? "").trim());

describe("access i18n keys", () => {
  it.each(NAMESPACES)("%s has the same keys in EN and PL", (namespace) => {
    const enKeys = leaves(resolve(en, namespace), namespace);
    expect(enKeys.length).toBeGreaterThan(0);
    expect(missingIn(pl, enKeys)).toEqual([]);
    expect(missingIn(en, leaves(resolve(pl, namespace), namespace))).toEqual([]);
  });

  it("names the Access panel in both locales", () => {
    expect(missingIn(en, PANEL_KEYS)).toEqual([]);
    expect(missingIn(pl, PANEL_KEYS)).toEqual([]);
  });

  it("labels all 49 catalogue areas in both locales", () => {
    const keys = AREAS.map((area) => `access.areas.${area}`);
    expect(new Set(AREAS).size).toBe(49);
    expect(missingIn(en, keys)).toEqual([]);
    expect(missingIn(pl, keys)).toEqual([]);
  });

  it("labels all 9 token scopes in both locales", () => {
    const keys = SCOPES.map((scope) => `access.scopes.${scope}`);
    expect(missingIn(en, keys)).toEqual([]);
    expect(missingIn(pl, keys)).toEqual([]);
  });

  it("keeps no area or scope label the catalogue does not have", () => {
    expect(leaves(en.access.areas, "areas").map((key) => key.slice(6)).sort()).toEqual([...AREAS].sort());
    expect(leaves(en.access.scopes, "scopes").map((key) => key.slice(7)).sort()).toEqual([...SCOPES].sort());
  });
});
