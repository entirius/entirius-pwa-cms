import { describe, it, expect, vi } from "vitest";
import { mount } from "@vue/test-utils";

const modules = vi.hoisted(() => new Set());
const readable = vi.hoisted(() => new Set());
const newer = vi.hoisted(() => ({ on: false }));
vi.mock("@/stores/munin", () => ({ useMuninStore: () => ({ isModuleEnabled: (key) => modules.has(key), isModuleAtLeast: () => newer.on }) }));
vi.mock("@/stores/access", () => ({ useAccessStore: () => ({ can: (area) => readable.has(area) }) }));
// The areas of the section routes (src/router/index.js).
const AREA = {
  LeadsStages: "leads.settings",
  LeadsLeadTypes: "leads.settings",
  CommunicatorTemplates: "communicator.content",
  CommunicatorSequences: "communicator.content",
  CommunicatorSettings: "communicator.settings",
  LeadsAutomaticMoves: "leads.settings",
  LeadsReplyClassification: "communicator.content",
  LeadsMailboxes: "communicator.settings",
  LeadsSendingHealth: "communicator.settings",
  LeadsDoNotContact: "communicator.settings",
};
vi.mock("vue-router", () => ({ useRouter: () => ({ resolve: ({ name }) => ({ meta: { area: AREA[name] } }) }) }));

import Settings from "@/views/Leads/Settings.vue";
import { LEADS_SETTINGS_SECTIONS } from "@/components/Navigation/nav-routes";
import { t } from "@/i18n";

const RouterLink = { props: ["to"], template: "<a :data-to='to.name'><slot /></a>" };
const BasicCard = { props: ["title"], template: "<section v-bind='$attrs'><slot /></section>" };
const sections = () =>
  mount(Settings, { global: { stubs: { RouterLink, BasicCard, FontAwesomeIcon: true, EmptyState: true } } })
    .findAll("a")
    .map((a) => a.attributes("data-to"));

// UX-002d: one hub for both backends; a section whose module is off is not listed.
describe("Leads → Settings hub", () => {
  it("lists the sections of the enabled modules only", () => {
    Object.values(AREA).forEach((area) => readable.add(area));
    modules.clear();
    ["leads", "communicator"].forEach((key) => modules.add(key));
    expect(sections()).toEqual(["LeadsStages", "LeadsLeadTypes", "CommunicatorSequences", "CommunicatorTemplates", "CommunicatorSettings"]);
    modules.delete("communicator");
    expect(sections()).toEqual(["LeadsStages", "LeadsLeadTypes"]);
    modules.clear();
    modules.add("communicator");
    expect(sections()).toEqual(["CommunicatorSequences", "CommunicatorTemplates", "CommunicatorSettings"]);
  });

  // FIX-09 #17: a section the guard would refuse is not offered.
  it("leaves out a section whose area the user cannot read", () => {
    ["leads", "communicator"].forEach((key) => modules.add(key));
    readable.clear();
    ["leads.settings", "communicator.content"].forEach((area) => readable.add(area));
    expect(sections()).toEqual(["LeadsStages", "LeadsLeadTypes", "CommunicatorSequences", "CommunicatorTemplates"]);
  });

  // Plan 14: one card per group; the outbound sections only on a 0.5.0 backend.
  it("groups the sections and adds the outbound ones on a 0.5.0 backend", () => {
    Object.values(AREA).forEach((area) => readable.add(area));
    ["leads", "communicator"].forEach((key) => modules.add(key));
    newer.on = true;
    const wrapper = mount(Settings, { global: { stubs: { RouterLink, BasicCard, FontAwesomeIcon: true, EmptyState: true } } });
    const group = (key) => wrapper.findAll(`[data-testid="settings-group-${key}"] a`).map((a) => a.attributes("data-to"));
    expect(group("sales")).toEqual(["LeadsStages", "LeadsLeadTypes"]);
    expect(group("automation")).toEqual(["LeadsAutomaticMoves", "CommunicatorSequences", "CommunicatorTemplates", "LeadsReplyClassification"]);
    expect(group("sending")).toEqual(["LeadsMailboxes", "LeadsSendingHealth", "CommunicatorSettings", "LeadsDoNotContact"]);
    newer.on = false;
  });

  // Acceptance CM12: each section says in one line what it changes, in both languages.
  it("one line under each section name", () => {
    Object.values(AREA).forEach((area) => readable.add(area));
    ["leads", "communicator"].forEach((key) => modules.add(key));
    const wrapper = mount(Settings, { global: { stubs: { RouterLink, BasicCard, FontAwesomeIcon: true, EmptyState: true } } });
    expect(wrapper.findAll('[data-testid="settings-section-about"]').map((line) => line.text())).toEqual(
      LEADS_SETTINGS_SECTIONS.filter((section) => wrapper.find(`[data-testid="settings-${section.key}"]`).exists()).map((section) => `leads.settings.about.${section.key}`)
    );
    LEADS_SETTINGS_SECTIONS.forEach(({ key }) => expect(t(`leads.settings.about.${key}`)).not.toBe(`leads.settings.about.${key}`));
  });
});
