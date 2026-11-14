import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";

const route = vi.hoisted(() => ({ name: "LeadsConversation", params: {} }));
const back = vi.hoisted(() => vi.fn());
const push = vi.hoisted(() => vi.fn());
vi.mock("vue-router", () => ({ useRoute: () => route, useRouter: () => ({ back, push }) }));
const api = vi.hoisted(() => ({
  GET_ThreadWithOptouts: vi.fn(),
  GET_WaitingMessages: vi.fn(() => Promise.resolve([])),
  POST_ConfirmOptout: vi.fn(() => Promise.resolve({ data: {} })),
  GET_ReplyClassPlans: vi.fn(() => Promise.resolve({ data: {} })),
}));
vi.mock("@/api/communicator/api", () => api);
const leads = vi.hoisted(() => ({ GET_Company: vi.fn() }));
vi.mock("@/api/leads/api", () => leads);
const modules = vi.hoisted(() => ({ leads: false }));
vi.mock("@/stores/munin", () => ({ useMuninStore: () => ({ isModuleEnabled: () => modules.leads, isModuleAtLeast: () => modules.leads }) }));
vi.mock("@/stores/notify", () => ({ useNotifyStore: () => ({ spawnNotification: vi.fn() }) }));

import Conversation from "@/views/Leads/Conversation.vue";

const timeline = [
  { at: "2026-09-21T08:00:00Z", direction: "out", status: "sent", subject: "Your shop audit", body_text: "Hi" },
  { at: "2026-09-22T08:00:00Z", direction: "in", body_text: "Yes, call me\n\nOn Mon Anna wrote:\n> Hi" },
];

const Header = { props: ["title", "back"], template: "<h1>{{ title }}</h1>" };

// The views read the munin store (the outbound guards): an empty one = an older backend.
beforeEach(() => setActivePinia(createPinia()));

describe("Leads Conversation (a thread by id)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    route.name = "LeadsConversation";
    route.params = { id: "23" };
  });

  it("shows the whole thread of a reply that belongs to no company", async () => {
    api.GET_ThreadWithOptouts.mockResolvedValue({ id: 23, status: "replied", recipient_name: "Jan", recipient_email: "jan@shop.test", timeline, optouts: [] });
    const wrapper = mount(Conversation, { global: { stubs: { Loader: true } } });
    await flushPromises();
    expect(api.GET_ThreadWithOptouts).toHaveBeenCalledWith("23");
    expect(wrapper.get('[data-testid="conversation-recipient"]').text()).toBe("Jan · jan@shop.test");
    expect(wrapper.get('[data-testid="thread-subject"]').text()).toContain("Your shop audit");
    expect(wrapper.findAll('[data-testid="timeline-in"]')).toHaveLength(1);
  });

  it("a thread that cannot load says so", async () => {
    api.GET_ThreadWithOptouts.mockRejectedValue({ status: 404 });
    const wrapper = mount(Conversation, { global: { stubs: { Loader: true } } });
    await flushPromises();
    expect(wrapper.find('[data-testid="conversation-missing"]').exists()).toBe(true);
  });

  it("Back on a directly opened thread (no history) goes to the Inbox", async () => {
    api.GET_ThreadWithOptouts.mockResolvedValue({ id: 23, status: "open", timeline, optouts: [] });
    const length = vi.spyOn(window.history, "length", "get").mockReturnValue(1);
    const PageHeader = { props: ["title", "back"], template: "<button data-testid='back' @click='back()' />" };
    const wrapper = mount(Conversation, { global: { stubs: { Loader: true, PageHeader } } });
    await flushPromises();
    await wrapper.get('[data-testid="back"]').trigger("click");
    expect(push).toHaveBeenCalledWith({ name: "LeadsInbox" });
    expect(back).not.toHaveBeenCalled();
    length.mockRestore();
  });

  // M10: an opt-out conversation of a company names it and links to its card
  it("names the company of the thread and links to its card", async () => {
    modules.leads = true;
    leads.GET_Company.mockResolvedValue({ data: { id: 42, name: "Acme", contacts: [] } });
    api.GET_ThreadWithOptouts.mockResolvedValue({ id: 23, status: "replied", subject_ref: "leads.Company:42", recipient_name: "Jan", recipient_email: "jan@shop.test", timeline, optouts: [] });
    const wrapper = mount(Conversation, { global: { stubs: { Loader: true, PageHeader: Header, "router-link": { props: ["to"], template: "<a :data-to=\"JSON.stringify(to)\"><slot /></a>" } } } });
    await flushPromises();
    const link = wrapper.get('[data-testid="conversation-company"]');
    expect(link.text()).toContain("leads.thread.open_company");
    expect(wrapper.get("h1").text()).toBe("Acme");
    expect(JSON.parse(link.attributes("data-to"))).toMatchObject({ name: "LeadsThread", params: { id: 42 } });
    modules.leads = false;
  });

  it("a thread of no company shows no company link", async () => {
    api.GET_ThreadWithOptouts.mockResolvedValue({ id: 23, status: "replied", subject_ref: "bdd:x", recipient_name: "Jan", recipient_email: "jan@shop.test", timeline, optouts: [] });
    const wrapper = mount(Conversation, { global: { stubs: { Loader: true } } });
    await flushPromises();
    expect(wrapper.find('[data-testid="conversation-company"]').exists()).toBe(false);
  });

  // N5: the plan-23 `subject_label` heads a conversation without a company card; else the other side's address
  it("is headed by the subject label, else by the other side's address", async () => {
    api.GET_ThreadWithOptouts.mockResolvedValue({ id: 23, status: "replied", subject_ref: "bdd:x", subject_label: "Example Shop", recipient_email: "jan@shop.test", timeline, optouts: [] });
    const labelled = mount(Conversation, { global: { stubs: { Loader: true, PageHeader: Header } } });
    await flushPromises();
    expect(labelled.get("h1").text()).toBe("Example Shop");
    api.GET_ThreadWithOptouts.mockResolvedValue({ id: 23, status: "replied", subject_ref: "bdd:x", subject_label: "", recipient_email: "jan@shop.test", timeline, optouts: [] });
    const bare = mount(Conversation, { global: { stubs: { Loader: true, PageHeader: Header } } });
    await flushPromises();
    expect(bare.get("h1").text()).toBe("jan@shop.test");
  });
});
