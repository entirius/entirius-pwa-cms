import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";

const mockIsModuleEnabled = vi.fn();

vi.mock("@/api/promo/api", () => ({
  GET_DiscountRules: vi.fn().mockResolvedValue({ data: { results: [], count: 0 } }),
  GET_DiscountMeta: vi.fn().mockResolvedValue({ data: { modifiers: [], targets: [] } }),
  POST_BulkRules: vi.fn(),
}));

vi.mock("@/stores/notify", () => ({
  useNotifyStore: () => ({ spawnNotification: vi.fn() }),
}));

vi.mock("@/stores/loader", () => ({
  useLoaderStore: () => ({ show: vi.fn(), hide: vi.fn() }),
}));

vi.mock("@/stores/munin", () => ({
  useMuninStore: () => ({ isModuleEnabled: mockIsModuleEnabled }),
}));

vi.mock("@/stores/checkoutChannel", () => ({
  useCheckoutChannelStore: () => ({ activeChannelIdx: "default-local", ensureLoaded: vi.fn() }),
}));

import PromoList from "@/views/Promo/PromoList.vue";

function mountWith({ vouchers, tab } = {}) {
  mockIsModuleEnabled.mockImplementation((key) => key === "checkout_voucher" && vouchers);
  return mount(PromoList, {
    shallow: true,
    global: {
      mocks: { $route: { params: {}, query: tab ? { tab } : {} }, $router: { push: vi.fn() } },
    },
  });
}

describe("PromoList voucher gating", () => {
  beforeEach(() => vi.clearAllMocks());

  it("hides the Vouchers segment when checkout_voucher is absent", async () => {
    const wrapper = mountWith({ vouchers: false });
    await flushPromises();

    expect(wrapper.vm.tabOptions.map((t) => t.value)).toEqual(["discounts"]);
  });

  it("offers the Vouchers segment when checkout_voucher is enabled", async () => {
    const wrapper = mountWith({ vouchers: true });
    await flushPromises();

    expect(wrapper.vm.tabOptions.map((t) => t.value)).toEqual(["discounts", "vouchers"]);
  });

  it("shows the locked EmptyState on a vouchers deep link without the module", async () => {
    const wrapper = mountWith({ vouchers: false, tab: "vouchers" });
    await flushPromises();

    expect(wrapper.vm.activeTab).toBe("vouchers");
    expect(wrapper.findComponent({ name: "VouchersSection" }).exists()).toBe(false);
    expect(wrapper.find(".promo-vouchers-disabled").exists()).toBe(true);
  });
});
