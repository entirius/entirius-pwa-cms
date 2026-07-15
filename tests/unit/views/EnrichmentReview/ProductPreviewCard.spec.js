import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";

const mockGetProduct = vi.fn();
const mockNotify = vi.fn();

vi.mock("@/api/pim/api", () => ({
  GET_Product: (...a) => mockGetProduct(...a),
}));
vi.mock("@/stores/notify", () => ({
  useNotifyStore: () => ({ spawnNotification: mockNotify }),
}));

import ProductPreviewCard from "@/views/EnrichmentReview/ProductPreviewCard.vue";

const product = (over = {}) => ({
  sku: "00079331",
  name: "Dualtron Spider 2",
  ean: null,
  is_enabled: true,
  visibility_name: "Catalog and search",
  feature_set_idx: "default",
  gap_count: 1,
  product_class_name: "ProductSimple",
  og_image: "/media/volkanos/x.jpg",
  ...over,
});

const mountCard = (props = {}, routerMock = {}) =>
  mount(ProductPreviewCard, {
    props: { sku: "00079331", channelIdx: "escootersclinic", ...props },
    global: {
      mocks: { $router: { push: vi.fn(), ...routerMock } },
      stubs: { Loader: true, StatusBadge: true, EmptyState: true, FontAwesomeIcon: true },
    },
  });

describe("ProductPreviewCard", () => {
  beforeEach(() => {
    mockGetProduct.mockReset();
    mockNotify.mockReset();
  });

  it("fetches the product for the channel + sku on mount", async () => {
    mockGetProduct.mockResolvedValueOnce({ data: product() });
    const wrapper = mountCard();
    await flushPromises();

    expect(mockGetProduct).toHaveBeenCalledWith("escootersclinic", "00079331");
    expect(wrapper.vm.product.name).toBe("Dualtron Spider 2");
  });

  it("resolves a relative og_image against the API base", async () => {
    mockGetProduct.mockResolvedValueOnce({ data: product() });
    const wrapper = mountCard();
    await flushPromises();
    expect(wrapper.vm.heroUrl).toContain("/media/volkanos/x.jpg");
  });

  it("Go to PIM navigates to the product detail route", async () => {
    const push = vi.fn();
    mockGetProduct.mockResolvedValueOnce({ data: product() });
    const wrapper = mountCard({}, { push });
    await flushPromises();

    wrapper.vm.goToPim();
    expect(push).toHaveBeenCalledWith({
      name: "PimProductDetail",
      params: { sku: "00079331" },
    });
  });

  it("404 leaves product null without a toast", async () => {
    mockGetProduct.mockRejectedValueOnce({ response: { status: 404 } });
    const wrapper = mountCard();
    await flushPromises();

    expect(wrapper.vm.product).toBe(null);
    expect(mockNotify).not.toHaveBeenCalled();
  });

  it("refetches when the sku prop changes", async () => {
    mockGetProduct.mockResolvedValue({ data: product() });
    const wrapper = mountCard();
    await flushPromises();
    expect(mockGetProduct).toHaveBeenCalledTimes(1);

    await wrapper.setProps({ sku: "00193089" });
    await flushPromises();
    expect(mockGetProduct).toHaveBeenCalledTimes(2);
    expect(mockGetProduct.mock.calls.at(-1)).toEqual(["escootersclinic", "00193089"]);
  });
});
