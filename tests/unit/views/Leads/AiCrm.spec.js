import { describe, it, expect, vi, beforeEach } from "vitest";
import { flushPromises } from "@vue/test-utils";

const api = vi.hoisted(() => ({
  GET_AiCrmPlan: vi.fn(),
  GET_AiCrmProposals: vi.fn(),
  POST_AiCrmChat: vi.fn(),
  POST_AiCrmTool: vi.fn(),
}));
const notify = vi.hoisted(() => ({ spawnNotification: vi.fn() }));
vi.mock("@/api/aiCrm/api", () => api);
vi.mock("@/stores/notify", () => ({ useNotifyStore: () => notify }));

import AiCrm from "@/views/Leads/AiCrm.vue";
import { buildNavRoutes, filterNavRoutes } from "@/components/Navigation/nav-routes";
import { byTestid, mountOutbound } from "./outboundFrame";

const task = (extra = {}) => ({
  type: "task", n: 1, task_id: 11, title: "Call back", overdue: true, subject_ref: "leads.Company:5",
  subject_label: "Acme Ltd", company_id: 5, ...extra,
});
const proposal = { id: 3, tool: "move_deal", summary: "mark deal #9 “Shop” as Lost — budget cut", status: "pending" };
const plan = (items) => ({ data: { items, upcoming_7d: 0 } });
// A textarea that keeps its v-model, so a spec types like a user.
const BasicTextarea = { name: "BasicTextarea", props: ["modelValue"], emits: ["update:modelValue"], template: "<textarea :value='modelValue' @input=\"$emit('update:modelValue', $event.target.value)\" />" };
const mounted = async (options = {}) => {
  const wrapper = mountOutbound(AiCrm, { area: "ai_crm.agent", stubs: { BasicTextarea }, ...options });
  await flushPromises();
  return wrapper;
};
const type = async (wrapper, text) => {
  await byTestid(wrapper, "ai-crm-input").setValue(text);
  await byTestid(wrapper, "ai-crm-form").trigger("submit");
  await flushPromises();
};

// U10: AI CRM — the day plan and the conversation with the agent (ai_crm app of django-leads).
describe("Leads → AI CRM", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.GET_AiCrmPlan.mockResolvedValue(plan([task(), { type: "drafts", n: 2, count: 4 }]));
    api.GET_AiCrmProposals.mockResolvedValue({ data: { results: [] } });
  });

  it("lists the day plan in order: the task with its company, then the drafts waiting", async () => {
    const wrapper = await mounted();
    const items = wrapper.findAll('[data-testid="ai-crm-item"]');
    expect(items).toHaveLength(2);
    expect(items[0].text()).toContain("1.");
    expect(items[0].text()).toContain("Call back");
    expect(items[0].text()).toContain("Acme Ltd");
    expect(items[0].text()).toContain("leads.ai_crm.overdue");
    expect(items[1].text()).toContain("Review the drafts waiting: 4");
  });

  it("says when nothing waits", async () => {
    api.GET_AiCrmPlan.mockResolvedValue(plan([]));
    const wrapper = await mounted();
    expect(byTestid(wrapper, "ai-crm-plan-empty").exists()).toBe(true);
  });

  it("“done 1” goes to the agent, its reply shows and the plan refreshes from the answer", async () => {
    api.POST_AiCrmChat.mockResolvedValue({ data: { reply: "Done: task #11 closed — called", results: [], proposals: [], plan: { items: [] } } });
    const wrapper = await mounted();

    await type(wrapper, "done 1: called");

    expect(api.POST_AiCrmChat).toHaveBeenCalledWith("done 1: called", []);
    const messages = wrapper.findAll('[data-testid="ai-crm-message"]');
    expect(messages.map((m) => m.attributes("data-role"))).toEqual(["user", "assistant"]);
    expect(messages[1].text()).toBe("Done: task #11 closed — called");
    expect(wrapper.findAll('[data-testid="ai-crm-item"]')).toHaveLength(0);
  });

  it("an irreversible action asks first: Confirm runs the proposal, Cancel drops it", async () => {
    api.POST_AiCrmChat.mockResolvedValue({ data: { reply: "Please confirm", results: [], proposals: [proposal], plan: { items: [] } } });
    api.POST_AiCrmTool.mockResolvedValue({ data: { status: "done", message: "Deal #9 moved to Lost." } });
    const wrapper = await mounted();

    await type(wrapper, "deal #9 -> lost: budget cut");
    expect(byTestid(wrapper, "ai-crm-proposal").text()).toContain("mark deal #9");

    await byTestid(wrapper, "ai-crm-confirm").trigger("click");
    await flushPromises();

    expect(api.POST_AiCrmTool).toHaveBeenCalledWith("confirm_proposal", { proposal_id: 3 });
    expect(byTestid(wrapper, "ai-crm-proposal").exists()).toBe(false);
    expect(wrapper.findAll('[data-testid="ai-crm-message"]').at(-1).text()).toBe("Deal #9 moved to Lost.");
  });

  it("shows the proposals still open when the page opens, and Cancel rejects one", async () => {
    api.GET_AiCrmProposals.mockResolvedValue({ data: { results: [proposal] } });
    api.POST_AiCrmTool.mockResolvedValue({ data: { status: "rejected", message: "Cancelled" } });
    const wrapper = await mounted();

    await byTestid(wrapper, "ai-crm-reject").trigger("click");
    await flushPromises();

    expect(api.POST_AiCrmTool).toHaveBeenCalledWith("reject_proposal", { proposal_id: 3 });
    expect(byTestid(wrapper, "ai-crm-proposal").exists()).toBe(false);
  });

  it("an empty message is not sent; a failed call says so", async () => {
    api.POST_AiCrmChat.mockRejectedValue(new Error("boom"));
    const wrapper = await mounted();
    await type(wrapper, "   ");
    expect(api.POST_AiCrmChat).not.toHaveBeenCalled();
    await type(wrapper, "plan");
    expect(notify.spawnNotification).toHaveBeenCalledWith(expect.objectContaining({ type: "negative" }));
  });

  it("read-only: no Send and no Confirm", async () => {
    api.GET_AiCrmProposals.mockResolvedValue({ data: { results: [proposal] } });
    const wrapper = await mounted({ write: false });
    expect(byTestid(wrapper, "ai-crm-send").exists()).toBe(false);
    expect(byTestid(wrapper, "ai-crm-confirm").exists()).toBe(false);
  });
});

describe("AI CRM in the Leads menu", () => {
  const leadsNav = (enabled) =>
    filterNavRoutes(buildNavRoutes(), { panel: "leads", isModuleEnabled: (key) => enabled.includes(key), isModuleAtLeast: () => true, isDesktop: true, canRead: () => true });

  it("sits above Today when munin reports ai_crm", () => {
    const routes = leadsNav(["ai_crm", "leads", "communicator"]).map((r) => r.route);
    expect(routes.indexOf("/leads/ai-crm")).toBe(routes.indexOf("/leads/today") - 1);
  });

  it("is hidden without the module", () => {
    expect(leadsNav(["leads", "communicator"]).map((r) => r.route)).not.toContain("/leads/ai-crm");
  });
});
