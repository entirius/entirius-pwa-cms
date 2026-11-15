import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { mount, flushPromises, enableAutoUnmount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";

const draft = { id: 5, status: "review_required", subject: "Audit", body_text: "Hello", thread: { subject_ref: "leads.Company:153", recipient_email: "anna@example-shop-1.test" }, render_context: { company_name: "Example Shop 1", hooks: [] } };
const api = vi.hoisted(() => ({
  GET_ReviewList: vi.fn(),
  GET_ReviewMessage: vi.fn(),
  GET_ReviewNext: vi.fn(),
  POST_ReviewAccept: vi.fn(),
  POST_ReviewSkip: vi.fn(),
  POST_ReviewSkipCompany: vi.fn(),
  POST_ReviewRewrite: vi.fn(),
  POST_ReviewEdit: vi.fn(),
  GET_WaitingMessages: vi.fn(),
  GET_Approvals: vi.fn(),
  GET_Replies: vi.fn(),
  GET_Conversations: vi.fn(),
  GET_Thread: vi.fn(),
}));
vi.mock("@/api/communicator/api", () => api);
vi.mock("@/stores/munin", () => ({ useMuninStore: () => ({ isModuleEnabled: () => true, isModuleAtLeast: () => false }) }));
vi.mock("@/stores/notify", () => ({ useNotifyStore: () => ({ spawnNotification: vi.fn() }) }));
const desk = vi.hoisted(() => ({ on: false }));
vi.mock("@/composables/useIsDesktop", async () => {
  const { ref } = await import("vue");
  return { useIsDesktop: () => ref(desk.on) };
});
vi.mock("vue-router", async () => {
  const { reactive } = await import("vue");
  const route = reactive({ params: { id: "5" } });
  return {
    useRoute: () => route,
    useRouter: () => ({ replace: vi.fn() }),
    onBeforeRouteLeave: () => {},
    onBeforeRouteUpdate: () => {},
  };
});

import Review from "@/views/Leads/Review.vue";
import BasicButton from "@/boots/BasicButton/index.vue";
import BasicMenu from "@/boots/BasicMenu/index.vue";
import { leadsFrame } from "./leadsFrame";
import en from "@/i18n/locales/en.json";
import pl from "@/i18n/locales/pl.json";

enableAutoUnmount(afterEach);
afterEach(() => vi.unstubAllGlobals());

const KEY = "cms_leads_swipe_intro_seen";
// An in-memory storage: the test never depends on the runtime's own localStorage (Node 25 ships one without methods).
const memoryStorage = () => {
  const items = new Map();
  return {
    getItem: (key) => (items.has(key) ? items.get(key) : null),
    setItem: (key, value) => items.set(key, String(value)),
    removeItem: (key) => items.delete(key),
    clear: () => items.clear(),
  };
};
const mountReview = async () => {
  const wrapper = mount(Review, {
    global: {
      components: { ...leadsFrame.components, BasicMenu },
      stubs: {
        ...leadsFrame.stubs,
        BasicButton,
        IntelCard: true,
        EmptyState: { props: ["title"], template: "<div><slot /></div>" },
        RouterLink: { template: "<a><slot /></a>" },
      },
    },
  });
  await flushPromises();
  return wrapper;
};
const intro = (wrapper) => wrapper.find('[data-testid="review-swipe-intro"]');

// U8 (test B): on a phone the first draft says once, plainly, that it can be swiped — Skip to the left, Send to the right.
describe("Leads Review — swipe intro", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("localStorage", memoryStorage());
    desk.on = false;
    setActivePinia(createPinia());
    api.GET_ReviewMessage.mockResolvedValue(draft);
    api.GET_ReviewList.mockResolvedValue({ data: { results: [{ id: 5 }] } });
    api.GET_Conversations.mockResolvedValue({ data: { results: [] } });
    api.GET_ReviewNext.mockRejectedValue({ response: { status: 404 } });
    api.GET_WaitingMessages.mockResolvedValue([]);
  });

  it("a phone shows the intro on the first draft with both directions", async () => {
    const wrapper = await mountReview();
    expect(intro(wrapper).exists()).toBe(true);
    expect(wrapper.get('[data-testid="review-swipe-intro-left"]').text()).toContain("leads.review.swipe_intro_left");
    expect(wrapper.get('[data-testid="review-swipe-intro-right"]').text()).toContain("leads.review.swipe_intro_right");
  });

  it("Got it hides it for good in this browser", async () => {
    const wrapper = await mountReview();
    await wrapper.get('[data-testid="review-swipe-intro-ok"]').trigger("click");
    expect(intro(wrapper).exists()).toBe(false);
    expect(localStorage.getItem(KEY)).toBe("1");
    const again = await mountReview();
    expect(intro(again).exists()).toBe(false);
  });

  it("the first swipe counts as seen", async () => {
    api.POST_ReviewSkip.mockResolvedValue({ data: {} });
    const wrapper = await mountReview();
    // A skip may wait for its Undo window (U1) before it reaches the service.
    vi.useFakeTimers();
    try {
      const card = wrapper.get('[data-testid="review-draft"]');
      await card.trigger("pointerdown", { pointerType: "touch", clientX: 200, clientY: 0 });
      await card.trigger("pointermove", { pointerType: "touch", clientX: 60, clientY: 0 });
      await card.trigger("pointerup", { pointerType: "touch", clientX: 60, clientY: 0 });
      expect(localStorage.getItem(KEY)).toBe("1");
      vi.advanceTimersByTime(4000);
      await flushPromises();
      expect(api.POST_ReviewSkip).toHaveBeenCalledWith(5);
    } finally {
      vi.useRealTimers();
    }
  });

  it("a desk never shows it", async () => {
    desk.on = true;
    const wrapper = await mountReview();
    expect(intro(wrapper).exists()).toBe(false);
  });

  it.each([
    ["en", en, "Skip", "Send"],
    ["pl", pl, "Pomiń", "Wyślij"],
  ])("%s: the intro reads the same words as the Skip and Send buttons", (_, locale, left, right) => {
    const review = locale.leads.review;
    expect(review.swipe_intro_title).toBeTruthy();
    expect(review.swipe_intro_ok).toBeTruthy();
    expect([review.swipe_intro_left, review.swipe_intro_right]).toEqual([left, right]);
  });
});
