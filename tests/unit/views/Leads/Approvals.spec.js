import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { t } from "@/i18n";
import BasicButton from "@/boots/BasicButton/index.vue";
import BasicInput from "@/boots/BasicInput/index.vue";
import SegmentedControl from "@/boots/SegmentedControl/index.vue";
import StatusBadge from "@/boots/StatusBadge/index.vue";

const data = vi.hoisted(() => ({ rows: [], next: null }));
const api = vi.hoisted(() => ({
  GET_Approvals: vi.fn(),
  POST_ApprovalsBulk: vi.fn(),
  GET_ApprovalsLog: vi.fn(),
}));
vi.mock("@/api/communicator/api", () => api);
vi.mock("@/stores/leadsChannel", () => ({ useLeadsChannelStore: () => ({ activeChannelIdx: "default-europe" }) }));

import Approvals from "@/views/Leads/Approvals.vue";
import { useApprovalsStore } from "@/stores/approvals";
import { leadsFrame, setControl } from "./leadsFrame";

const RouterLink = { props: ["to"], template: "<a :data-to='JSON.stringify(to)'><slot /></a>" };
const global = { components: leadsFrame.components, stubs: { ...leadsFrame.stubs, BasicButton, BasicInput, SegmentedControl, StatusBadge, RouterLink, Loader: true, EmptyState: { props: ["title"], template: "<p>{{ title }}</p>" } } };

const row = (id, fields = {}) => ({
  id, channel: "default-europe", thread_id: id, sender_route: "ecomhouse", sender_from: "w@ecom.house", sender_cc: "", company: `Shop ${id}`, subject_ref: `leads.Company:${id}`,
  recipient_email: `p${id}@shop${id}.pl`, template_key: "lead.cold", template_version: 2, subject: `Hello ${id}`, body_preview: `Body ${id}`, version: 1,
  created_at: "2026-11-07T08:00:00Z", age_hours: 5, blocker: "", ...fields,
});
const answer = () => ({ data: { count: data.rows.length, next: data.next, previous: null, counts: { total: data.rows.length, by_channel: { "default-europe": data.rows.length, other: 1 }, by_route: { ecomhouse: 2, entirius: 1 } }, results: data.rows } });
const mountScreen = async () => {
  const wrapper = mount(Approvals, { global, attachTo: document.body });
  await flushPromises();
  return wrapper;
};
const press = async (key, init = {}) => {
  window.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true, ...init }));
  await flushPromises();
};
const ids = (wrapper) => wrapper.findAll('[data-testid="approval-row"]').map((el) => Number(el.attributes("data-id")));

// Q11 (A4): Leads → Approvals.
describe("Leads → Approvals", () => {
  let wrapper;
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
    data.rows = [row(1), row(2, { blocker: "Sender route 'old' is unknown" }), row(3, { channel: "other" })];
    data.next = null;
    api.GET_Approvals.mockImplementation(() => Promise.resolve(answer()));
    api.POST_ApprovalsBulk.mockImplementation((action, idList) => Promise.resolve({ data: { id: 1, action, done: idList, failed: {} } }));
    api.GET_ApprovalsLog.mockResolvedValue({ data: { results: [], next: null } });
  });
  afterEach(() => wrapper?.unmount());

  it("lists drafts of every channel with recipient, route, template, age and the blocker reason", async () => {
    wrapper = await mountScreen();
    expect(api.GET_Approvals).toHaveBeenCalledWith({ page: 1, page_size: 50 });
    expect(ids(wrapper)).toEqual([1, 2, 3]);
    const first = wrapper.get('[data-testid="approval-row"][data-id="1"]');
    expect(first.get('[data-testid="approval-to"]').text()).toBe("p1@shop1.pl");
    expect(first.get('[data-testid="approval-route"]').text()).toBe("ecomhouse");
    expect(first.get('[data-testid="approval-template"]').text()).toContain("lead.cold v2");
    expect(first.get('[data-testid="approval-age"]').text()).toBe("5 h");
    expect(first.find('[data-testid="approval-blocker"]').exists()).toBe(false);
    expect(wrapper.get('[data-testid="approval-row"][data-id="2"] [data-testid="approval-blocker"]').text()).toContain("Sender route 'old' is unknown");
    expect(wrapper.get('[data-testid="approval-row"][data-id="3"] [data-testid="approval-channel"]').text()).toBe("other");
  });

  it("filters go to the server: channel, route, template, age and search", async () => {
    wrapper = await mountScreen();
    await setControl(wrapper, "approvals-channel", "other");
    await setControl(wrapper, "approvals-route", "entirius");
    await setControl(wrapper, "approvals-age", "24");
    await wrapper.get('[data-testid="approvals-template"] input').setValue("lead.cold");
    await wrapper.get('[data-testid="approvals-search"] input').setValue("anna");
    await new Promise((resolve) => setTimeout(resolve, 400));
    await flushPromises();
    expect(api.GET_Approvals).toHaveBeenLastCalledWith({ page: 1, page_size: 50, q: "anna", channel: "other", sender_route: "entirius", template: "lead.cold", min_age_hours: 24 });
    // the options keep everything seen so far, with the counts of the answer
    const options = wrapper.getComponent('[data-testid="approvals-channel"]').props("options");
    expect(options.map((option) => option.value)).toEqual(["__all__", "default-europe", "other"]);
  });

  it("select all takes only the rows that can be approved; Approve sends those ids, the bar counts the rest", async () => {
    wrapper = await mountScreen();
    wrapper.getComponent('[data-testid="approvals-select-all"]').vm.$emit("update:modelValue", true);
    await flushPromises();
    expect(wrapper.get('[data-testid="approvals-selected"]').text()).toContain("2");
    wrapper.getComponent('[data-testid="approval-row"][data-id="2"] [data-testid="approval-select"]').vm.$emit("update:modelValue", true);
    await flushPromises();
    expect(wrapper.find('[data-testid="approvals-blocked-note"]').exists()).toBe(true);
    await wrapper.get('[data-testid="approvals-approve"]').trigger("click");
    await flushPromises();
    expect(api.POST_ApprovalsBulk).toHaveBeenCalledWith("approve", [1, 3], "");
    expect(wrapper.get('[data-testid="approvals-result"]').text()).toBe(t("leads.approvals.done_approve", { count: 2 }));
    expect(useApprovalsStore().total).toBe(3); // the nav badge was read again
  });

  it("rejecting asks first and sends every selected id, even a blocked one, with the reason", async () => {
    wrapper = await mountScreen();
    wrapper.getComponent('[data-testid="approval-row"][data-id="2"] [data-testid="approval-select"]').vm.$emit("update:modelValue", true);
    await flushPromises();
    expect(wrapper.get('[data-testid="approvals-approve"]').attributes("disabled")).toBeDefined();
    await wrapper.get('[data-testid="approvals-reject"]').trigger("click");
    expect(api.POST_ApprovalsBulk).not.toHaveBeenCalled();
    await wrapper.get('[data-testid="approvals-reject-confirm"]').trigger("click");
    await flushPromises();
    expect(api.POST_ApprovalsBulk).toHaveBeenCalledWith("reject", [2], "");
  });

  it("a refused id is named with its reason on the row and in the list; the others went through", async () => {
    api.POST_ApprovalsBulk.mockResolvedValue({ data: { id: 2, action: "approve", done: [1], failed: { 3: "no longer waiting" } } });
    wrapper = await mountScreen();
    wrapper.getComponent('[data-testid="approvals-select-all"]').vm.$emit("update:modelValue", true);
    await flushPromises();
    await wrapper.get('[data-testid="approvals-approve"]').trigger("click");
    await flushPromises();
    expect(wrapper.get('[data-testid="approvals-result"]').text()).toBe(t("leads.approvals.done_approve", { count: 1 }));
    expect(wrapper.get('[data-testid="approvals-failed"]').text()).toContain("#3: no longer waiting");
    expect(wrapper.get('[data-testid="approval-row"][data-id="3"] [data-testid="approval-failure"]').text()).toBe("no longer waiting");
  });

  it("more than 100 ids go in several calls", async () => {
    data.rows = Array.from({ length: 120 }, (_, i) => row(i + 1));
    wrapper = await mountScreen();
    wrapper.getComponent('[data-testid="approvals-select-all"]').vm.$emit("update:modelValue", true);
    await flushPromises();
    await wrapper.get('[data-testid="approvals-approve"]').trigger("click");
    await flushPromises();
    expect(api.POST_ApprovalsBulk.mock.calls.map((call) => call[1].length)).toEqual([100, 20]);
    expect(wrapper.get('[data-testid="approvals-result"]').text()).toBe(t("leads.approvals.done_approve", { count: 120 }));
  });

  it("keyboard: j moves, x selects, a approves the selection, Enter opens the preview; typing is left alone", async () => {
    wrapper = await mountScreen();
    expect(wrapper.get('[data-testid="approval-row"][data-id="1"]').attributes("aria-current")).toBe("true");
    await press("j");
    expect(wrapper.get('[data-testid="approval-row"][data-id="2"]').attributes("aria-current")).toBe("true");
    await press("k");
    await press("Enter");
    expect(wrapper.get('[data-testid="approval-preview"]').text()).toBe("Body 1");
    await press("x");
    expect(wrapper.get('[data-testid="approvals-selected"]').text()).toContain("1");
    await press("a");
    expect(api.POST_ApprovalsBulk).toHaveBeenCalledWith("approve", [1], "");
  });

  it("keyboard: a on the row under the cursor approves just that row; r opens the reject dialog", async () => {
    wrapper = await mountScreen();
    await press("a");
    expect(api.POST_ApprovalsBulk).toHaveBeenCalledWith("approve", [1], "");
    api.POST_ApprovalsBulk.mockClear();
    await press("r");
    expect(api.POST_ApprovalsBulk).not.toHaveBeenCalled();
    expect(wrapper.find('[data-testid="approvals-reject-confirm"]').exists()).toBe(true);
  });

  it("a key typed in the search field does nothing", async () => {
    wrapper = await mountScreen();
    const input = wrapper.get('[data-testid="approvals-search"] input').element;
    input.dispatchEvent(new KeyboardEvent("keydown", { key: "a", bubbles: true }));
    await flushPromises();
    expect(api.POST_ApprovalsBulk).not.toHaveBeenCalled();
  });

  it("opens the draft in Review only for the channel on screen", async () => {
    wrapper = await mountScreen();
    expect(wrapper.find('[data-testid="approval-row"][data-id="1"] [data-testid="approval-open"]').attributes("data-to")).toContain("LeadsReview");
    expect(wrapper.find('[data-testid="approval-row"][data-id="3"] [data-testid="approval-open"]').exists()).toBe(false);
  });

  it("Load more appends the next page", async () => {
    data.next = "http://x/?page=2";
    wrapper = await mountScreen();
    api.GET_Approvals.mockResolvedValue({ data: { count: 4, next: null, counts: { total: 4, by_channel: {}, by_route: {} }, results: [row(4)] } });
    await wrapper.get('[data-testid="approvals-more"]').trigger("click");
    await flushPromises();
    expect(api.GET_Approvals).toHaveBeenLastCalledWith({ page: 2, page_size: 50 });
    expect(ids(wrapper)).toEqual([1, 2, 3, 4]);
  });

  it("an empty queue says so; a failed load shows the error", async () => {
    data.rows = [];
    wrapper = await mountScreen();
    expect(wrapper.get('[data-testid="approvals-empty"]').text()).toBe("leads.approvals.empty") // template $t is the key in unit tests;
    api.GET_Approvals.mockRejectedValue({ response: { data: { detail: "down" } } });
    await wrapper.get('[data-testid="approvals-refresh"]').trigger("click");
    await flushPromises();
    expect(wrapper.get('[data-testid="approvals-error"]').text()).toBe("down");
  });

  it("the log view lists who did what, with the ids that failed", async () => {
    api.GET_ApprovalsLog.mockResolvedValue({
      data: { next: null, results: [{ id: 1, user_id: 4, action: "approve", reason: "", requested: 3, done_ids: [1, 2], failed: { 3: "no longer waiting" }, created_at: "2026-11-07T09:00:00Z" }] },
    });
    wrapper = await mountScreen();
    await wrapper.get('[data-testid="approvals-view-log"]').trigger("click");
    await flushPromises();
    const entry = wrapper.get('[data-testid="approvals-log-row"]');
    expect(entry.attributes("data-action")).toBe("approve");
    expect(entry.text()).toContain('leads.approvals.log_counts::{"done":2,"requested":3}');
    expect(entry.text()).toContain("#3: no longer waiting");
  });
});
