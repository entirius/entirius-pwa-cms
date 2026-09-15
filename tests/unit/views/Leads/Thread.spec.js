import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";

// Three threads of the company, newest first (the list order of the API).
const summaries = [
  { id: 9, status: "open", recipient_email: "anna@shop.test", last_message_at: "2026-09-23T08:00:00Z" },
  { id: 8, status: "replied", recipient_email: "jan@shop.test", last_message_at: "2026-09-22T08:00:00Z" },
  { id: 7, status: "closed", recipient_email: "jan@shop.test", last_message_at: "2026-09-21T08:00:00Z" },
];
const detail = (id) => ({
  id,
  status: summaries.find((s) => s.id === id).status,
  timeline: [{ at: "2026-09-21T08:00:00Z", direction: "out", status: "sent", subject: `Subject ${id}`, body_text: "Hi" }],
  optouts: [],
});

const api = vi.hoisted(() => ({
  GET_Threads: vi.fn(),
  GET_ThreadWithOptouts: vi.fn(),
  GET_Replies: vi.fn(),
  GET_WaitingMessages: vi.fn(),
  POST_ConfirmOptout: vi.fn(),
}));
vi.mock("@/api/communicator/api", () => api);
vi.mock("@/api/leads/api", () => ({
  GET_Company: () => Promise.resolve({ data: { id: 42, name: "Example Shop 5" } }),
  GET_CompanyActivities: () => Promise.resolve({ data: { results: [{ id: 1, created_at: "2026-09-21T08:00:00Z", message: "stage new -> contacted" }] } }),
}));
vi.mock("@/stores/munin", () => ({ useMuninStore: () => ({ toolboxStatus: "", isModuleEnabled: () => false }) }));
vi.mock("@/stores/notify", () => ({ useNotifyStore: () => ({ spawnNotification: vi.fn() }) }));
vi.mock("vue-router", () => ({ useRoute: () => ({ params: { id: "42" } }), useRouter: () => ({}) }));

import Thread from "@/views/Leads/Thread.vue";

const stubs = { BackBar: true, Loader: true, ToolboxBanner: true };
const mountThread = (props = {}) => mount(Thread, { props, global: { stubs } });

beforeEach(() => {
  vi.clearAllMocks();
  api.GET_Threads.mockResolvedValue({ data: { count: 3, next: null, results: summaries } });
  api.GET_ThreadWithOptouts.mockImplementation((id) => Promise.resolve(detail(id)));
  api.GET_Replies.mockResolvedValue({ data: { results: [] } });
  api.GET_WaitingMessages.mockResolvedValue([]);
});

describe("Leads Thread", () => {
  it("renders only the newest thread under its subject header", async () => {
    const wrapper = mountThread();
    await flushPromises();
    expect(api.GET_Threads).toHaveBeenCalledWith({ subject_ref: "leads.Company:42", page_size: 20 });
    expect(api.GET_ThreadWithOptouts).toHaveBeenCalledTimes(1);
    expect(api.GET_ThreadWithOptouts).toHaveBeenCalledWith(9);
    expect(wrapper.get('[data-testid="thread-subject"]').text()).toContain("Subject 9");
    expect(wrapper.findAll('[data-testid="timeline-out"]')).toHaveLength(1);
    expect(wrapper.get('[data-testid="earlier-toggle"]').text()).toContain('leads.thread.earlier::{"count":2}');
    expect(wrapper.find('[data-testid="earlier-thread"]').exists()).toBe(false);
  });

  it("the expander lists older threads grouped; opening one loads exactly its conversation", async () => {
    const wrapper = mountThread();
    await flushPromises();
    await wrapper.get('[data-testid="earlier-toggle"]').trigger("click");
    const groups = wrapper.findAll('[data-testid="earlier-thread"]');
    expect(groups).toHaveLength(2);
    expect(api.GET_ThreadWithOptouts).toHaveBeenCalledTimes(1);

    await groups[1].get('[data-testid="earlier-thread-toggle"]').trigger("click");
    await flushPromises();
    expect(api.GET_ThreadWithOptouts).toHaveBeenCalledTimes(2);
    expect(api.GET_ThreadWithOptouts).toHaveBeenLastCalledWith(7);
    expect(groups[1].get('[data-testid="earlier-thread-subject"]').text()).toBe("Subject 7");
    expect(groups[1].findAll('[data-testid="timeline-out"]')).toHaveLength(1);
    expect(groups[0].find('[data-testid="thread-timeline"]').exists()).toBe(false);
  });

  it("further older threads load with one request for the next list page", async () => {
    api.GET_Threads.mockResolvedValueOnce({ data: { count: 23, next: "page2", results: summaries } });
    api.GET_Threads.mockResolvedValueOnce({ data: { count: 23, next: null, results: [{ ...summaries[2], id: 30 }] } });
    const wrapper = mountThread();
    await flushPromises();
    await wrapper.get('[data-testid="earlier-toggle"]').trigger("click");
    await wrapper.get('[data-testid="earlier-more"]').trigger("click");
    await flushPromises();
    expect(api.GET_Threads).toHaveBeenCalledTimes(2);
    expect(api.GET_Threads).toHaveBeenLastCalledWith({ subject_ref: "leads.Company:42", page: 2, page_size: 20 });
    expect(wrapper.findAll('[data-testid="earlier-thread"]')).toHaveLength(3);
    expect(wrapper.find('[data-testid="earlier-more"]').exists()).toBe(false);
  });

  it("an undecided opt-out in an older thread badges the expander", async () => {
    api.GET_Replies.mockResolvedValue({
      data: { results: [{ id: 5, thread_id: 8, optout_confirmed_at: null }, { id: 6, thread_id: 7, optout_confirmed_at: "x" }] },
    });
    const wrapper = mountThread();
    await flushPromises();
    expect(wrapper.get('[data-testid="earlier-optout-badge"]').text()).toContain('"count":1');
  });

  it("the phone card keeps activities apart from the mail, the desktop timeline tab has none", async () => {
    const phone = mountThread({ desktopHint: true });
    const desktop = mountThread();
    await flushPromises();
    expect(phone.get('[data-testid="thread-activity"]').text()).toContain("stage new -> contacted");
    expect(phone.get('[data-testid="thread-timeline"]').text()).not.toContain("stage new");
    expect(desktop.find('[data-testid="thread-activity"]').exists()).toBe(false);
    expect(phone.get('[data-testid="thread-desktop-hint"]').text()).toBe("leads.thread.desktop_hint");
  });
});
