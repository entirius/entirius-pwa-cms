import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";

// Mock the API and notify store BEFORE component import so dynamic mocks land.
const mockGetSkuChanges = vi.fn();
const mockPostAcknowledge = vi.fn();
const mockPostForceRepush = vi.fn();
const mockPostSetPreferred = vi.fn();
const mockPostResetToAuto = vi.fn();
const mockSpawnNotification = vi.fn();

vi.mock("@/api/suppliers/api", () => ({
  GET_SkuChanges: (...args) => mockGetSkuChanges(...args),
  POST_AcknowledgeSku: (...args) => mockPostAcknowledge(...args),
  POST_ForceRepushSku: (...args) => mockPostForceRepush(...args),
  POST_SetPreferredSupplier: (...args) => mockPostSetPreferred(...args),
  POST_ResetPreferredToAuto: (...args) => mockPostResetToAuto(...args),
}));

vi.mock("@/stores/notify", () => ({
  useNotifyStore: () => ({ spawnNotification: mockSpawnNotification }),
}));

import SupplierTab from "@/views/Pim/components/SupplierTab.vue";

const baseData = {
  real_product_sku: "TEST-SKU",
  has_supplier: true,
  supplier_product_id: 1,
  supplier: { idx: "acme", name: "Acme" },
  unseen_count: 2,
  last_change_at: "2026-05-23T06:00:00+00:00",
  cost: 0.13,
  stock: 1500,
  changes: [
    {
      id: 1,
      source: "delta_sync",
      field_path: "cost",
      before: 0.14,
      after: 0.13,
      created_at: "2026-05-23T06:00:00+00:00",
      applied_to_pim: false,
      applied_to_pim_at: null,
      triggered_by: null,
    },
    {
      id: 2,
      source: "init_push",
      field_path: "name",
      before: null,
      after: "Hammer",
      created_at: "2026-05-22T12:00:00+00:00",
      applied_to_pim: true,
      applied_to_pim_at: "2026-05-22T12:01:00+00:00",
      triggered_by: "admin",
    },
  ],
};

describe("SupplierTab", () => {
  beforeEach(() => {
    mockGetSkuChanges.mockReset();
    mockPostAcknowledge.mockReset();
    mockPostForceRepush.mockReset();
    mockPostSetPreferred.mockReset();
    mockPostResetToAuto.mockReset();
    mockSpawnNotification.mockReset();
  });

  it("renders empty state when backend returns 404 (no supplier linked)", async () => {
    mockGetSkuChanges.mockRejectedValueOnce({ response: { status: 404 } });

    const wrapper = mount(SupplierTab, { props: { sku: "NO-LINK" } });
    await flushPromises();

    expect(mockGetSkuChanges).toHaveBeenCalledWith("NO-LINK");
    expect(wrapper.findComponent({ name: "SupplierTimeline" }).exists()).toBe(false);
    expect(wrapper.findComponent({ name: "LinkedSuppliersPanel" }).exists()).toBe(false);
  });

  it("renders linked suppliers and timeline when data is present", async () => {
    mockGetSkuChanges.mockResolvedValueOnce({ data: baseData });

    const wrapper = mount(SupplierTab, { props: { sku: "TEST-SKU" } });
    await flushPromises();

    expect(wrapper.findComponent({ name: "LinkedSuppliersPanel" }).exists()).toBe(true);
    const timeline = wrapper.findComponent({ name: "SupplierTimeline" });
    expect(timeline.exists()).toBe(true);
    expect(timeline.props("entries").length).toBe(2);
  });

  it("acknowledge button calls API, shows positive toast and emits refreshed", async () => {
    mockGetSkuChanges.mockResolvedValue({ data: baseData });
    mockPostAcknowledge.mockResolvedValueOnce({ data: { sku: "TEST-SKU", acknowledged_count: 2 } });

    const wrapper = mount(SupplierTab, { props: { sku: "TEST-SKU" } });
    await flushPromises();

    await wrapper.find('[data-test="supplier-acknowledge"]').trigger("click");
    await flushPromises();

    expect(mockPostAcknowledge).toHaveBeenCalledWith("TEST-SKU", { all_unseen: true });
    expect(mockSpawnNotification).toHaveBeenCalledWith(
      expect.objectContaining({ type: "positive" })
    );
    expect(wrapper.emitted("refreshed")).toBeTruthy();
  });

  it("reset-to-auto calls API and emits refreshed when switch happened", async () => {
    mockGetSkuChanges.mockResolvedValue({ data: baseData });
    mockPostResetToAuto.mockResolvedValueOnce({
      data: { switched: true, new_preferred_supplier_idx: "globex" },
    });

    const wrapper = mount(SupplierTab, { props: { sku: "TEST-SKU" } });
    await flushPromises();

    await wrapper.find('[data-test="supplier-reset-auto"]').trigger("click");
    await flushPromises();

    expect(mockPostResetToAuto).toHaveBeenCalledWith("TEST-SKU");
    expect(mockSpawnNotification).toHaveBeenCalledWith(
      expect.objectContaining({ type: "positive" })
    );
    expect(wrapper.emitted("refreshed")).toBeTruthy();
  });
});
