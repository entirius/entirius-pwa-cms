import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";

const mockGetProducts = vi.fn();
const mockGetFeatures = vi.fn();

vi.mock("@/api/pim/api", () => ({
  GET_Products: (...a) => mockGetProducts(...a),
  POST_BulkUpdateProducts: vi.fn(),
  GET_Categories: () => Promise.resolve({ data: { results: [] } }),
  GET_Features: (...a) => mockGetFeatures(...a),
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
// The AI menu stays dormant here (enrichment module off).
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

describe("ProductList — run AI on all matching", () => {
  beforeEach(() => {
    mockGetProducts.mockReset();
    mockGetFeatures.mockReset().mockResolvedValue({ data: { results: [], next: null } });
  });

  it("the scope and count come from the last finished read, not from the live filters", async () => {
    mockGetProducts.mockResolvedValue({ data: { results: [], count: 42 } });
    const wrapper = mountList();
    await flushPromises();
    expect(wrapper.vm.matchingScope).toBeNull();

    wrapper.vm.attributeFilters = { packshot_check: "replace_size" };
    // Filter changed, read not back yet: the old (null) scope stays.
    expect(wrapper.vm.matchingScope).toBeNull();
    await wrapper.vm.fetchProducts();
    expect(wrapper.vm.matchingScope).toEqual({ attribute_filters: { packshot_check: "replace_size" } });

    wrapper.vm.openAiTaskOnMatching();
    expect(wrapper.vm.aiFilters).toEqual({ attribute_filters: { packshot_check: "replace_size" } });
    expect(wrapper.vm.aiCount).toBe(42);
  });

  it("a late answer of an older read never replaces the newer one", async () => {
    mockGetProducts.mockResolvedValue({ data: { results: [], count: 1 } });
    const wrapper = mountList();
    await flushPromises();
    let releaseOld;
    mockGetProducts.mockReturnValueOnce(new Promise((resolve) => (releaseOld = resolve)));
    wrapper.vm.categoryFilter = "old";
    const oldRead = wrapper.vm.fetchProducts();
    mockGetProducts.mockResolvedValueOnce({ data: { results: [], count: 7 } });
    wrapper.vm.categoryFilter = "new";
    await wrapper.vm.fetchProducts();
    releaseOld({ data: { results: [], count: 999 } });
    await oldRead;
    expect(wrapper.vm.totalCount).toBe(7);
    expect(wrapper.vm.matchingScope).toEqual({ category_idx: "new" });
  });
});
