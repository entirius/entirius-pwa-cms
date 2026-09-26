import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { mount } from "@vue/test-utils";
import { setActivePinia, createPinia } from "pinia";
import { buildNavRoutes, filterNavRoutes } from "@/components/Navigation/nav-routes";
import { useMuninStore } from "@/stores/munin";
import { useUserStore } from "@/stores/user";
import Navigation from "@/components/Navigation/Navigation.vue";

const LEADS_MODULES = new Set(["leads", "communicator"]);
const routesFor = (activeApp, isDesktop, modules = LEADS_MODULES) =>
  filterNavRoutes(buildNavRoutes(), { activeApp, isDesktop, isModuleEnabled: (key) => modules.has(key) }).map(
    (r) => r.route
  );

const setViewport = (desktop) =>
  vi.stubGlobal("matchMedia", () => ({
    matches: desktop,
    addEventListener: () => {},
    removeEventListener: () => {},
  }));

const mountMobileNav = () =>
  mount(Navigation, {
    props: { mobile: true },
    global: { stubs: { RouterLink: { props: ["to"], template: "<a :data-to='to.path'><slot /></a>" } } },
  });

describe("Leads nav (UX-002d: one panel, Settings instead of four entries)", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    useUserStore().activeApp = "leads";
    const munin = useMuninStore();
    munin.loaded = true;
    munin.modules = [...LEADS_MODULES].map((key) => ({ key, enabled_in_cms: true }));
  });
  afterEach(() => vi.unstubAllGlobals());

  it("desktop: Inbox · Companies · Board · Import · Settings; there is no Communicator panel nav", () => {
    expect(routesFor("leads", true)).toEqual([
      "/leads/inbox",
      "/leads/companies",
      "/leads/board",
      "/leads/import",
      "/leads/settings",
    ]);
    expect(routesFor("communicator", true)).toEqual([]);
  });

  it("phone: Inbox · Companies · Settings — Settings is reachable from the bottom bar", () => {
    expect(routesFor("leads", false)).toEqual(["/leads/inbox", "/leads/companies", "/leads/settings"]);
    setViewport(false);
    const links = mountMobileNav().findAll("a").map((a) => a.attributes("data-to"));
    expect(links).toEqual(["/leads/inbox", "/leads/companies", "/leads/settings"]);
  });

  it("an entry whose backend module is off is not listed", () => {
    expect(routesFor("leads", true, new Set(["leads"]))).toEqual([
      "/leads/companies",
      "/leads/board",
      "/leads/import",
      "/leads/settings",
    ]);
    expect(routesFor("leads", false, new Set(["communicator"]))).toEqual(["/leads/inbox", "/leads/settings"]);
  });
});
