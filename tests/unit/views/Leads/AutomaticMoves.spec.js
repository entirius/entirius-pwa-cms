import { describe, it, expect, vi, beforeEach } from "vitest";
import { flushPromises } from "@vue/test-utils";

const comm = vi.hoisted(() => ({ GET_ReplyClassPlans: vi.fn(), PUT_ReplyClassPlan: vi.fn(), DELETE_ReplyClassPlan: vi.fn() }));
const leads = vi.hoisted(() => ({ GET_StageEvents: vi.fn(), GET_Stages: vi.fn(), PUT_StageEvent: vi.fn(), DELETE_StageEvent: vi.fn() }));
vi.mock("@/api/communicator/api", () => comm);
vi.mock("@/api/leads/api", () => leads);
const notify = vi.hoisted(() => ({ spawnNotification: vi.fn() }));
vi.mock("@/stores/notify", () => ({ useNotifyStore: () => notify }));
const backend = vi.hoisted(() => ({ communicator: true }));
vi.mock("@/stores/munin", () => ({ useMuninStore: () => ({ isModuleAtLeast: (key) => key !== "communicator" || backend.communicator }) }));
vi.mock("@/stores/access", () => ({ useAccessStore: () => ({ can: () => true }) }));

import AutomaticMoves from "@/views/Leads/AutomaticMoves.vue";
import { KEEP, NONE, stageBody, stagePart } from "@/views/Leads/automaticMoves";
import { byTestid, mountOutbound } from "./outboundFrame";

const card = (wrapper, event) => wrapper.find(`[data-event="${event}"]`);
const control = (wrapper, event, testid) => card(wrapper, event).findComponent(`[data-testid="${testid}"]`);
const mounted = async (options = {}) => {
  const wrapper = mountOutbound(AutomaticMoves, { area: "leads.settings", ...options });
  await flushPromises();
  return wrapper;
};
const plan = (intent, extra = {}) => ({ intent, sequence: "stop", notify: "high", needs_review: false, is_default: true, ...extra });

// Plan 14: Settings → Automatic moves — the stage map (leads) and the reply plans (communicator) on one screen.
describe("Leads → Settings → Automatic moves", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    backend.communicator = true;
    leads.GET_Stages.mockResolvedValue({ data: { results: [{ key: "contacted", label: "Contacted" }, { key: "replied", label: "Replied" }] } });
    leads.GET_StageEvents.mockResolvedValue({ data: { results: [{ event: "reply", target_stage_key: "replied", forward_only: true, configured: true }] } });
    leads.PUT_StageEvent.mockResolvedValue({ data: {} });
    comm.GET_ReplyClassPlans.mockResolvedValue({ data: { results: [plan("interested"), plan("out_of_office", { sequence: "pause_until_return", is_default: false })] } });
    comm.PUT_ReplyClassPlan.mockResolvedValue({ data: {} });
  });

  it("encodes no row, a kept stage and a stage", () => {
    expect(stagePart(undefined)).toEqual({ target: NONE, forward_only: true });
    expect(stagePart({ configured: true, target_stage_key: null, forward_only: false })).toEqual({ target: KEEP, forward_only: false });
    expect(stageBody({ target: NONE, forward_only: true })).toBeNull();
    expect(stageBody({ target: KEEP, forward_only: true })).toEqual({ target_stage_key: null, forward_only: true });
  });

  it("one card per event; Save sends only what changed, both backends", async () => {
    const wrapper = await mounted();
    expect(wrapper.findAll('[data-testid="moves-card"]')).toHaveLength(10);
    control(wrapper, "first_sent", "moves-target").vm.$emit("update:modelValue", "contacted");
    control(wrapper, "reply:interested", "moves-alert").vm.$emit("update:modelValue", "low");
    await byTestid(wrapper, "moves-save").trigger("click");
    await flushPromises();
    expect(leads.PUT_StageEvent.mock.calls).toEqual([["first_sent", { target_stage_key: "contacted", forward_only: true }]]);
    expect(comm.PUT_ReplyClassPlan).toHaveBeenCalledWith("interested", { sequence: "stop", notify: "low", needs_review: false });
  });

  it("a failed card keeps its error and its edit, and the toast counts it", async () => {
    leads.PUT_StageEvent.mockRejectedValueOnce({ message: "stage gone" });
    const wrapper = await mounted();
    control(wrapper, "first_sent", "moves-target").vm.$emit("update:modelValue", "contacted");
    await byTestid(wrapper, "moves-save").trigger("click");
    await flushPromises();
    expect(card(wrapper, "first_sent").text()).toContain("stage gone");
    expect(control(wrapper, "first_sent", "moves-target").props("modelValue")).toBe("contacted");
    expect(notify.spawnNotification).toHaveBeenCalledWith(expect.objectContaining({ type: "negative" }));
  });

  it("Use default deletes the event row and the stored plan", async () => {
    leads.GET_StageEvents.mockResolvedValue({ data: { results: [{ event: "reply:out_of_office", target_stage_key: null, forward_only: true, configured: true }] } });
    const wrapper = await mounted();
    await card(wrapper, "reply:out_of_office").find('[data-testid="moves-default"]').trigger("click");
    await flushPromises();
    expect(leads.DELETE_StageEvent).toHaveBeenCalledWith("reply:out_of_office");
    expect(comm.DELETE_ReplyClassPlan).toHaveBeenCalledWith("out_of_office");
  });

  it("an older communicator shows the stage part only; no stages, failed load and read-only", async () => {
    backend.communicator = false;
    const old = await mounted();
    expect(comm.GET_ReplyClassPlans).not.toHaveBeenCalled();
    expect(control(old, "reply:interested", "moves-alert").exists()).toBe(false);
    leads.GET_Stages.mockResolvedValueOnce({ data: { results: [] } });
    expect(byTestid(await mounted(), "moves-no-stages").exists()).toBe(true);
    leads.GET_StageEvents.mockRejectedValueOnce({ message: "down" });
    expect(byTestid(await mounted(), "moves-error").text()).toBe("down");
    expect(byTestid(await mounted({ write: false }), "moves-save").exists()).toBe(false);
  });
});
