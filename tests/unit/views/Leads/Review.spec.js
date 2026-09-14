import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import { reactive } from "vue";

const draft = { id: 5, subject: "Audit", body_text: "Hello", thread: { subject_ref: "leads.Company:153", recipient_email: "anna@example-shop-1.test" }, render_context: { company_name: "Example Shop 1", hooks: [] } };
const api = vi.hoisted(() => ({
  GET_ReviewMessage: vi.fn(),
  GET_ReviewNext: vi.fn(),
  POST_ReviewAccept: vi.fn(),
  POST_ReviewSkip: vi.fn(),
  POST_ReviewSkipCompany: vi.fn(),
  POST_ReviewRewrite: vi.fn(),
  POST_ReviewEdit: vi.fn(),
}));
vi.mock("@/api/communicator/api", () => api);
const munin = vi.hoisted(() => ({ toolboxStatus: "", isModuleEnabled: () => true }));
vi.mock("@/stores/munin", () => ({ useMuninStore: () => munin }));
const spawnNotification = vi.fn();
vi.mock("@/stores/notify", () => ({ useNotifyStore: () => ({ spawnNotification }) }));
const route = vi.hoisted(() => ({ params: { id: "5" } }));
const replace = vi.fn();
vi.mock("vue-router", () => ({ useRoute: () => route, useRouter: () => ({ replace }) }));

import Review from "@/views/Leads/Review.vue";
import ReviewActions from "@/views/Leads/ReviewActions.vue";

const ok = (data = {}) => Promise.resolve({ data });
const mountReview = async () => {
  const wrapper = mount(Review, {
    global: { directives: { out: {} }, stubs: { BackBar: true, IntelCard: true, RouterLink: { template: "<a><slot /></a>" } } },
  });
  await flushPromises();
  return wrapper;
};

describe("Leads Review", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.GET_ReviewMessage.mockResolvedValue(draft);
    api.GET_ReviewNext.mockRejectedValue({ response: { status: 404 } });
    munin.toolboxStatus = "";
  });
  afterEach(() => vi.useRealTimers());

  it("Send accepts, shows the slot, then loads the next draft", async () => {
    vi.useFakeTimers();
    api.POST_ReviewAccept.mockReturnValue(ok({ status: "approved", scheduled_at: "2026-09-21T08:07:00Z" }));
    const wrapper = await mountReview();
    await wrapper.get('[data-testid="review-send"]').trigger("click");
    await flushPromises();
    expect(api.POST_ReviewAccept).toHaveBeenCalledWith(5);
    expect(wrapper.get('[data-testid="review-scheduled"]').text()).toMatch(/^Scheduled \d\d:\d\d$/);
    vi.advanceTimersByTime(2000);
    await flushPromises();
    expect(api.GET_ReviewNext).toHaveBeenCalled();
    expect(replace).toHaveBeenCalledWith({ name: "LeadsInbox" });
  });

  it("Not now skips and moves to the next draft", async () => {
    api.POST_ReviewSkip.mockReturnValue(ok());
    api.GET_ReviewNext.mockResolvedValue({ data: { id: 6 } });
    const wrapper = await mountReview();
    await wrapper.get('[data-testid="review-skip"]').trigger("click");
    await flushPromises();
    expect(api.POST_ReviewSkip).toHaveBeenCalledWith(5);
    expect(replace).toHaveBeenCalledWith({ name: "LeadsReview", params: { id: 6 } });
  });

  it("rewrite with a note calls rewrite/ and opens the new version", async () => {
    api.POST_ReviewRewrite.mockReturnValue(ok({ id: 9 }));
    const wrapper = await mountReview();
    wrapper.findComponent(ReviewActions).vm.$emit("rewrite");
    await flushPromises();
    await wrapper.get('[data-testid="rewrite-notes"]').setValue("shorter");
    await wrapper.get('[data-testid="rewrite-submit"]').trigger("click");
    await flushPromises();
    expect(api.POST_ReviewRewrite).toHaveBeenCalledWith(5, { notes: "shorter" });
    expect(replace).toHaveBeenCalledWith({ name: "LeadsReview", params: { id: 9 } });
  });

  it("edit saves subject and body through edit/", async () => {
    api.POST_ReviewEdit.mockReturnValue(ok({ id: 10 }));
    const wrapper = await mountReview();
    wrapper.findComponent(ReviewActions).vm.$emit("edit");
    await flushPromises();
    await wrapper.get('[data-testid="edit-subject"]').setValue("New subject");
    await wrapper.get('[data-testid="edit-save"]').trigger("click");
    await flushPromises();
    expect(api.POST_ReviewEdit).toHaveBeenCalledWith(5, { subject: "New subject", body_text: "Hello" });
  });

  it("skip company calls skip-company/", async () => {
    api.POST_ReviewSkipCompany.mockReturnValue(ok());
    const wrapper = await mountReview();
    wrapper.findComponent(ReviewActions).vm.$emit("skip-company");
    await flushPromises();
    expect(api.POST_ReviewSkipCompany).toHaveBeenCalledWith(5);
  });

  it("more menu holds rewrite, edit and skip company; rewrite is disabled without a toolbox", async () => {
    munin.toolboxStatus = "unconfigured";
    const wrapper = await mountReview();
    await wrapper.get('[data-testid="review-more"]').trigger("click");
    expect(wrapper.get('[data-testid="review-rewrite"]').attributes("disabled")).toBeDefined();
    expect(wrapper.find('[data-testid="review-edit"]').exists()).toBe(true);
    expect(wrapper.get('[data-testid="toolbox-banner"]').text()).toContain("Entirius AI Toolbox");
  });

  it("a 409 tells the reviewer and moves on", async () => {
    api.POST_ReviewAccept.mockRejectedValue({ response: { status: 409 } });
    const wrapper = await mountReview();
    await wrapper.get('[data-testid="review-send"]').trigger("click");
    await flushPromises();
    expect(spawnNotification).toHaveBeenCalled();
    expect(replace).toHaveBeenCalledWith({ name: "LeadsInbox" });
  });

  it("swipe right on the draft sends", async () => {
    api.POST_ReviewAccept.mockReturnValue(ok({ scheduled_at: null }));
    const wrapper = await mountReview();
    const card = wrapper.get('[data-testid="review-draft"]');
    await card.trigger("pointerdown", { clientX: 0, clientY: 0 });
    await card.trigger("pointermove", { clientX: 120, clientY: 0 });
    await card.trigger("pointerup");
    await flushPromises();
    expect(api.POST_ReviewAccept).toHaveBeenCalledWith(5);
  });
});
