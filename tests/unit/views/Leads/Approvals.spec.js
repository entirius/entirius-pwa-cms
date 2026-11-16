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

  it("bulk approve: one id refused stays selected with its reason on the row, the result line sums both", async () => {
    api.POST_ApprovalsBulk.mockResolvedValue({ data: { done: [1], failed: { 2: "mailbox paused" } } });
    const wrapper = await mountApprovals();
    await select(wrapper, [1, 2]);
    api.GET_Approvals.mockResolvedValue(page([row(2)]));
    await byTestid(wrapper, "approvals-approve").trigger("click");
    await byTestid(wrapper, "approvals-approve-confirm").trigger("click");
    await flushPromises();
    expect(api.POST_ApprovalsBulk).toHaveBeenCalledWith({ action: "approve", ids: [1, 2], reason: "" });
    expect(byTestid(wrapper, "approvals-result").text()).toBe("1 draft approved. 1 not approved.");
    expect(byTestid(wrapper, "approval-problem").attributes("title")).toBe("mailbox paused");
    // T5 (walk 4): the refusal sentence stands in the Problem cell, not under the recipient
    expect(byTestid(wrapper, "approval-refused").text()).toBe("mailbox paused");
    expect(byTestid(wrapper, "approval-refused").element.closest("[data-column]").dataset.column).toBe("problem");
    expect(byTestid(wrapper, "approvals-bulk").exists()).toBe(true);
  });

  // n6: everything approved — no tick stays behind on a remaining row without its selection bar
  it("an approve with nothing refused clears the table's ticks", async () => {
    api.POST_ApprovalsBulk.mockResolvedValue({ data: { done: [1], failed: {} } });
    const wrapper = await mountApprovals();
    const table = wrapper.findComponent('[data-testid="approvals-table"]');
    const clearSelection = vi.spyOn(table.vm.$.exposed, "clearSelection");
    await select(wrapper, [1]);
    api.GET_Approvals.mockResolvedValue(page([row(2)]));
    await byTestid(wrapper, "approvals-approve").trigger("click");
    await byTestid(wrapper, "approvals-approve-confirm").trigger("click");
    await flushPromises();
    expect(clearSelection).toHaveBeenCalled();
    expect(byTestid(wrapper, "approvals-bulk").exists()).toBe(false);
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
    expect(byTestid(wrapper, "approvals-result").text()).toBe("2 drafts approved.");
  });

  describe("U14: a draft of a mailbox on hold", () => {
    const counts = (hold) => ({
      total: 3,
      by_channel: { "default-europe": 3 },
      by_mailbox: { 1: 2, 2: 1 },
      mailboxes: [
        { id: 1, address: "sales1@greenmail.test", user_name: "manager", hold },
        { id: 2, address: "sales2@greenmail.test", user_name: "editor", hold: null },
      ],
    });
    const held = (hold = "paused") =>
      api.GET_Approvals.mockResolvedValue({
        data: { count: 3, next: null, results: [row(1, { mailbox_id: 1 }), row(2, { mailbox_id: 1 }), row(3, { mailbox_id: 2 })], counts: counts(hold) },
      });
    const dialog = (wrapper) => wrapper.findComponent({ name: "ConfirmDialog" });

    it("the dialog says up front how many will not go out and from which mailbox; the others still go", async () => {
      held();
      const wrapper = await mountApprovals();
      await select(wrapper, [1, 3]);
      await byTestid(wrapper, "approvals-approve").trigger("click");
      expect(dialog(wrapper).props("message")).toBe(
        "The mailbox sales1@greenmail.test is paused: 1 selected draft will not go out. The other 1 goes out at once."
      );
      expect(byTestid(wrapper, "approvals-approve-confirm").attributes("disabled")).toBeUndefined();
    });

    it("all of them on hold: Approve is off", async () => {
      held();
      const wrapper = await mountApprovals();
      await select(wrapper, [1, 2]);
      await byTestid(wrapper, "approvals-approve").trigger("click");
      expect(dialog(wrapper).props("message")).toBe(
        "The mailbox sales1@greenmail.test is paused: 2 selected drafts will not go out. " +
          "Nothing selected can go out: Approve is off until the mailbox sends again."
      );
      expect(dialog(wrapper).props("confirmDisabled")).toBe(true);
      await byTestid(wrapper, "approvals-approve-confirm").trigger("click");
      expect(api.POST_ApprovalsBulk).not.toHaveBeenCalled();
    });

    it("a mailbox that can send changes nothing; another hold is named in its words", async () => {
      held(null);
      const wrapper = await mountApprovals();
      await select(wrapper, [1, 3]);
      await byTestid(wrapper, "approvals-approve").trigger("click");
      expect(dialog(wrapper).props("message")).toBe("The mail goes out at once.");
      expect(dialog(wrapper).props("confirmDisabled")).toBe(false);
      held("needs_login");
      const other = await mountApprovals();
      await select(other, [1]);
      await byTestid(other, "approvals-approve").trigger("click");
      expect(dialog(other).props("message")).toContain("The mailbox sales1@greenmail.test needs a login");
    });
  });

  it("the result of a skip says only what happened", async () => {
    api.POST_ApprovalsBulk.mockResolvedValue({ data: { done: [1], failed: {} } });
    const wrapper = await mountApprovals();
    await select(wrapper, [1]);
    await byTestid(wrapper, "approvals-reject").trigger("click");
    wrapper.findComponent('[data-testid="approvals-reject-reason"]').vm.$emit("update:modelValue", "no");
    await byTestid(wrapper, "approvals-reject-submit").trigger("click");
    await flushPromises();
    expect(byTestid(wrapper, "approvals-result").text()).toBe("1 draft skipped.");
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

  // k9 (walk 4): the age in words
  it("the Age column reads today, 1 day, 3 days", async () => {
    api.GET_Approvals.mockResolvedValue(page([row(1, { age_hours: 5 }), row(2, { age_hours: 30 }), row(3, { age_hours: 80 })]));
    const wrapper = await mountApprovals();
    const text = wrapper.get('[data-testid="approvals-table"]').text();
    expect(text).toContain("today");
    expect(text).toContain("1 day");
    expect(text).toContain("3 days");
  });

  it("reject asks for a reason first", async () => {
    api.POST_ApprovalsBulk.mockResolvedValue({ data: { done: [1], failed: {} } });
    const wrapper = await mountApprovals();
    await select(wrapper, [1]);
    await byTestid(wrapper, "approvals-reject").trigger("click");
    // k7 (walk 4): the dialog says the consequence, as Approve does
    expect(byTestid(wrapper, "approvals-reject-consequence").text()).toBe("This mail will not be sent.");
    await byTestid(wrapper, "approvals-reject-submit").trigger("click");
    expect(api.POST_ApprovalsBulk).not.toHaveBeenCalled();
    wrapper.findComponent('[data-testid="approvals-reject-reason"]').vm.$emit("update:modelValue", "wrong tone");
    await byTestid(wrapper, "approvals-reject-submit").trigger("click");
    await flushPromises();
    expect(api.POST_ApprovalsBulk).toHaveBeenCalledWith({ action: "reject", ids: [1], reason: "wrong tone" });
  });

  it("U13: the Mailbox filter shows each mailbox by address and owner; picking one narrows the list", async () => {
    const counts = {
      total: 3,
      by_channel: { "default-europe": 3 },
      by_mailbox: { 1: 2, 2: 1, none: 0 },
      mailboxes: [
        { id: 1, address: "sales1@greenmail.test", user_name: "manager", hold: null },
        { id: 2, address: "sales2@greenmail.test", user_name: "", hold: "paused" },
      ],
    };
    api.GET_Approvals.mockResolvedValue({ data: { count: 1, next: null, results: [row(1, { mailbox_id: 1 })], counts } });
    const wrapper = await mountApprovals();
    const filter = wrapper.findComponent('[data-testid="approvals-mailbox"]');
    expect(filter.props("options")).toEqual([
      { value: "1", label: "sales1@greenmail.test (manager)" },
      { value: "2", label: "sales2@greenmail.test" },
    ]);
    filter.vm.$emit("update:modelValue", "2");
    await flushPromises();
    expect(api.GET_Approvals).toHaveBeenLastCalledWith(expect.objectContaining({ mailbox: "2" }));
  });

  it("U13: without `counts.mailboxes` (an older communicator) the filter falls back to the ids", async () => {
    api.GET_Approvals.mockResolvedValue({
      data: { count: 1, next: null, results: [row(1)], counts: { total: 1, by_channel: {}, by_mailbox: { 4: 1, none: 0 } } },
    });
    const wrapper = await mountApprovals();
    expect(wrapper.findComponent('[data-testid="approvals-mailbox"]').props("options")).toEqual([{ value: "4", label: "4" }]);
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
