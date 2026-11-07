import { describe, it, expect, vi } from "vitest";
import { mount } from "@vue/test-utils";

const modules = vi.hoisted(() => new Set());
const readable = vi.hoisted(() => new Set());
vi.mock("@/stores/munin", () => ({ useMuninStore: () => ({ isModuleEnabled: (key) => modules.has(key) }) }));
vi.mock("@/stores/access", () => ({ useAccessStore: () => ({ can: (area) => readable.has(area) }) }));
// The areas of the section routes (src/router/index.js).
const AREA = {
  LeadsReports: "leads.companies",
  LeadsStages: "leads.settings",
  LeadsLeadTypes: "leads.settings",
  LeadsRules: "leads.settings",
  LeadsProfiles: "leads.settings",
  LeadsScoring: "leads.settings",
  LeadsReplyRoutes: "leads.settings",
  CommunicatorTemplates: "communicator.content",
  CommunicatorSequences: "communicator.content",
  CommunicatorSettings: "communicator.settings",
  CommunicatorReplyActions: "communicator.settings",
  CommunicatorMailbox: "communicator.settings",
};
const LEADS = ["LeadsReports", "LeadsStages", "LeadsLeadTypes", "LeadsRules", "LeadsProfiles", "LeadsScoring", "LeadsReplyRoutes"];
const COMMUNICATOR = ["CommunicatorTemplates", "CommunicatorSequences", "CommunicatorSettings", "CommunicatorReplyActions", "CommunicatorMailbox"];
vi.mock("vue-router", () => ({ useRouter: () => ({ resolve: ({ name }) => ({ meta: { area: AREA[name] } }) }) }));

import Settings from "@/views/Leads/Settings.vue";

const RouterLink = { props: ["to"], template: "<a :data-to='to.name'><slot /></a>" };
const sections = () =>
  mount(Settings, { global: { stubs: { RouterLink, FontAwesomeIcon: true } } })
    .findAll("a")
    .map((a) => a.attributes("data-to"));

// UX-002d: one hub for both backends; a section whose module is off is not listed.
describe("Leads → Settings hub", () => {
  it("lists the sections of the enabled modules only", () => {
    Object.values(AREA).forEach((area) => readable.add(area));
    modules.clear();
    ["leads", "communicator"].forEach((key) => modules.add(key));
    expect(sections()).toEqual([...LEADS, ...COMMUNICATOR]);
    modules.delete("communicator");
    expect(sections()).toEqual(LEADS);
    modules.clear();
    modules.add("communicator");
    expect(sections()).toEqual(COMMUNICATOR);
  });

  // FIX-09 #17: a section the guard would refuse is not offered.
  it("leaves out a section whose area the user cannot read", () => {
    ["leads", "communicator"].forEach((key) => modules.add(key));
    readable.clear();
    ["leads.settings", "communicator.content"].forEach((area) => readable.add(area));
    expect(sections()).toEqual([...LEADS.filter((name) => name !== "LeadsReports"), "CommunicatorTemplates", "CommunicatorSequences"]);
  });
});
