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

  // Companies is its own entry between Inbox and Approvals (the Inbox toggle is gone)
  it("desktop: Inbox · Companies · Approvals · Board · Import · Settings; there is no Communicator panel nav", () => {
    expect(routesFor("leads", true)).toEqual([
      "/leads/inbox",
      "/leads/companies",
      "/leads/approvals",
      "/leads/board",
      "/leads/reports",
      "/leads/import",
      "/leads/settings",
    ]);
    expect(routesFor("communicator", true)).toEqual([]);
  });

  it("phone: Inbox · Companies · Approvals · Settings — Settings is reachable from the bottom tab bar", () => {
    expect(routesFor("leads", false)).toEqual(["/leads/inbox", "/leads/companies", "/leads/approvals", "/leads/settings"]);
    setViewport(false);
    const links = mountTabBar().findAll("a").map((a) => a.attributes("data-to"));
    expect(links).toEqual(["/leads/inbox", "/leads/companies", "/leads/approvals", "/leads/settings"]);
  });

  it("desktop: Board and Import join the entries (the tab bar itself is the phone's)", () => {
    setViewport(true);
    const links = mountTabBar().findAll("a").map((a) => a.attributes("data-to"));
    expect(links).toEqual(["/leads/inbox", "/leads/companies", "/leads/approvals", "/leads/board", "/leads/reports", "/leads/import", "/leads/settings"]);
  });

  it("an entry whose backend module is off is not listed; without communicator Companies is the only list entry", () => {
    expect(routesFor("leads", true, new Set(["leads"]))).toEqual([
      "/leads/companies",
      "/leads/board",
      "/leads/reports",
      "/leads/import",
      "/leads/settings",
    ]);
    expect(routesFor("leads", false, new Set(["leads"]))).toEqual(["/leads/companies", "/leads/settings"]);
    expect(routesFor("leads", false, new Set(["communicator"]))).toEqual(["/leads/inbox", "/leads/approvals", "/leads/settings"]);
  });
});

describe("Enricher nav", () => {
  it("three entries on every screen: Review · Studio · Settings (runs and the setup screens are their tabs)", () => {
    const entries = ["/enrichment", "/enrichment/studio", "/enrichment/settings"];
    expect(routesFor("enricher", false)).toEqual(entries);
    expect(routesFor("enricher", true)).toEqual(entries);
  });
});
