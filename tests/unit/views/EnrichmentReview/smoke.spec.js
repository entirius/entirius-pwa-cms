import { describe, it, expect, vi } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";

vi.mock("@/api/enrichment/api", () => ({
  GET_Proposals: vi.fn(() => Promise.resolve({ data: { results: [], count: 0 } })),
  GET_Proposal: vi.fn(() => Promise.resolve({ data: {} })),
  POST_AcceptProposal: vi.fn(() => Promise.resolve({ data: { status: "applied" } })),
  POST_RejectProposal: vi.fn(() => Promise.resolve({ data: {} })),
  POST_BulkAcceptProposals: vi.fn(() => Promise.resolve({ data: { mode: "sync", applied: [] } })),
  POST_BulkRejectProposals: vi.fn(() => Promise.resolve({ data: { rejected: 0 } })),
  POST_BulkUndoProposals: vi.fn(() => Promise.resolve({ data: { mode: "sync", reverted: [], blocked: [] } })),
}));
vi.mock("@/stores/notify", () => ({ useNotifyStore: () => ({ spawnNotification: vi.fn() }) }));
vi.mock("@/stores/pimChannel", () => ({
  usePimChannelStore: () => ({
    channels: [],
    fetchChannels: vi.fn(),
    activeChannelIdx: "c1",
    activeChannelLanguages: ["en"],
    allLanguages: ["en"],
  }),
}));

import EnrichmentReview from "@/views/EnrichmentReview/index.vue";
import ListMode from "@/views/EnrichmentReview/ListMode.vue";
import DriftModal from "@/views/EnrichmentReview/DriftModal.vue";

const stubs = {
  SegmentedControl: true,
  BasicInput: true,
  Dropdown: true,
  FilterChip: true,
  Loader: true,
  EmptyState: true,
  DataTable: true,
  StatusBadge: true,
  DiffRenderer: true,
  FontAwesomeIcon: true,
  Teleport: true,
  ListMode: true,
  FocusMode: true,
  DriftModal: true,
  ImportCsvDialog: true,
  // The page frame renders its slots: the filters sit in the `toolbar`.
  PageLayout: { template: "<div><slot name='header' /><slot name='toolbar' /><slot /><slot name='footer' /></div>" },
  PageHeader: { props: ["title"], template: "<header><h1>{{ title }}</h1><slot name='meta' /><slot name='actions' /></header>" },
};

describe("EnrichmentReview compile smoke", () => {
  it("mounts the orchestrator and fetches the queue", async () => {
    const w = mount(EnrichmentReview, { global: { stubs } });
    await flushPromises();
    expect(w.exists()).toBe(true);
  });

  it("mounts ListMode with rows", () => {
    const w = mount(ListMode, {
      props: { rows: [{ id: 1, status: "pending", target_kind: "text", proposed_value: {}, current_snapshot: {}, target_locator: {} }], totalCount: 1 },
      global: { stubs },
    });
    expect(w.exists()).toBe(true);
  });

  it("mounts DriftModal", () => {
    const w = mount(DriftModal, { props: { visible: false, proposal: null }, global: { stubs } });
    expect(w.exists()).toBe(true);
  });

  it("counts the panel filters on the MobileFilterPanel, status excluded", async () => {
    const MobileFilterPanel = { name: "MobileFilterPanel", props: ["activeCount", "triggerLabel"], template: "<div><slot /></div>" };
    const w = mount(EnrichmentReview, { global: { stubs: { ...stubs, MobileFilterPanel } } });
    await flushPromises();
    expect(w.findComponent({ name: "MobileFilterPanel" }).props("activeCount")).toBe(0);
    const filters = { ...w.vm.filters, status: "applied", source: "ai", search: "x" };
    expect(EnrichmentReview.computed.activeFilterCount.call({ filters })).toBe(2);
  });
});
