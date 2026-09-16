import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";

const lists = vi.hoisted(() => ({ review_required: [], waiting: [] }));
const GET_ReviewList = vi.hoisted(() => vi.fn(({ status }) => Promise.resolve({ data: { results: lists[status] } })));
const GET_WaitingMessages = vi.hoisted(() => vi.fn(() => Promise.resolve(lists.waiting)));
vi.mock("@/api/communicator/api", () => ({ GET_ReviewList, GET_WaitingMessages }));

import Inbox from "@/views/Leads/Inbox.vue";
import { useLeadsReviewStore } from "@/stores/leadsReview";
import { applyPolicy, channelTimeZone, formatTime } from "@/utils/leadsTime";

const draft = { id: 5, subject: "Your shop audit", created_at: "2026-09-21T08:00:00Z", thread: { recipient_name: "Anna" }, render_context: { company_name: "Example Shop 1" } };
const inMinutes = (minutes) => new Date(Date.now() + minutes * 60000).toISOString();
const mountInbox = () =>
  mount(Inbox, { global: { mocks: { $route: { params: {} } }, stubs: { EmptyState: { props: ["title", "message"], template: "<div data-testid='inbox-empty'>{{ title }} {{ message }}<slot /></div>" }, RouterLink: { template: "<a><slot /></a>" } } } });

describe("Leads Inbox", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    GET_ReviewList.mockClear();
    GET_WaitingMessages.mockClear();
    lists.review_required = [];
    lists.waiting = [];
  });

  it("lists drafts to review", async () => {
    lists.review_required = [draft];
    const wrapper = mountInbox();
    await flushPromises();
    expect(wrapper.findAll('[data-testid="inbox-item"]')).toHaveLength(1);
    expect(wrapper.text()).toContain("Example Shop 1");
  });

  it("empty queue says how many wait and when the next goes out", async () => {
    const at = inMinutes(60);
    const time = formatTime(at);
    lists.waiting = [{ id: 1, next_slot: at }, { id: 2, next_slot: inMinutes(120) }];
    const wrapper = mountInbox();
    await flushPromises();
    expect(wrapper.get('[data-testid="inbox-empty"]').text()).toContain(`2 scheduled, goes out at ${time}`);
    expect(wrapper.find('[data-testid="inbox-refresh"]').exists()).toBe(true);
  });

  it("a mail waiting for its window on another day says goes out at <day> <HH:MM>", async () => {
    channelTimeZone.value = "UTC";
    lists.review_required = [draft];
    lists.waiting = [{ id: 1, next_slot: "2099-01-02T08:00:00Z" }];
    const wrapper = mountInbox();
    await flushPromises();
    expect(wrapper.get('[data-testid="inbox-next"]').text()).toContain(`"state":"goes out at 02.01 08:00"`);
    channelTimeZone.value = undefined;
  });

  // FIX-17a items 2-4: a slot the send run has already passed is a state, never a time that moves every minute.
  it("a slot at the current minute is due, and a used-up cap says so", async () => {
    lists.review_required = [draft];
    lists.waiting = [{ id: 1, next_slot: inMinutes(-7) }];
    const wrapper = mountInbox();
    await flushPromises();
    expect(wrapper.get('[data-testid="inbox-next"]').text()).toContain("due — waiting for the send run");
    applyPolicy({ sent_today: 10, daily_cap: 10 });
    lists.review_required = [];
    useLeadsReviewStore().queueChanged();
    await flushPromises();
    expect(wrapper.get('[data-testid="inbox-empty"]').text()).toContain(
      "1 scheduled, daily cap reached — nothing else goes out today"
    );
    applyPolicy(null);
  });

  // FIX-17 item 4: two drafts to the same company differ by recipient and by where they sit in the queue.
  it("a row names the recipient and its place in the queue", async () => {
    lists.review_required = [
      { ...draft, id: 5, thread: { recipient_email: "anna@example-shop-5.test" } },
      { ...draft, id: 6, thread: { recipient_email: "jan@example-shop-5.test" } },
    ];
    const wrapper = mountInbox();
    await flushPromises();
    const rows = wrapper.findAll('[data-testid="inbox-item"]');
    expect(rows[0].get('[data-testid="inbox-item-to"]').text()).toContain("anna@example-shop-5.test");
    expect(rows[1].get('[data-testid="inbox-item-to"]').text()).toContain("jan@example-shop-5.test");
    expect(rows[1].get('[data-testid="inbox-item-position"]').text()).toContain('{"index":2,"count":2}');
  });

  // FIX-17 item 8: the empty Inbox says it once — the summary line is not repeated above the empty state.
  it("an empty queue drops the summary line and publishes the count", async () => {
    lists.waiting = [{ id: 1, next_slot: inMinutes(60) }];
    const wrapper = mountInbox();
    await flushPromises();
    expect(wrapper.find('[data-testid="inbox-summary"]').exists()).toBe(false);
    expect(useLeadsReviewStore().count).toBe(0);
    lists.review_required = [draft];
    useLeadsReviewStore().queueChanged();
    await flushPromises();
    expect(wrapper.find('[data-testid="inbox-summary"]').exists()).toBe(true);
    expect(useLeadsReviewStore().count).toBe(1);
  });

  it("empty queue with nothing scheduled still offers an action", async () => {
    const wrapper = mountInbox();
    await flushPromises();
    expect(wrapper.get('[data-testid="inbox-empty"]').text()).toContain("Nothing scheduled");
    expect(wrapper.find('[data-testid="inbox-refresh"]').exists()).toBe(true);
  });

  it("reloads the queue and the waiting mails after a review action, not on navigation", async () => {
    const wrapper = mountInbox();
    await flushPromises();
    expect(GET_ReviewList).toHaveBeenCalledTimes(1);
    expect(GET_WaitingMessages).toHaveBeenCalledTimes(1);
    await wrapper.setProps({});
    await flushPromises();
    expect(GET_ReviewList).toHaveBeenCalledTimes(1);
    useLeadsReviewStore().queueChanged();
    await flushPromises();
    expect(GET_ReviewList).toHaveBeenCalledTimes(2);
    expect(GET_WaitingMessages).toHaveBeenCalledTimes(2);
  });
});
