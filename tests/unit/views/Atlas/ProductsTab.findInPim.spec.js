import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";

const mockGetSupplierProducts = vi.fn();
const mockSpawnNotification = vi.fn();
const mockIsPanelEnabled = vi.fn();

vi.mock("@/api/atlas/api", () => ({
  GET_SupplierProducts: (...args) => mockGetSupplierProducts(...args),
  POST_ApproveProduct: vi.fn(),
  POST_RejectProduct: vi.fn(),
  POST_QueueProduct: vi.fn(),
  POST_PushProduct: vi.fn(),
  POST_ForceRepushProduct: vi.fn(),
  POST_AcknowledgeSku: vi.fn(),
}));

vi.mock("@/stores/notify", () => ({
  useNotifyStore: () => ({ spawnNotification: mockSpawnNotification }),
}));

vi.mock("@/stores/munin", () => ({
  useMuninStore: () => ({ isPanelEnabled: mockIsPanelEnabled }),
}));

import ProductsTab from "@/views/Atlas/tabs/ProductsTab.vue";

const supplier = { idx: "kinghoff", name: "Kinghoff" };

function makeRow(overrides = {}) {
  return {
    id: 1,
    real_product_sku: "",
    external_id: "K-1",
    name: "Bosch GSR 12V-15",
    ean: "5901234123457",
    status: "new",
    cost: 1.23,
    currency: "EUR",
    stock: 10,
    data_changed_at: "2026-05-25T10:00:00+00:00",
    pushed_at: null,
    pushed_to_channel_idxs: [],
    last_synced_at: "2026-05-25T10:00:00+00:00",
    image_urls: ["/media/atlas/photo.jpg"],
    ...overrides,
  };
}

const globalStubs = {
  FilterChip: true,
  StatusBadge: true,
  BulkActionBar: true,
  DataTable: {
    name: "DataTable",
    props: ["columns", "rows"],
    emits: ["row-click"],
    template:
      "<div><button v-for='r in rows' :key='r.id' class='stub-row' @click=\"$emit('row-click', r)\">{{ r.id }}</button></div>",
  },
  Loader: true,
  Pagination: true,
  Dropdown: true,
  BasicInput: true,
  FontAwesomeIcon: true,
  RawDataModal: true,
  GalleryModal: true,
  ProductCard: true,
  RawDataPanel: true,
  "Confirmation-modal": true,
  FindInPimPanel: {
    name: "FindInPimPanel",
    props: ["productId", "name", "ean", "imageUrl"],
    emits: ["linked"],
    template: "<div class='stub-find-in-pim' />",
  },
};

beforeEach(() => {
  mockGetSupplierProducts.mockReset();
  mockSpawnNotification.mockReset();
  mockIsPanelEnabled.mockReset();
  mockIsPanelEnabled.mockReturnValue(true);
});

function mountTab() {
  return mount(ProductsTab, {
    props: { supplier },
    global: { stubs: globalStubs },
  });
}

describe("ProductsTab — Find in PIM (source product scope)", () => {
  it("shows the toggle only for a row without a real_product_sku yet", async () => {
    mockGetSupplierProducts.mockResolvedValue({
      data: { results: [makeRow({ id: 1 })], count: 1 },
    });
    const wrapper = mountTab();
    await flushPromises();

    await wrapper.find(".stub-row").trigger("click");
    expect(
      wrapper.find("[data-testid='drawer-find-in-pim-toggle']").exists()
    ).toBe(true);
  });

  it("hides the toggle once the row already has a PIM match", async () => {
    mockGetSupplierProducts.mockResolvedValue({
      data: {
        results: [makeRow({ id: 1, real_product_sku: "SKU-1" })],
        count: 1,
      },
    });
    const wrapper = mountTab();
    await flushPromises();

    await wrapper.find(".stub-row").trigger("click");
    expect(
      wrapper.find("[data-testid='drawer-find-in-pim-toggle']").exists()
    ).toBe(false);
  });

  it("opens FindInPimPanel seeded with this SourceProduct's pk/name/ean/image", async () => {
    mockGetSupplierProducts.mockResolvedValue({
      data: { results: [makeRow({ id: 1 })], count: 1 },
    });
    const wrapper = mountTab();
    await flushPromises();

    await wrapper.find(".stub-row").trigger("click");
    await wrapper
      .find("[data-testid='drawer-find-in-pim-toggle']")
      .trigger("click");

    const panel = wrapper.findComponent({ name: "FindInPimPanel" });
    expect(panel.exists()).toBe(true);
    expect(panel.props()).toEqual({
      productId: 1,
      name: "Bosch GSR 12V-15",
      ean: "5901234123457",
      imageUrl: "/media/atlas/photo.jpg",
    });
  });

  it("marks the row matched and re-fetches once FindInPimPanel emits linked", async () => {
    mockGetSupplierProducts.mockResolvedValue({
      data: { results: [makeRow({ id: 1 })], count: 1 },
    });
    const wrapper = mountTab();
    await flushPromises();

    await wrapper.find(".stub-row").trigger("click");
    await wrapper
      .find("[data-testid='drawer-find-in-pim-toggle']")
      .trigger("click");
    expect(wrapper.findComponent({ name: "FindInPimPanel" }).exists()).toBe(
      true
    );

    mockGetSupplierProducts.mockClear();
    await wrapper
      .findComponent({ name: "FindInPimPanel" })
      .vm.$emit("linked", "SKU-1");
    await flushPromises();

    // The SP is matched now: panel collapsed, toggle gone, list re-fetched.
    expect(wrapper.findComponent({ name: "FindInPimPanel" }).exists()).toBe(
      false
    );
    expect(
      wrapper.find("[data-testid='drawer-find-in-pim-toggle']").exists()
    ).toBe(false);
    expect(mockGetSupplierProducts).toHaveBeenCalledTimes(1);
  });
});
