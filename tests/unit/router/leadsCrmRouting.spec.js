import { describe, it, expect, vi, beforeEach } from "vitest";
import en from "@/i18n/locales/en.json";
import pl from "@/i18n/locales/pl.json";

const mockIsModuleAtLeast = vi.fn();
vi.mock("@/stores/access", () => ({
  useAccessStore: () => ({ can: () => true, canAny: () => true, ensureLoaded: () => Promise.resolve(), available: false, isStaff: true }),
}));
vi.mock("@/stores/munin", () => ({
  useMuninStore: () => ({ loaded: true, isPanelEnabled: () => true, isModuleEnabled: () => true, isModuleAtLeast: mockIsModuleAtLeast, ensureLoaded: vi.fn() }),
}));
vi.mock("@/stores/user", () => ({ useUserStore: () => ({ isAuth: true }) }));

import router from "@/router";
import { panels } from "@/configs/access";
import { AREAS } from "@/configs/areas";
import { LEADS_SETTINGS_SECTIONS } from "@/components/Navigation/nav-routes";
import { companyIdFromSubjectRef, companySubjectRef, contactIdFromRef, contactSubjectRef, routeForSubjectRef } from "@/utils/subjectRef";

// Plan 15 (Leads CRM screens): routes, the todo.tasks area, the settings sections, the subject refs.
describe("Leads CRM routing and access", () => {
  beforeEach(() => mockIsModuleAtLeast.mockReturnValue(true));

  it("Today is the panel root; its blocks gate themselves (no area, no module)", async () => {
    const leads = panels.find((p) => p.idx === "leads");
    expect(leads.root).toBe("/leads/today");
    expect(leads.areas).toContain(AREAS.TODO_TASKS);
    await router.push("/leads");
    expect(router.currentRoute.value.name).toBe("LeadsToday");
    expect(router.resolve("/leads/today").meta).toMatchObject({ page: true, panel: "leads" });
    expect(router.resolve("/leads/today").meta.area).toBeUndefined();
  });

  it("Companies is a full-width page; Reports a desk page on leads 0.5.0", () => {
    expect(router.resolve("/leads/companies").meta).toMatchObject({ page: true, area: AREAS.LEADS_COMPANIES });
    expect(router.resolve("/leads/reports").meta).toMatchObject({ desktop: true, moduleVersion: "0.5.0", area: AREAS.LEADS_COMPANIES });
    expect(router.resolve("/leads/companies/5").meta.crumbParent).toBe("LeadsCompanies");
  });

  it("Custom fields, Scoring and Rules are sections of Settings on leads 0.5.0", async () => {
    ["custom-fields", "scoring", "rules"].forEach((key) => {
      const section = LEADS_SETTINGS_SECTIONS.find((s) => s.key === key);
      expect(section).toMatchObject({ module: "leads", minVersion: "0.5.0" });
      expect(router.resolve({ name: section.route }).meta).toMatchObject({ area: AREAS.LEADS_SETTINGS, moduleVersion: "0.5.0" });
    });
    mockIsModuleAtLeast.mockReturnValue(false);
    await router.push("/leads/settings/scoring");
    expect(router.currentRoute.value.path).toBe("/leads/today");
  });

  it("the todo.tasks area is named in both languages", () => {
    expect(en.access.areas.todo.tasks).toBeTruthy();
    expect(pl.access.areas.todo.tasks).toBeTruthy();
  });

  it("subject refs: a company task opens its card; contact refs both ways", () => {
    expect(routeForSubjectRef(companySubjectRef(5))).toEqual({ name: "LeadsThread", params: { id: 5 }, query: { tab: "timeline" } });
    expect(companyIdFromSubjectRef(companySubjectRef(9))).toBe(9);
    expect(contactIdFromRef(contactSubjectRef(3))).toBe(3);
    expect(contactIdFromRef("leads.Deal:3")).toBeNull();
    expect(contactSubjectRef(null)).toBe("");
  });
});
