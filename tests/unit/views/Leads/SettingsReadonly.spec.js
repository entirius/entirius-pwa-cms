import { describe, it, expect, vi, beforeEach } from "vitest";
import { reactive } from "vue";
import { mount, flushPromises } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { routeLocationKey } from "vue-router";

const leads = vi.hoisted(() => ({
  GET_Stages: vi.fn(),
  GET_Rules: vi.fn(),
  GET_Companies: vi.fn(),
  PATCH_Stage: vi.fn(),
  DELETE_Stage: vi.fn(),
  POST_Stage: vi.fn(),
  GET_LeadTypes: vi.fn(),
  PATCH_LeadType: vi.fn(),
  POST_LeadType: vi.fn(),
  DELETE_LeadType: vi.fn(),
}));
const comm = vi.hoisted(() => ({
  GET_Sequences: vi.fn(),
  GET_SequenceTexts: vi.fn(),
  PATCH_Sequence: vi.fn(),
  POST_Sequence: vi.fn(),
  POST_SequenceText: vi.fn(),
  PATCH_SequenceText: vi.fn(),
  DELETE_SequenceText: vi.fn(),
  GET_Templates: vi.fn(),
  GET_Channel: vi.fn(),
  PATCH_Channel: vi.fn(),
  GET_Policy: vi.fn(),
  PUT_Policy: vi.fn(),
  GET_Footers: vi.fn(),
  PUT_Footer: vi.fn(),
  DELETE_Footer: vi.fn(),
  GET_WaitingMessages: vi.fn(),
  POST_SendNow: vi.fn(),
  GET_Suppressions: vi.fn(),
  POST_Suppression: vi.fn(),
  DELETE_Suppression: vi.fn(),
}));
vi.mock("@/api/leads/api", () => leads);
vi.mock("@/api/communicator/api", () => comm);
vi.mock("@/stores/notify", () => ({ useNotifyStore: () => ({ spawnNotification: vi.fn() }) }));
const backend = vi.hoisted(() => ({ outbound: false }));
vi.mock("@/stores/munin", () => ({ useMuninStore: () => ({ isModuleEnabled: () => true, isModuleAtLeast: () => backend.outbound }) }));
vi.mock("vue-router", async (original) => ({ ...(await original()), useRouter: () => ({ push: vi.fn(), replace: vi.fn() }) }));

import { ACCESS_STORE } from "@/composables/useReadonly";
import IconButton from "@/boots/IconButton/index.vue";
import Stages from "@/views/Leads/Stages.vue";
import LeadTypes from "@/views/Leads/LeadTypes.vue";
import SequenceList from "@/views/Communicator/SequenceList.vue";
import TemplateList from "@/views/Communicator/TemplateList.vue";
import CommunicatorSettings from "@/views/Communicator/Settings.vue";
import { communicatorFrame } from "../Communicator/communicatorFrame";

// Acceptance C5 (plan 22): a role that reads a Leads settings section but cannot write it sees the read-only notice
// and no write control — no primary action, no row action that writes, no add form. The sections with their own spec
// (Deal stages, Custom fields, Scoring, Rules, Automatic moves, Reply classification, Mailboxes, Sending health, Do not
// contact) prove it there; these are the rest.
const draggable = { props: ["list", "disabled"], template: "<div><slot v-for='(el, i) in list' name='item' :element='el' :index='i' /></div>" };

function mountSection(component, area, write) {
  const access = { available: true, can: (wanted, level) => wanted === area && (write || level !== "write") };
  return mount(component, {
    global: {
      components: communicatorFrame.components,
      stubs: { ...communicatorFrame.stubs, IconButton, draggable, RouterLink: true, SegmentedControl: true, BasicWysiwyg: true },
      provide: { [routeLocationKey]: reactive({ meta: { area } }), [ACCESS_STORE]: access },
    },
  });
}

async function both(component, area) {
  const [writer, reader] = [mountSection(component, area, true), mountSection(component, area, false)];
  await flushPromises();
  return { writer, reader };
}

const has = (wrapper, testid) => wrapper.find(`[data-testid="${testid}"]`).exists();

// Each write control is present for a writer and gone for a reader, and the reader sees the notice.
function expectReadonly({ writer, reader }, testids) {
  expect(has(writer, "readonly-notice")).toBe(false);
  expect(has(reader, "readonly-notice")).toBe(true);
  testids.forEach((testid) => {
    expect(has(writer, testid), `${testid} for a writer`).toBe(true);
    expect(has(reader, testid), `${testid} for a reader`).toBe(false);
  });
}

describe("Leads settings sections, read-only", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setActivePinia(createPinia());
    leads.GET_Stages.mockResolvedValue({ data: { results: [{ id: 1, key: "new", label: "New", order: 0, kind: "open" }] } });
    leads.GET_Rules.mockResolvedValue({ data: { results: [] } });
    leads.GET_LeadTypes.mockResolvedValue({ data: { results: [{ id: 1, code: "SHOP", label: "Shop", order: 0, is_active: true }] } });
    comm.GET_Sequences.mockResolvedValue({ data: { results: [{ id: 3, key: "followup", is_active: true, autostart: false, steps: [] }] } });
    comm.GET_SequenceTexts.mockResolvedValue({ data: { results: [{ id: 8, text: "Any news?", is_active: true }] } });
    comm.GET_Templates.mockResolvedValue({ data: { results: [] } });
    comm.GET_Channel.mockResolvedValue({ data: { mode: "dry_run", sandbox_mailbox: "", live_enabled: false } });
    comm.GET_Policy.mockResolvedValue({ data: { timezone: "UTC", daily_cap: 10, windows: [{ start_time: "08:00", end_time: "17:00" }] } });
    comm.GET_Footers.mockResolvedValue({ data: { results: [{ language: "pl", html: "<p>Footer</p>" }] } });
    comm.GET_WaitingMessages.mockResolvedValue([]);
  });

  it("Stages: no delete, no Add stage", async () => {
    expectReadonly(await both(Stages, "leads.settings"), ["stage-delete", "stage-add", "stage-save"]);
  });

  it("Lead types: no add form, no delete", async () => {
    expectReadonly(await both(LeadTypes, "leads.settings"), ["lead-type-add", "lead-type-save", "lead-type-delete"]);
  });

  it("Sequences: no new sequence, no new text, no text edit or removal", async () => {
    expectReadonly(await both(SequenceList, "communicator.content"), ["sequence-add", "sequence-save", "sequence-add-text", "pool-text-edit", "pool-text-remove"]);
  });

  it("Templates: the notice; the list only reads", async () => {
    const { reader } = await both(TemplateList, "communicator.content");
    expect(has(reader, "readonly-notice")).toBe(true);
  });

  it("Sending: no Save of the hours, the sender or the footer, no footer removal", async () => {
    backend.outbound = true;
    expectReadonly(await both(CommunicatorSettings, "communicator.settings"), ["settings-save", "policy-add-window", "footer-remove"]);
    backend.outbound = false;
  });
});
