import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";

const mockGetSupplierProducts = vi.fn();
const mockForceRepush = vi.fn();
const mockAcknowledge = vi.fn();
const mockSpawnNotification = vi.fn();

vi.mock("@/api/suppliers/api", () => ({
  GET_SupplierProducts: (...args) => mockGetSupplierProducts(...args),
  POST_ForceRepushProduct: (...args) => mockForceRepush(...args),
  POST_AcknowledgeSku: (...args) => mockAcknowledge(...args),
}));

vi.mock("@/stores/notify", () => ({
  useNotifyStore: () => ({ spawnNotification: mockSpawnNotification }),
}));

import UpdatedMode from "@/views/SupplierReview/UpdatedMode.vue";

const baseFilters = { supplier: "__all", status: "queued", search: "" };

function makeRow(overrides = {}) {
  return {
    id: 1,
    real_product_sku: "SKU-1",
    external_id: "K-1",
    supplier_idx: "acme",
    supplier_name: "Acme",
    name: "Test",
    status: "pushed",
    cost: 1.23,
    currency: "EUR",
    data_changed_at: "2026-05-25T10:00:00+00:00",
    pushed_at: "2026-05-24T10:00:00+00:00",
    ...overrides,
  };
}

const globalStubs = {
  FilterChip: {
    name: "FilterChip",
    props: ["label", "active", "count"],
    template:
      "<div class='stub-chip' :data-active='active' :data-count='count'>{{ label }}</div>",
  },
  StatusBadge: {
    name: "StatusBadge",
    props: ["label", "variant"],
    template: "<span class='stub-badge' :data-variant='variant'>{{ label }}</span>",
  },
  BulkActionBar: {
    name: "BulkActionBar",
    props: ["count", "actions"],
    template: "<div class='stub-bulkbar' :data-count='count'></div>",
  },
  DataTable: {
    name: "DataTable",
    props: ["columns", "rows"],
    template: "<div class='stub-table' :data-rows='rows.length'></div>",
  },
  Loader: true,
  EmptyState: {
    name: "EmptyState",
    props: ["title", "message", "icon"],
    template: "<div class='stub-empty'>{{ title }}</div>",
  },
};

beforeEach(() => {
  mockGetSupplierProducts.mockReset();
  mockForceRepush.mockReset();
  mockAcknowledge.mockReset();
  mockSpawnNotification.mockReset();
});

describe("UpdatedMode — etap-07 SupplierReview 4th mode", () => {
  it("fetches pushed products on mount and filters to rows where data_changed_at > pushed_at", async () => {
    mockGetSupplierProducts.mockResolvedValue({
      data: {
        results: [
          makeRow({ id: 1 }), // updated
          makeRow({ id: 2, pushed_at: "2026-06-01T00:00:00+00:00" }), // not updated
          makeRow({ id: 3, status: "approved" }), // wrong status
          makeRow({ id: 4 }), // updated
        ],
      },
    });

    const wrapper = mount(UpdatedMode, {
      props: { filters: baseFilters },
      global: { stubs: globalStubs },
    });
    await flushPromises();

    expect(mockGetSupplierProducts).toHaveBeenCalledTimes(1);
    const params = mockGetSupplierProducts.mock.calls[0][0];
    expect(params.status).toBe("pushed");
    expect(params.ordering).toBe("-data_changed_at");
    expect(params.supplier).toBeUndefined();

    expect(wrapper.vm.visibleRows.map((r) => r.id).sort()).toEqual([1, 4]);
    expect(wrapper.vm.updatedRowsCount).toBe(2);
  });

  it("forwards filters.supplier to API params when not '__all'", async () => {
    mockGetSupplierProducts.mockResolvedValue({ data: { results: [] } });

    mount(UpdatedMode, {
      props: { filters: { ...baseFilters, supplier: "acme" } },
      global: { stubs: globalStubs },
    });
    await flushPromises();

    const params = mockGetSupplierProducts.mock.calls[0][0];
    expect(params.supplier).toBe("acme");
  });

  it("groups visibleRows by supplier into perSupplierCounts (sorted desc)", async () => {
    mockGetSupplierProducts.mockResolvedValue({
      data: {
        results: [
          makeRow({ id: 1, supplier_idx: "acme", supplier_name: "Acme" }),
          makeRow({ id: 2, supplier_idx: "acme", supplier_name: "Acme" }),
          makeRow({ id: 3, supplier_idx: "globex", supplier_name: "Globex" }),
        ],
      },
    });

    const wrapper = mount(UpdatedMode, {
      props: { filters: baseFilters },
      global: { stubs: globalStubs },
    });
    await flushPromises();

    expect(wrapper.vm.perSupplierCounts).toEqual([
      { idx: "acme", name: "Acme", count: 2 },
      { idx: "globex", name: "Globex", count: 1 },
    ]);
  });

  it("bulk handler force_repush iterates per selected row and refetches on success", async () => {
    mockGetSupplierProducts.mockResolvedValue({ data: { results: [makeRow({ id: 1 })] } });
    mockForceRepush.mockResolvedValue({ data: {} });

    const wrapper = mount(UpdatedMode, {
      props: { filters: baseFilters },
      global: { stubs: globalStubs },
    });
    await flushPromises();

    wrapper.vm.selected = [makeRow({ id: 10 }), makeRow({ id: 20, real_product_sku: "SKU-2" })];
    await wrapper.vm.handleBulkAction("force_repush");
    await flushPromises();

    expect(mockForceRepush).toHaveBeenCalledTimes(2);
    expect(wrapper.vm.selected).toEqual([]);
    expect(mockGetSupplierProducts).toHaveBeenCalledTimes(2); // initial + refetch
  });

  it("acknowledge bulk handler dedupes SKUs and reports partial failure as warning", async () => {
    mockGetSupplierProducts.mockResolvedValue({ data: { results: [makeRow({ id: 1 })] } });
    mockAcknowledge.mockImplementation((sku) =>
      sku === "SKU-FAIL" ? Promise.reject(new Error("boom")) : Promise.resolve({ data: {} })
    );

    const wrapper = mount(UpdatedMode, {
      props: { filters: baseFilters },
      global: { stubs: globalStubs },
    });
    await flushPromises();

    wrapper.vm.selected = [
      makeRow({ id: 10, real_product_sku: "SKU-OK" }),
      makeRow({ id: 20, real_product_sku: "SKU-OK" }), // duplicate
      makeRow({ id: 30, real_product_sku: "SKU-FAIL" }),
    ];
    await wrapper.vm.handleBulkAction("acknowledge");
    await flushPromises();

    expect(mockAcknowledge).toHaveBeenCalledTimes(2);
    const lastNotify = mockSpawnNotification.mock.calls.at(-1)[0];
    expect(lastNotify.type).toBe("warning");
  });
});
