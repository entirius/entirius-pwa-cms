import { describe, it, expect } from "vitest";
import { buildNavRoutes, filterNavRoutes, isNavActive } from "@/components/Navigation/nav-routes";

const routes = [
  { app: ["atlas"], route: "/atlas/list", labelKey: "nav.atlas_list" },
  {
    app: ["atlas"],
    route: "/atlas/find",
    labelKey: "nav.atlas_find",
    requiresModule: "lookup",
  },
];

describe("filterNavRoutes — requiresModule gating", () => {
  it("hides a requiresModule entry when the module is disabled", () => {
    const visible = filterNavRoutes(routes, {
      activeApp: "atlas",
      isModuleEnabled: () => false,
    });
    expect(visible.map((r) => r.route)).toEqual(["/atlas/list"]);
  });

  it("shows a requiresModule entry once the module is enabled", () => {
    const visible = filterNavRoutes(routes, {
      activeApp: "atlas",
      isModuleEnabled: (key) => key === "lookup",
    });
    expect(visible.map((r) => r.route)).toEqual(["/atlas/list", "/atlas/find"]);
  });

  it("hides a requiresModule entry when no isModuleEnabled callback is provided", () => {
    const visible = filterNavRoutes(routes, { activeApp: "atlas" });
    expect(visible.map((r) => r.route)).toEqual(["/atlas/list"]);
  });
});

// FIX-17b item 5: a company card lights the Leads Inbox entry — the sidebar never shows nothing selected.
describe("isNavActive — pages without an entry of their own", () => {
  it("the Inbox entry is active on a company card, the board entry is not", () => {
    const leads = buildNavRoutes().filter((route) => route.app.includes("leads"));
    const active = leads.filter((route) => isNavActive(route, "/leads/companies/100")).map((route) => route.route);
    expect(active).toEqual(["/leads/inbox"]);
    expect(isNavActive(leads[0], "/leads/board")).toBe(false);
  });
});
