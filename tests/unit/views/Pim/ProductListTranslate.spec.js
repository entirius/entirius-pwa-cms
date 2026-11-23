import { describe, it, expect, vi } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";

vi.mock("@/api/pim/api", () => ({
  GET_Products: () => Promise.resolve({ data: { results: [], count: 0 } }),
  POST_BulkUpdateProducts: vi.fn(),
  GET_Categories: () => Promise.resolve({ data: { results: [] } }),
  GET_Features: () => Promise.resolve({ data: { results: [], next: null } }),
  GET_FeatureAttributes: () => Promise.resolve({ data: { results: [] } }),
  GET_BulkProductGaps: () => Promise.resolve({ data: { results: {} } }),
}));
vi.mock("@/api/atlas/api", () => ({
  GET_BulkHasChanges: () => Promise.resolve({ data: { skus: {} } }),
}));
vi.mock("@/stores/loader", () => ({
  useLoaderStore: () => ({ loaderStart() {}, loaderFinish() {} }),
}));
vi.mock("@/stores/notify", () => ({
  useNotifyStore: () => ({ spawnNotification: vi.fn() }),
}));
vi.mock("@/stores/pimChannel", () => ({
  usePimChannelStore: () => ({ activeChannelIdx: "default-europe" }),
}));
vi.mock("@/views/Pim/components/enrichment/useAiWorkers", () => ({
  useAiWorkers: () => ({ workers: [], enabled: false, usable: false }),
}));
vi.mock("@/stores/munin", () => ({
  useMuninStore: () => ({ isPanelEnabled: () => false }),
}));
vi.mock("@/composables/useSearchDebounce", () => ({
  useSearchDebounce: () => ({ search: "", debouncedFetch: () => {} }),
}));

import ProductList from "@/views/Pim/ProductList.vue";

const mountList = () =>
  mount(ProductList, {
    global: {
      mocks: { $route: { query: {}, path: "/pim/products" }, $router: { push() {}, replace() {} } },
      stubs: { DataTable: true, Pagination: true, FloatingActions: true, BulkActionBar: true, PimTranslateDialog: true },
    },
  });

// Rows of the admin product list carry `pk` (django-pim ProductResponse), not `id`.
const row = (pk, sku) => ({ pk, sku, name: sku });

describe("ProductList — translate the picked products", () => {
  it("sends the primary keys of the picked rows", async () => {
    const wrapper = mountList();
    await flushPromises();
    wrapper.vm.selectedProducts = [row(5, "SC-AKC-005"), row(7, "SC-AKC-007")];

    wrapper.vm.handleBulkAction("translate");

    expect(wrapper.vm.translateEntityIds).toEqual([5, 7]);
    expect(wrapper.vm.showTranslateDialog).toBe(true);
  });
});
