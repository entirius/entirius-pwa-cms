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

  it("keeps filters collapsed behind a toggle until clicked", async () => {
    const w = mount(EnrichmentReview, { global: { stubs } });
    await flushPromises();
    // Collapsed by default — no filter row, no count badge.
    expect(w.find('[data-testid="enrichment-filters-row"]').exists()).toBe(false);
    expect(w.find('[data-testid="enrichment-filters-count"]').exists()).toBe(false);
    // Toggle reveals the filter row.
    await w.find('[data-testid="enrichment-filters-toggle"]').trigger("click");
    expect(w.find('[data-testid="enrichment-filters-row"]').exists()).toBe(true);
    // activeFilterCount drives the badge: 0 when all filters are at defaults.
    expect(w.vm.activeFilterCount).toBe(0);
  });
});
