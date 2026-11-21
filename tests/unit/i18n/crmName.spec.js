import { describe, it, expect } from "vitest";
import en from "@/i18n/locales/en.json";
import pl from "@/i18n/locales/pl.json";
import { panels } from "@/configs/access";

// U9: the CRM panel is called "CRM" wherever people read it, in both languages. The technical names stay —
// the `leads` panel id, the `/crm/...` addresses and the i18n keys — so old links keep working.
describe("CRM name", () => {
  it.each([
    ["en", en],
    ["pl", pl],
  ])("%s: the panel and its module are named CRM", (_, locale) => {
    expect(locale.panels.leads).toBe("CRM");
    expect(locale.access.modules.django_leads).toBe("CRM");
    expect(JSON.stringify(locale.leads)).not.toMatch(/\bLeads\b/);
  });

  it("the contact-form leads keep their own name", () => {
    expect(en.nav.cf_leads).toBe("Leads");
    expect(pl.nav.cf_leads).toBe("Leady");
  });

  it("the panel keeps its id and its /crm addresses", () => {
    const panel = panels.find((p) => p.idx === "leads");
    expect(panel.labelKey).toBe("panels.leads");
    expect(panel.root).toBe("/crm/today");
  });
});
