import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";

const mockGetAutoMatched = vi.fn();
const mockRouterPush = vi.fn();
const mockIsPanelEnabled = vi.fn();

vi.mock("@/api/atlas/api", () => ({
  GET_AutoMatched: (...args) => mockGetAutoMatched(...args),
}));

vi.mock("@/stores/munin", () => ({
  useMuninStore: () => ({ isPanelEnabled: mockIsPanelEnabled }),
}));

import AutoMatched from "@/views/Atlas/AutoMatched.vue";

function makeRow(overrides = {}) {
  return {
    sku: "FT-001",
    ean: "5900000000001",
    sources: [
      { idx: "fortrade", name: "Fortrade", is_primary: true },
      { idx: "kinghoff", name: "Kinghoff", is_primary: false },
    ],
    has_tolerance_violation: false,
    has_manual_override: false,
    last_auto_link_at: "2026-05-25T10:00:00+00:00",
    ...overrides,
  };
}

const globalStubs = {
  FilterChip: {
    name: "FilterChip",
    props: ["label", "active"],
    emits: ["click"],
    template:
      "<div class='stub-chip' :data-label='label' :data-active='active' @click=\"$emit('click')\">{{ label }}</div>",
  },
  StatusBadge: {
    name: "StatusBadge",
    props: ["label", "variant"],
    template: "<span class='stub-badge' :data-variant='variant'>{{ label }}</span>",
  },
  DataTable: {
    name: "DataTable",
    props: ["columns", "rows"],
    template:
      "<div class='stub-table' :data-rows='rows.length' :data-cols='columns.length'></div>",
  },
  EmptyState: {
    name: "EmptyState",
    props: ["title", "message"],
    template: "<div class='stub-empty' :data-title='title'></div>",
  },
  Loader: true,
  Pagination: true,
  FontAwesomeIcon: true,
};

describe("AutoMatched.vue", () => {
  beforeEach(() => {
    mockGetAutoMatched.mockReset();
    mockRouterPush.mockReset();
    mockIsPanelEnabled.mockReset();
    mockIsPanelEnabled.mockReturnValue(true);
  });

  function mountView() {
    return mount(AutoMatched, {
      global: {
        stubs: globalStubs,
        mocks: { $router: { push: mockRouterPush } },
      },
    });
  }

  it("loads rows from GET_AutoMatched on mount", async () => {
    mockGetAutoMatched.mockResolvedValue({
      data: { results: [makeRow(), makeRow({ sku: "KH-002" })], count: 2 },
    });
    const wrapper = mountView();
    await flushPromises();
    expect(mockGetAutoMatched).toHaveBeenCalledWith({ page: 1, page_size: 25 });
    expect(wrapper.vm.rows).toHaveLength(2);
    expect(wrapper.vm.totalCount).toBe(2);
  });

  it("refetches with has_violations=true when violations filter is toggled", async () => {
    mockGetAutoMatched.mockResolvedValue({ data: { results: [], count: 0 } });
    const wrapper = mountView();
    await flushPromises();
    mockGetAutoMatched.mockClear();
    wrapper.vm.toggleViolations();
    await flushPromises();
    expect(mockGetAutoMatched).toHaveBeenCalledWith(
      expect.objectContaining({ has_violations: true }),
    );
  });

  it("renders EmptyState when no rows returned", async () => {
    mockGetAutoMatched.mockResolvedValue({ data: { results: [], count: 0 } });
    const wrapper = mountView();
    await flushPromises();
    const empty = wrapper.find(".stub-empty");
    expect(empty.exists()).toBe(true);
  });

  it("redirects when suppliers panel is disabled", async () => {
    mockIsPanelEnabled.mockReturnValue(false);
    const wrapper = mountView();
    await flushPromises();
    expect(mockRouterPush).toHaveBeenCalledWith("/");
    expect(mockGetAutoMatched).not.toHaveBeenCalled();
  });
});
