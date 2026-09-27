import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import { setLang } from "@/i18n";

const mockGetTaxClass = vi.fn();
const mockPostRate = vi.fn();

vi.mock("@/api/pricemanager/api", () => ({
  GET_PmTaxClass: (...a) => mockGetTaxClass(...a),
  POST_PmTaxClass: vi.fn(),
  PATCH_PmTaxClass: vi.fn(),
  DELETE_PmTaxClass: vi.fn(),
  POST_PmTaxRate: (...a) => mockPostRate(...a),
  DELETE_PmTaxRate: vi.fn(),
}));
vi.mock("@/stores/loader", () => ({
  useLoaderStore: () => ({ loaderStart() {}, loaderFinish() {} }),
}));
vi.mock("@/stores/notify", () => ({
  useNotifyStore: () => ({ spawnNotification() {} }),
}));
vi.mock("@/functionals/Confirmation-modal/index.vue", () => ({ default: { template: "<div />" } }));

import TaxClassDetail from "@/views/PriceManager/TaxClassDetail.vue";

const TAX_CLASS = {
  idx: "standard",
  name: "Standard",
  rates: [
    { country: "PL", rate: "0.2300" },
    { country: "DE", rate: "0.0850" },
  ],
};

async function mountDetail() {
  mockGetTaxClass.mockResolvedValue({ data: TAX_CLASS });
  const wrapper = mount(TaxClassDetail, {
    global: {
      mocks: { $route: { params: { idx: "standard" }, query: {} } },
      stubs: { Teleport: true, NumberInput: true },
    },
  });
  await flushPromises();
  return wrapper;
}

describe("TaxClassDetail — rate unit", () => {
  beforeEach(() => {
    mockGetTaxClass.mockReset();
    mockPostRate.mockReset();
    setLang("PL");
  });
  afterEach(() => setLang("EN"));

  it("shows stored fractions as percent", async () => {
    const rows = (await mountDetail()).findAll(".pm-rates-table__row");
    expect(rows[0].text()).toContain("23 %");
    expect(rows[1].text()).toContain("8,5 %");
  });

  it("stores a typed 23 as the fraction 0.2300", async () => {
    mockPostRate.mockResolvedValue({ data: {} });
    const wrapper = await mountDetail();
    wrapper.vm.newRate = { country_iso2: "cz", rate: 23 };
    await wrapper.vm.addRate();
    expect(mockPostRate).toHaveBeenCalledWith("standard", { country_code: "CZ", rate: "0.2300" });
  });
});
