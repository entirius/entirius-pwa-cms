import { describe, it, expect, vi, beforeEach } from "vitest";
import { flushPromises } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";

const api = vi.hoisted(() => ({
  GET_Approvals: vi.fn(),
  POST_ApprovalsBulk: vi.fn(),
  GET_ApprovalsLog: vi.fn(() => Promise.resolve({ data: { results: [] } })),
}));
vi.mock("@/api/communicator/api", () => api);
vi.mock("@/api/pim/api", () => ({ GET_Channels: vi.fn(() => Promise.resolve({ data: { results: [{ idx: "default-europe", name: "Europe shop" }] } })) }));
const notify = vi.hoisted(() => ({ spawnNotification: vi.fn() }));
vi.mock("@/stores/notify", () => ({ useNotifyStore: () => notify }));
const push = vi.hoisted(() => vi.fn());
vi.mock("vue-router", async (original) => ({ ...(await original()), useRouter: () => ({ push }) }));

import Approvals from "@/views/Leads/Approvals.vue";
import { byTestid, mountOutbound } from "./outboundFrame";

const row = (id, extra = {}) => ({
  id,
  channel: "default-europe",
  thread_id: id,
  subject_ref: "leads.Company:1",
  subject_label: "Acme Ltd",
  recipient_email: `r${id}@acme.test`,
  recipient_name: "",
  template_key: "intro",
  subject: `Offer ${id}`,
  body_preview: "Hello",
  created_at: "2026-11-10T10:00:00Z",
  age_hours: 50,
  blocker: null,
  ...extra,
});
const page = (results) => ({ data: { count: results.length, next: null, results, counts: { total: results.length, by_channel: { "default-europe": results.length }, by_mailbox: {} } } });
const mountApprovals = async (options = {}) => {
  const wrapper = mountOutbound(Approvals, { area: "communicator.review", ...options });
  await flushPromises();
  return wrapper;
};
const select = async (wrapper, ids) => {
  wrapper.findComponent('[data-testid="approvals-table"]').vm.$emit("select", ids.map((id) => ({ id })));
  await flushPromises();
};

// Plan 14: Approvals — drafts of every channel, bulk approve / reject, the problem of each row.
describe("Leads → Approvals", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
    api.GET_Approvals.mockResolvedValue(page([row(1), row(2, { blocker: "the message requires a legal footer and has none" })]));
  });

  it("shows the loader, then the rows with their problem", async () => {
    let resolve;
    api.GET_Approvals.mockReturnValueOnce(new Promise((r) => (resolve = r)));
    const wrapper = mountOutbound(Approvals, { area: "communicator.review" });
    expect(byTestid(wrapper, "loader").exists()).toBe(true);
    resolve(page([row(1), row(2, { blocker: "the message requires a legal footer and has none" })]));
    await flushPromises();
    expect(wrapper.findAll('[data-testid="approval-row"]')).toHaveLength(2);
    expect(wrapper.findAll('[data-testid="approval-problem"]')).toHaveLength(1);
  });

  it("an empty queue says there is nothing to approve; a failed load says so", async () => {
    api.GET_Approvals.mockResolvedValueOnce(page([]));
    expect(byTestid(await mountApprovals(), "approvals-empty").text()).toContain("leads.approvals.empty");
    api.GET_Approvals.mockRejectedValueOnce({ message: "boom" });
    expect(byTestid(await mountApprovals(), "approvals-error").text()).toBe("boom");
  });

  it("bulk approve: one id refused stays selected with its reason, the toast sums both", async () => {
    api.POST_ApprovalsBulk.mockResolvedValue({ data: { done: [1], failed: { 2: "mailbox paused" } } });
    const wrapper = await mountApprovals();
    await select(wrapper, [1, 2]);
    api.GET_Approvals.mockResolvedValue(page([row(2)]));
    await byTestid(wrapper, "approvals-approve").trigger("click");
    await byTestid(wrapper, "approvals-approve-confirm").trigger("click");
    await flushPromises();
    expect(api.POST_ApprovalsBulk).toHaveBeenCalledWith({ action: "approve", ids: [1, 2], reason: "" });
    expect(notify.spawnNotification).toHaveBeenCalledWith({ msg: "1 draft approved. 1 not approved.", type: "warning" });
    expect(byTestid(wrapper, "approval-problem").attributes("title")).toBe("mailbox paused");
    expect(byTestid(wrapper, "approvals-bulk").exists()).toBe(true);
  });

  it("sends more than 100 ids in chunks of 100", async () => {
    const many = Array.from({ length: 150 }, (_, i) => row(i + 1));
    api.GET_Approvals.mockResolvedValue(page(many));
    api.POST_ApprovalsBulk.mockImplementation(({ ids }) => Promise.resolve({ data: { done: ids, failed: {} } }));
    const wrapper = await mountApprovals();
    await select(wrapper, many.map((item) => item.id));
    await byTestid(wrapper, "approvals-approve").trigger("click");
    await byTestid(wrapper, "approvals-approve-confirm").trigger("click");
    await flushPromises();
    expect(api.POST_ApprovalsBulk.mock.calls.map(([body]) => body.ids.length)).toEqual([100, 50]);
  });

  it("approve asks first (Approve N drafts?) and sends only after the confirm", async () => {
    api.POST_ApprovalsBulk.mockResolvedValue({ data: { done: [1, 2], failed: {} } });
    const wrapper = await mountApprovals();
    await select(wrapper, [1, 2]);
    await byTestid(wrapper, "approvals-approve").trigger("click");
    expect(wrapper.text()).toContain("Approve 2 drafts?");
    expect(api.POST_ApprovalsBulk).not.toHaveBeenCalled();
    await byTestid(wrapper, "approvals-approve-confirm").trigger("click");
    await flushPromises();
    expect(api.POST_ApprovalsBulk).toHaveBeenCalledTimes(1);
    expect(notify.spawnNotification).toHaveBeenCalledWith({ msg: "2 drafts approved.", type: "positive" });
  });

  it("the toast of a reject says only what happened", async () => {
    api.POST_ApprovalsBulk.mockResolvedValue({ data: { done: [1], failed: {} } });
    const wrapper = await mountApprovals();
    await select(wrapper, [1]);
    await byTestid(wrapper, "approvals-reject").trigger("click");
    wrapper.findComponent('[data-testid="approvals-reject-reason"]').vm.$emit("update:modelValue", "no");
    await byTestid(wrapper, "approvals-reject-submit").trigger("click");
    await flushPromises();
    expect(notify.spawnNotification).toHaveBeenCalledWith({ msg: "1 draft rejected.", type: "positive" });
  });

  it("shows the company as a link to its card and the channel by name, never the reference", async () => {
    const wrapper = await mountApprovals();
    const link = wrapper.find('[data-testid="approval-company"]');
    expect(link.text()).toBe("Acme Ltd");
    expect(wrapper.findComponent({ name: "RouterLink" }).props("to")).toEqual({ name: "LeadsThread", params: { id: 1 } });
    const table = wrapper.find('[data-testid="approvals-table"]');
    expect(table.text()).not.toContain("leads.Company");
    expect(table.text()).toContain("Europe shop");
    expect(table.text()).toContain("intro");
  });

  it("reject asks for a reason first", async () => {
    api.POST_ApprovalsBulk.mockResolvedValue({ data: { done: [1], failed: {} } });
    const wrapper = await mountApprovals();
    await select(wrapper, [1]);
    await byTestid(wrapper, "approvals-reject").trigger("click");
    await byTestid(wrapper, "approvals-reject-submit").trigger("click");
    expect(api.POST_ApprovalsBulk).not.toHaveBeenCalled();
    wrapper.findComponent('[data-testid="approvals-reject-reason"]').vm.$emit("update:modelValue", "wrong tone");
    await byTestid(wrapper, "approvals-reject-submit").trigger("click");
    await flushPromises();
    expect(api.POST_ApprovalsBulk).toHaveBeenCalledWith({ action: "reject", ids: [1], reason: "wrong tone" });
  });

  it("a row of the active channel opens Review; another channel's opens the drawer", async () => {
    api.GET_Approvals.mockResolvedValue(page([row(1), row(2, { channel: "other" })]));
    const wrapper = await mountApprovals();
    const open = wrapper.findAll('[data-testid="approval-open"]');
    await open[0].trigger("click");
    expect(push).toHaveBeenCalledWith({ name: "LeadsReview", params: { id: 1 }, query: { from: "approvals" } });
    await open[1].trigger("click");
    expect(byTestid(wrapper, "approvals-drawer-approve").exists()).toBe(true);
  });

  it("read-only: no bulk bar and no drawer actions", async () => {
    api.GET_Approvals.mockResolvedValue(page([row(1, { channel: "other" })]));
    const wrapper = await mountApprovals({ write: false });
    // Acceptance CM11: no bulk action, so no row checkboxes
    expect(wrapper.findComponent('[data-testid="approvals-table"]').props("selectable")).toBe(false);
    await select(wrapper, [1]);
    expect(byTestid(wrapper, "approvals-bulk").exists()).toBe(false);
    await byTestid(wrapper, "approval-open").trigger("click");
    expect(byTestid(wrapper, "approvals-drawer-approve").exists()).toBe(false);
  });
});
