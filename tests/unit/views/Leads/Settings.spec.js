import { describe, it, expect, vi } from "vitest";
import { mount } from "@vue/test-utils";

const modules = vi.hoisted(() => new Set());
vi.mock("@/stores/munin", () => ({ useMuninStore: () => ({ isModuleEnabled: (key) => modules.has(key) }) }));

import Settings from "@/views/Leads/Settings.vue";

const RouterLink = { props: ["to"], template: "<a :data-to='to.name'><slot /></a>" };
const sections = () =>
  mount(Settings, { global: { stubs: { RouterLink, FontAwesomeIcon: true } } })
    .findAll("a")
    .map((a) => a.attributes("data-to"));

// UX-002d: one hub for both backends; a section whose module is off is not listed.
describe("Leads → Settings hub", () => {
  it("lists the sections of the enabled modules only", () => {
    modules.clear();
    ["leads", "communicator"].forEach((key) => modules.add(key));
    expect(sections()).toEqual(["LeadsStages", "LeadsLeadTypes", "CommunicatorTemplates", "CommunicatorSequences", "CommunicatorSettings"]);
    modules.delete("communicator");
    expect(sections()).toEqual(["LeadsStages", "LeadsLeadTypes"]);
    modules.clear();
    modules.add("communicator");
    expect(sections()).toEqual(["CommunicatorTemplates", "CommunicatorSequences", "CommunicatorSettings"]);
  });
});
