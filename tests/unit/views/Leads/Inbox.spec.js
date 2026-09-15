import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";

const lists = vi.hoisted(() => ({ review_required: [], approved: [], scheduled: [] }));
const GET_ReviewList = vi.hoisted(() => vi.fn(({ status }) => Promise.resolve({ data: { results: lists[status] } })));
vi.mock("@/api/communicator/api", () => ({ GET_ReviewList }));

import Inbox from "@/views/Leads/Inbox.vue";
import { useLeadsReviewStore } from "@/stores/leadsReview";
import { channelTimeZone, formatTime } from "@/utils/leadsTime";

const draft = { id: 5, subject: "Your shop audit", created_at: "2026-09-21T08:00:00Z", thread: { recipient_name: "Anna" }, render_context: { company_name: "Example Shop 1" } };
const inMinutes = (minutes) => new Date(Date.now() + minutes * 60000).toISOString();
const mountInbox = () =>
  mount(Inbox, { global: { mocks: { $route: { params: {} } }, stubs: { EmptyState: { props: ["title", "message"], template: "<div data-testid='inbox-empty'>{{ title }} {{ message }}<slot /></div>" }, RouterLink: { template: "<a><slot /></a>" } } } });

describe("Leads Inbox", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    GET_ReviewList.mockClear();
    lists.review_required = [];
    lists.approved = [];
    lists.scheduled = [];
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
    lists.approved = [{ id: 1, scheduled_at: at }, { id: 2, scheduled_at: inMinutes(120) }];
    const wrapper = mountInbox();
    await flushPromises();
    expect(wrapper.get('[data-testid="inbox-empty"]').text()).toContain(`2 scheduled, next goes out at ${time}`);
    expect(wrapper.find('[data-testid="inbox-refresh"]').exists()).toBe(true);
  });

  it("a mail waiting for its window on another day says scheduled for <day> <HH:MM>", async () => {
    channelTimeZone.value = "UTC";
    lists.approved = [{ id: 1, scheduled_at: "2099-01-02T08:00:00Z" }];
    const wrapper = mountInbox();
    await flushPromises();
    expect(wrapper.get('[data-testid="inbox-summary"]').text()).toContain(`"time":"02.01 08:00"`);
    expect(wrapper.find('[data-testid="inbox-held"]').exists()).toBe(false);
    channelTimeZone.value = undefined;
  });

  it("a slot past the send beat says the send window or the daily cap holds it", async () => {
    lists.scheduled = [{ id: 1, scheduled_at: inMinutes(-7) }];
    const wrapper = mountInbox();
    await flushPromises();
    expect(wrapper.get('[data-testid="inbox-empty"]').text()).toContain("1 scheduled, waiting for the send window or the daily cap");
    expect(wrapper.find('[data-testid="inbox-held"]').exists()).toBe(true);
  });

  it("empty queue with nothing scheduled still offers an action", async () => {
    const wrapper = mountInbox();
    await flushPromises();
    expect(wrapper.get('[data-testid="inbox-empty"]').text()).toContain("Nothing scheduled");
    expect(wrapper.find('[data-testid="inbox-refresh"]').exists()).toBe(true);
  });

  it("reloads its three lists after a review action, not on navigation", async () => {
    const wrapper = mountInbox();
    await flushPromises();
    expect(GET_ReviewList).toHaveBeenCalledTimes(3);
    await wrapper.setProps({});
    await flushPromises();
    expect(GET_ReviewList).toHaveBeenCalledTimes(3);
    useLeadsReviewStore().queueChanged();
    await flushPromises();
    expect(GET_ReviewList).toHaveBeenCalledTimes(6);
  });
});
