import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { mount } from "@vue/test-utils";
import { setActivePinia, createPinia } from "pinia";
import { buildNavRoutes, filterNavRoutes } from "@/components/Navigation/nav-routes";
import { useMuninStore } from "@/stores/munin";
import BottomTabBar from "@/boots/BottomTabBar/index.vue";

vi.mock("vue-router", () => ({
  useRoute: () => ({ path: "/leads/inbox", meta: { panel: "leads" }, params: {}, query: {} }),
  useRouter: () => null,
}));

const LEADS_MODULES = new Set(["leads", "communicator"]);
const routesFor = (panel, isDesktop, modules = LEADS_MODULES) =>
  filterNavRoutes(buildNavRoutes(), { panel, isDesktop, isModuleEnabled: (key) => modules.has(key) }).map(
    (r) => r.route
  );

const setViewport = (desktop) =>
  vi.stubGlobal("matchMedia", () => ({
    matches: desktop,
    addEventListener: () => {},
    removeEventListener: () => {},
  }));

const mountTabBar = () =>
  mount(BottomTabBar, {
    global: { stubs: { RouterLink: { props: ["to"], template: "<a :data-to='to.path'><slot /></a>" } } },
  });

describe("Leads nav (UX-002d: one panel, Settings instead of four entries)", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    const munin = useMuninStore();
    munin.loaded = true;
    munin.modules = [...LEADS_MODULES].map((key) => ({ key, enabled_in_cms: true }));
  });
  afterEach(() => vi.unstubAllGlobals());

  // Leads CRM: Today · Inbox · Companies always; Approvals and Reports need 0.5.0; Settings is desk work
  it("desktop: Today · Inbox · Companies · Settings; there is no Communicator panel nav", () => {
    expect(routesFor("leads", true)).toEqual(["/leads/today", "/leads/inbox", "/leads/companies", "/leads/settings"]);
    expect(routesFor("communicator", true)).toEqual([]);
  });

  it("phone: Today · Inbox · Companies in the bottom tab bar, Settings is not there", () => {
    expect(routesFor("leads", false)).toEqual(["/leads/today", "/leads/inbox", "/leads/companies"]);
    setViewport(false);
    const links = mountTabBar().findAll("a").map((a) => a.attributes("data-to"));
    expect(links).toEqual(["/leads/today", "/leads/inbox", "/leads/companies"]);
  });

  it("desktop: Settings joins the entries; Board and Import are Companies' page actions, not entries", () => {
    setViewport(true);
    const links = mountTabBar().findAll("a").map((a) => a.attributes("data-to"));
    expect(links).toEqual(["/leads/today", "/leads/inbox", "/leads/companies", "/leads/settings"]);
  });

  it("Leads CRM 0.5.0: Deals is the fourth entry, also in the phone bar; Approvals and Reports are desk only", () => {
    const crm = (isDesktop) =>
      filterNavRoutes(buildNavRoutes(), { panel: "leads", isDesktop, isModuleEnabled: () => true, isModuleAtLeast: () => true }).map((r) => r.route);
    expect(crm(false)).toEqual(["/leads/today", "/leads/inbox", "/leads/companies", "/leads/deals"]);
    expect(crm(true)).toEqual(["/leads/today", "/leads/inbox", "/leads/companies", "/leads/deals", "/leads/approvals", "/leads/reports", "/leads/settings"]);
  });

  it("an entry whose backend module is off is not listed", () => {
    expect(routesFor("leads", true, new Set(["leads"]))).toEqual(["/leads/today", "/leads/companies", "/leads/settings"]);
    expect(routesFor("leads", false, new Set(["leads"]))).toEqual(["/leads/today", "/leads/companies"]);
    expect(routesFor("leads", false, new Set(["communicator"]))).toEqual(["/leads/today", "/leads/inbox"]);
  });
});

describe("Enricher nav", () => {
  it("three entries on every screen: Review · Studio · Settings (runs and the setup screens are their tabs)", () => {
    const entries = ["/enrichment", "/enrichment/studio", "/enrichment/settings"];
    expect(routesFor("enricher", false)).toEqual(entries);
    expect(routesFor("enricher", true)).toEqual(entries);
  });

  // Plan 14: Approvals (desktop) needs communicator 0.5.0; an older backend never sees the entry.
  it("Approvals shows on a desktop with communicator >= 0.5.0 and carries the approvals badge", () => {
    const filter = (atLeast, isDesktop = true) =>
      filterNavRoutes(buildNavRoutes(), {
        panel: "leads",
        isDesktop,
        isModuleEnabled: (key) => LEADS_MODULES.has(key),
        isModuleAtLeast: () => atLeast,
      });
    const approvals = filter(true).find((entry) => entry.route === "/leads/approvals");
    expect(approvals).toMatchObject({ badge: "approvals", desktopOnly: true });
    expect(filter(false).map((entry) => entry.route)).not.toContain("/leads/approvals");
    expect(filter(true, false).map((entry) => entry.route)).not.toContain("/leads/approvals");
  });
});
