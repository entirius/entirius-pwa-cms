import { describe, it, expect, vi, beforeEach } from "vitest";
import { computed } from "vue";
import { flushPromises, mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";

const leads = vi.hoisted(() => ({ GET_Companies: vi.fn() }));
vi.mock("@/api/leads/api", () => leads);
const router = vi.hoisted(() => ({ push: vi.fn(), replace: vi.fn() }));
vi.mock("vue-router", async (original) => ({ ...(await original()), useRoute: () => ({ name: "LeadsThread", params: { id: 1 }, query: {} }), useRouter: () => router }));

import { ACCESS_STORE, READONLY } from "@/composables/useReadonly";
import BasicButton from "@/boots/BasicButton/index.vue";
import Companies from "@/views/Leads/Companies.vue";
import InboxRow from "@/views/Leads/InboxRow.vue";
import ReviewActions from "@/views/Leads/ReviewActions.vue";
import { leadsFrame } from "./leadsFrame";
import { outboundStubs } from "./outboundFrame";

// The access store of a role that reads every area and writes none of `readonlyAreas`.
const accessFor = (readonlyAreas = []) => ({ available: true, can: (area, level) => level !== "write" || !readonlyAreas.includes(area) });
const global = (access, provide = {}) => ({
  components: leadsFrame.components,
  stubs: { ...outboundStubs, BasicButton, BasicMenu: { template: "<div data-testid='review-more-menu'><slot name='trigger' /></div>" } },
  provide: { [ACCESS_STORE]: access, ...provide },
});
const byTestid = (wrapper, id) => wrapper.find(`[data-testid="${id}"]`);

// U19 (test D1): the CRM write buttons outside a PageLayout's reach — the Inbox column and the Review bar —
// follow the role's write right like the page buttons do.
describe("Read-only roles in the CRM side panels", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setActivePinia(createPinia());
    leads.GET_Companies.mockResolvedValue({ data: { results: [{ id: 1, name: "Acme", stage: { label: "New" } }], next: null } });
  });

  it("the Companies side panel shows Add company only to a role that writes companies", async () => {
    const viewer = mount(Companies, { props: { embedded: true }, global: global(accessFor(["leads.companies"])) });
    await flushPromises();
    expect(byTestid(viewer, "companies-item").exists()).toBe(true);
    expect(byTestid(viewer, "companies-add").exists()).toBe(false);

    const editor = mount(Companies, { props: { embedded: true }, global: global(accessFor()) });
    await flushPromises();
    await byTestid(editor, "companies-add").trigger("click");
    expect(router.push).toHaveBeenCalledWith({ name: "LeadsCompanyNew" });
  });

  it("an Inbox row's Send now shows only to a role that writes conversations", () => {
    const later = new Date(Date.now() + 3600000).toISOString();
    const row = { id: 3, subject_ref: "x:1", subject: "Offer", waiting: { id: 9, scheduled_at: later }, activity_at: later };
    const viewer = mount(InboxRow, { props: { row }, global: global(accessFor(["communicator.conversations"])) });
    expect(byTestid(viewer, "inbox-marker-waiting").exists()).toBe(true);
    expect(byTestid(viewer, "inbox-item-send-now").exists()).toBe(false);
    const editor = mount(InboxRow, { props: { row }, global: global(accessFor()) });
    expect(byTestid(editor, "inbox-item-send-now").exists()).toBe(true);
  });

  it("the Review bar has no Skip, Send or more menu on a read-only page", () => {
    const readonly = mount(ReviewActions, { props: { blocked: "Paused" }, global: global(accessFor(), { [READONLY]: computed(() => true) }) });
    ["review-skip", "review-send", "review-more-menu", "review-send-blocked"].forEach((id) => expect(byTestid(readonly, id).exists()).toBe(false));
    const writer = mount(ReviewActions, { props: {}, global: global(accessFor()) });
    ["review-skip", "review-send", "review-more-menu"].forEach((id) => expect(byTestid(writer, id).exists()).toBe(true));
  });
});
