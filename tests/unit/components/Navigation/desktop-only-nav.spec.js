import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { mount } from "@vue/test-utils";
import { setActivePinia, createPinia } from "pinia";
import { buildNavRoutes, filterNavRoutes } from "@/components/Navigation/nav-routes";
import { useUserStore } from "@/stores/user";
import Navigation from "@/components/Navigation/Navigation.vue";

const routesFor = (activeApp, isDesktop) =>
  filterNavRoutes(buildNavRoutes(), { activeApp, isDesktop }).map((r) => r.route);

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

describe("desktop-only nav entries", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    useUserStore().activeApp = "leads";
  });
  afterEach(() => vi.unstubAllGlobals());

  it("phone: the leads panel keeps one entry (no bottom bar) and communicator has none", () => {
    expect(routesFor("leads", false)).toEqual(["/leads/inbox"]);
    expect(routesFor("communicator", false)).toEqual([]);
  });

  it("desktop: every leads and communicator entry is listed", () => {
    expect(routesFor("leads", true)).toEqual([
      "/leads/inbox",
      "/leads/board",
      "/leads/import",
      "/leads/stages",
    ]);
    expect(routesFor("communicator", true)).toHaveLength(3);
  });

  it("phone viewport: the mobile nav renders only the inbox link", () => {
    setViewport(false);
    const links = mountMobileNav().findAll("a").map((a) => a.attributes("data-to"));
    expect(links).toEqual(["/leads/inbox"]);
  });

  it("desktop viewport: the nav renders the desktop-only links", () => {
    setViewport(true);
    const links = mountMobileNav().findAll("a").map((a) => a.attributes("data-to"));
    expect(links).toHaveLength(4);
  });
});
