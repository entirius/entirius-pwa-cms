import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";

const mockGetSupplierProducts = vi.fn();
const mockForceRepush = vi.fn();
const mockAcknowledge = vi.fn();
const mockApproveProduct = vi.fn();
const mockRejectProduct = vi.fn();
const mockRouterPush = vi.fn();
const mockSpawnNotification = vi.fn();
const mockIsPanelEnabled = vi.fn();

vi.mock("@/api/suppliers/api", () => ({
  GET_SupplierProducts: (...args) => mockGetSupplierProducts(...args),
  POST_ApproveProduct: (...args) => mockApproveProduct(...args),
  POST_RejectProduct: (...args) => mockRejectProduct(...args),
  POST_QueueProduct: vi.fn(),
  POST_PushProduct: vi.fn(),
  POST_ForceRepushProduct: (...args) => mockForceRepush(...args),
  POST_AcknowledgeSku: (...args) => mockAcknowledge(...args),
}));

vi.mock("@/stores/notify", () => ({
  useNotifyStore: () => ({ spawnNotification: mockSpawnNotification }),
}));

vi.mock("@/stores/munin", () => ({
  useMuninStore: () => ({ isPanelEnabled: mockIsPanelEnabled }),
}));

import ProductsTab from "@/views/Suppliers/tabs/ProductsTab.vue";

const supplier = { idx: "acme", name: "Acme" };

function makeRow(overrides = {}) {
  return {
    id: 1,
    real_product_sku: "SKU-1",
    external_id: "K-1",
    name: "Test product",
    status: "pushed",
    cost: 1.23,
    currency: "EUR",
    stock: 10,
    data_changed_at: "2026-05-25T10:00:00+00:00",
    pushed_at: "2026-05-24T10:00:00+00:00",
    pushed_to_channel_idxs: [],
    last_synced_at: "2026-05-25T10:00:00+00:00",
    image_urls: [],
    ...overrides,
  };
}

const globalStubs = {
  FilterChip: {
    name: "FilterChip",
    props: ["label", "active"],
    template: "<div class='stub-chip' :data-active='active' @click=\"$emit('click')\">{{ label }}</div>",
  },
  StatusBadge: {
    name: "StatusBadge",
    props: ["label", "variant"],
    emits: ["click"],
    template: "<span class='stub-badge' :data-variant='variant' @click=\"$emit('click')\">{{ label }}</span>",
  },
  BulkActionBar: {
    name: "BulkActionBar",
    props: ["count", "actions"],
    template: "<div class='stub-bulkbar' :data-count='count' :data-actions='actions.length'></div>",
  },
  DataTable: {
    name: "DataTable",
    props: ["columns", "rows", "selectable", "multiSelect"],
    template:
      "<div class='stub-table' :data-selectable='selectable' :data-rows='rows.length' :data-cols='columns.length'>" +
      "<div v-for='c in columns' :key='c.key' class='stub-col' :data-col='c.key'>{{ c.key }}</div>" +
      "</div>",
  },
  Loader: true,
  Pagination: true,
  Dropdown: true,
  BasicInput: true,
  FontAwesomeIcon: true,
  SideDrawer: true,
  RawDataModal: true,
  GalleryModal: true,
  ProductCard: true,
  RawDataPanel: true,
  "Confirmation-modal": true,
};

beforeEach(() => {
  mockGetSupplierProducts.mockReset();
  mockForceRepush.mockReset();
  mockAcknowledge.mockReset();
  mockApproveProduct.mockReset();
  mockRejectProduct.mockReset();
  mockRouterPush.mockReset();
  mockSpawnNotification.mockReset();
  mockIsPanelEnabled.mockReset();
  mockIsPanelEnabled.mockReturnValue(true);
});

describe("ProductsTab — etap-07 suppliers panel bridge", () => {
  it("renders the 'Updated' column only when suppliers panel is enabled", async () => {
    mockGetSupplierProducts.mockResolvedValue({ data: { results: [], count: 0 } });

    const wrapper = mount(ProductsTab, {
      props: { supplier },
      global: { stubs: globalStubs },
    });
    await flushPromises();

    const cols = wrapper.findAll(".stub-col").map((n) => n.attributes("data-col"));
    expect(cols).toContain("updated");
  });

  it("hides the 'Updated' column and unseen FilterChip when the panel is disabled", async () => {
    mockIsPanelEnabled.mockReturnValue(false);
    mockGetSupplierProducts.mockResolvedValue({ data: { results: [], count: 0 } });

    const wrapper = mount(ProductsTab, {
      props: { supplier },
      global: { stubs: globalStubs },
    });
    await flushPromises();

    const cols = wrapper.findAll(".stub-col").map((n) => n.attributes("data-col"));
    expect(cols).not.toContain("updated");
    expect(wrapper.find("[data-testid='products-filter-unseen']").exists()).toBe(false);
  });

  it("isRowUpdated returns true only when status is pushed/pushed_pending_images AND data_changed_at > pushed_at", async () => {
    mockGetSupplierProducts.mockResolvedValue({ data: { results: [], count: 0 } });
    const wrapper = mount(ProductsTab, { props: { supplier }, global: { stubs: globalStubs } });
    const vm = wrapper.vm;

    expect(vm.isRowUpdated(makeRow({ status: "pushed" }))).toBe(true);
    expect(vm.isRowUpdated(makeRow({ status: "pushed_pending_images" }))).toBe(true);
    expect(vm.isRowUpdated(makeRow({ status: "approved" }))).toBe(false);
    expect(
      vm.isRowUpdated(makeRow({ status: "pushed", pushed_at: "2026-06-01T00:00:00+00:00" }))
    ).toBe(false);
    expect(vm.isRowUpdated(makeRow({ status: "pushed", pushed_at: null }))).toBe(false);
  });

  it("unseenOnly filter shows only rows where isRowUpdated is true", async () => {
    mockGetSupplierProducts.mockResolvedValue({
      data: {
        results: [
          makeRow({ id: 1, status: "pushed" }),
          makeRow({ id: 2, status: "approved" }),
          makeRow({ id: 3, status: "pushed", pushed_at: "2026-06-01T00:00:00+00:00" }),
        ],
        count: 3,
      },
    });
    const wrapper = mount(ProductsTab, { props: { supplier }, global: { stubs: globalStubs } });
    await flushPromises();

    expect(wrapper.vm.visibleProducts).toHaveLength(3);
    wrapper.vm.toggleUnseenOnly();
    await flushPromises();
    expect(wrapper.vm.visibleProducts.map((r) => r.id)).toEqual([1]);
  });

  it("bulk handler force_repush — posts per selected SP id and clears selection on success", async () => {
    mockGetSupplierProducts.mockResolvedValue({
      data: { results: [makeRow({ id: 1 }), makeRow({ id: 2, real_product_sku: "SKU-2" })], count: 2 },
    });
    mockForceRepush.mockResolvedValue({ data: {} });

    const wrapper = mount(ProductsTab, { props: { supplier }, global: { stubs: globalStubs } });
    await flushPromises();

    wrapper.vm.selectedProducts = [makeRow({ id: 1 }), makeRow({ id: 2, real_product_sku: "SKU-2" })];
    await wrapper.vm.handleBulkAction("force_repush");
    await flushPromises();

    expect(mockForceRepush).toHaveBeenCalledTimes(2);
    expect(mockForceRepush).toHaveBeenCalledWith(1);
    expect(mockForceRepush).toHaveBeenCalledWith(2);
    expect(wrapper.vm.selectedProducts).toEqual([]);
    expect(mockSpawnNotification).toHaveBeenCalledWith(
      expect.objectContaining({ type: "positive" })
    );
  });

  it("etap-12 #19: per-row Approve calls POST_ApproveProduct, toasts, refetches", async () => {
    mockGetSupplierProducts.mockResolvedValue({ data: { results: [makeRow({ id: 1, status: "new" })], count: 1 } });
    mockApproveProduct.mockResolvedValue({ data: {} });

    const wrapper = mount(ProductsTab, { props: { supplier }, global: { stubs: globalStubs } });
    await flushPromises();

    await wrapper.vm.quickApprove({ id: 99 });
    await flushPromises();

    expect(mockApproveProduct).toHaveBeenCalledWith(99);
    expect(mockSpawnNotification).toHaveBeenCalledWith(expect.objectContaining({ type: "positive" }));
    // fetchProducts triggers the GET again — once on mount + once after approve.
    expect(mockGetSupplierProducts.mock.calls.length).toBeGreaterThanOrEqual(2);
  });

  it("etap-12 #19: per-row Reject calls POST_RejectProduct, surfaces negative toast on failure", async () => {
    mockGetSupplierProducts.mockResolvedValue({ data: { results: [], count: 0 } });
    mockRejectProduct.mockRejectedValueOnce(new Error("denied"));

    const wrapper = mount(ProductsTab, { props: { supplier }, global: { stubs: globalStubs } });
    await flushPromises();

    await wrapper.vm.quickReject({ id: 7 });
    await flushPromises();

    expect(mockRejectProduct).toHaveBeenCalledWith(7);
    const lastNotify = mockSpawnNotification.mock.calls.at(-1)[0];
    expect(lastNotify.type).toBe("negative");
  });

  it("etap-12 #19: reviewProduct routes to /suppliers/review with sp_id query", async () => {
    mockGetSupplierProducts.mockResolvedValue({ data: { results: [], count: 0 } });

    const wrapper = mount(ProductsTab, {
      props: { supplier },
      global: {
        stubs: globalStubs,
        mocks: { $router: { push: mockRouterPush } },
      },
    });
    await flushPromises();

    wrapper.vm.reviewProduct({ id: 42 });

    expect(mockRouterPush).toHaveBeenCalledWith({ path: "/suppliers/review", query: { sp_id: 42 } });
  });

  it("etap-12 #19: canApprove only matches new + queued rows (visibility gate for quick actions)", () => {
    mockGetSupplierProducts.mockResolvedValue({ data: { results: [], count: 0 } });
    const wrapper = mount(ProductsTab, { props: { supplier }, global: { stubs: globalStubs } });
    const vm = wrapper.vm;
    expect(vm.canApprove({ status: "new" })).toBe(true);
    expect(vm.canApprove({ status: "queued" })).toBe(true);
    expect(vm.canApprove({ status: "approved" })).toBe(false);
    expect(vm.canApprove({ status: "pushed" })).toBe(false);
    expect(vm.canApprove({ status: "rejected" })).toBe(false);
  });

  it("bulk handler acknowledge — deduplicates SKUs and reports partial failures", async () => {
    mockGetSupplierProducts.mockResolvedValue({
      data: { results: [makeRow({ id: 1 })], count: 1 },
    });
    mockAcknowledge.mockImplementation((sku) =>
      sku === "SKU-FAIL" ? Promise.reject(new Error("boom")) : Promise.resolve({ data: {} })
    );

    const wrapper = mount(ProductsTab, { props: { supplier }, global: { stubs: globalStubs } });
    await flushPromises();

    wrapper.vm.selectedProducts = [
      makeRow({ id: 1, real_product_sku: "SKU-OK" }),
      makeRow({ id: 2, real_product_sku: "SKU-OK" }), // duplicate
      makeRow({ id: 3, real_product_sku: "SKU-FAIL" }),
    ];
    await wrapper.vm.handleBulkAction("acknowledge");
    await flushPromises();

    expect(mockAcknowledge).toHaveBeenCalledTimes(2);
    expect(mockAcknowledge).toHaveBeenCalledWith("SKU-OK", { all_unseen: true });
    expect(mockAcknowledge).toHaveBeenCalledWith("SKU-FAIL", { all_unseen: true });
    const lastNotify = mockSpawnNotification.mock.calls.at(-1)[0];
    expect(lastNotify.type).toBe("warning");
  });
});
