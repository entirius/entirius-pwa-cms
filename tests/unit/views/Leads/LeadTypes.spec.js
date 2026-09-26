import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";

const rows = vi.hoisted(() => ({ list: [] }));
const api = vi.hoisted(() => ({
  GET_LeadTypes: vi.fn(() => Promise.resolve({ data: { results: rows.list.map((row) => ({ ...row })) } })),
  POST_LeadType: vi.fn(() => Promise.resolve({ data: {} })),
  PATCH_LeadType: vi.fn(() => Promise.resolve({ data: {} })),
  DELETE_LeadType: vi.fn(() => Promise.resolve({ data: {} })),
}));
vi.mock("@/api/leads/api", () => api);

import LeadTypes from "@/views/Leads/LeadTypes.vue";

const mountScreen = async () => {
  const wrapper = mount(LeadTypes, { global: { stubs: { FontAwesomeIcon: true } } });
  await flushPromises();
  return wrapper;
};
const row = (wrapper, code) => wrapper.get(`[data-code="${code}"]`);

// UX-004: Leads → Settings → Lead types — the Stages pattern.
describe("Leads → Settings → Lead types", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
    rows.list = [
      { id: 1, code: "RETAILER", label: "Retailer", order: 0, is_active: true },
      { id: 2, code: "WHOLESALE", label: "Wholesale", order: 10, is_active: true },
    ];
  });

  it("adds a type with an upper-case code after the last one", async () => {
    const wrapper = await mountScreen();
    await wrapper.get('[data-testid="lead-type-new-code"]').setValue("agency");
    await wrapper.get('[data-testid="lead-type-new-label"]').setValue("Agency");
    await wrapper.get('[data-testid="lead-type-add"]').trigger("submit");
    await flushPromises();
    expect(api.POST_LeadType).toHaveBeenCalledWith({ code: "AGENCY", label: "Agency", order: 20 });
  });

  it("renames, deactivates and reorders by PATCH", async () => {
    const wrapper = await mountScreen();
    const input = row(wrapper, "WHOLESALE").get("input.ld-input");
    await input.setValue("B2B");
    await input.trigger("change");
    await row(wrapper, "RETAILER").get('[data-testid="lead-type-active"]').setValue(false);
    await flushPromises();
    expect(api.PATCH_LeadType).toHaveBeenCalledWith(2, { label: "B2B" });
    expect(api.PATCH_LeadType).toHaveBeenCalledWith(1, { is_active: false });
    api.PATCH_LeadType.mockClear();
    await row(wrapper, "WHOLESALE").findAll("button")[0].trigger("click");
    await flushPromises();
    expect(api.PATCH_LeadType.mock.calls).toEqual([[2, { order: 0 }], [1, { order: 10 }]]);
  });

  it("a type in use cannot be deleted: the 409 shows on its row", async () => {
    api.DELETE_LeadType.mockRejectedValueOnce({ error: "LEAD_TYPE_IN_USE", message: "companies still carry lead type 'RETAILER'" });
    const wrapper = await mountScreen();
    await row(wrapper, "RETAILER").get('[data-testid="lead-type-delete"]').trigger("click");
    await flushPromises();
    expect(row(wrapper, "RETAILER").get('[data-testid="lead-type-error"]').text()).toContain("companies still carry");
  });

  it("a move locks ↑/↓ until its PATCHes settle, and a failed reorder says so", async () => {
    let fail;
    api.PATCH_LeadType.mockImplementationOnce(() => new Promise((resolve, reject) => (fail = reject)));
    const wrapper = await mountScreen();
    await row(wrapper, "WHOLESALE").findAll("button")[0].trigger("click");
    const arrows = () => wrapper.findAll('[data-testid="lead-type-row"]').flatMap((r) => r.findAll("button").slice(0, 2));
    expect(arrows().every((button) => button.attributes("disabled") !== undefined)).toBe(true);
    fail({ message: "Order not saved" });
    await flushPromises();
    expect(wrapper.get('[data-testid="lead-type-order-error"]').text()).toBe("Order not saved");
    expect(row(wrapper, "RETAILER").findAll("button")[1].attributes("disabled")).toBeUndefined();
  });
});

describe("lead types store", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
    rows.list = [{ id: 1, code: "RETAILER", label: "Retailer", order: 0, is_active: true }];
  });

  it("a failed load is not cached: the next caller asks again; reset (logout) drops the list", async () => {
    const { useLeadTypesStore } = await import("@/stores/leadTypes");
    const store = useLeadTypesStore();
    api.GET_LeadTypes.mockRejectedValueOnce(new Error("offline"));
    await store.load();
    expect(store.all).toEqual([]);
    await store.load();
    expect(store.all.map((type) => type.code)).toEqual(["RETAILER"]);
    await store.load();
    expect(api.GET_LeadTypes).toHaveBeenCalledTimes(2);
    store.reset();
    expect(store.all).toEqual([]);
    await store.load();
    expect(api.GET_LeadTypes).toHaveBeenCalledTimes(3);
  });
});
