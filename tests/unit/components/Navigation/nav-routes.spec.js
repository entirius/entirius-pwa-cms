import { describe, it, expect } from "vitest";
import { filterNavRoutes } from "@/components/Navigation/nav-routes";

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
