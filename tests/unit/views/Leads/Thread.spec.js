import { describe, it, expect, vi } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";

const api = vi.hoisted(() => ({
  GET_Threads: vi.fn(() => Promise.resolve({ data: { results: [{ id: 7 }, { id: 9 }] } })),
  GET_Thread: vi.fn((id) =>
    Promise.resolve({ data: { timeline: [{ at: `2026-09-2${id === 7 ? 1 : 2}T08:00:00Z`, direction: "out", subject: `T${id}` }] } })
  ),
  GET_Replies: vi.fn(() => Promise.resolve({ data: { results: [] } })),
  POST_ConfirmOptout: vi.fn(),
}));
vi.mock("@/api/communicator/api", () => api);
vi.mock("@/api/leads/api", () => ({
  GET_Company: () => Promise.resolve({ data: { id: 42, name: "Example Shop 5" } }),
  GET_CompanyActivities: () => Promise.resolve({ data: { results: [] } }),
}));
vi.mock("@/stores/munin", () => ({ useMuninStore: () => ({ toolboxStatus: "", isModuleEnabled: () => false }) }));
vi.mock("@/stores/notify", () => ({ useNotifyStore: () => ({ spawnNotification: vi.fn() }) }));
vi.mock("vue-router", () => ({ useRoute: () => ({ params: { id: "42" } }), useRouter: () => ({}) }));

import Thread from "@/views/Leads/Thread.vue";
import ThreadTimeline from "@/views/Leads/ThreadTimeline.vue";

describe("Leads Thread", () => {
  it("merges every thread of the company into one timeline", async () => {
    const wrapper = mount(Thread, { global: { stubs: { BackBar: true, Loader: true, ThreadTimeline: true } } });
    await flushPromises();
    expect(api.GET_Threads).toHaveBeenCalledWith({ subject_ref: "leads.Company:42" });
    const messages = wrapper.findComponent(ThreadTimeline).props("messages");
    expect(messages.map((m) => [m.subject, m.thread])).toEqual([["T7", 7], ["T9", 9]]);
  });

  it("shows the desktop hint only when asked (phone company card)", async () => {
    const stubs = { BackBar: true, Loader: true, ThreadTimeline: true };
    const hint = (props) => mount(Thread, { props, global: { stubs } }).find('[data-testid="thread-desktop-hint"]');
    expect(hint({ desktopHint: true }).text()).toBe("leads.thread.desktop_hint");
    expect(hint({}).exists()).toBe(false);
  });
});
