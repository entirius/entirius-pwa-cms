import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { t } from "@/i18n";

const rows = vi.hoisted(() => ({ list: [] }));
const api = vi.hoisted(() => ({
  GET_LeadTypes: vi.fn(() => Promise.resolve({ data: { results: rows.list.map((row) => ({ ...row })) } })),
  POST_LeadType: vi.fn(() => Promise.resolve({ data: {} })),
  PATCH_LeadType: vi.fn(() => Promise.resolve({ data: {} })),
  DELETE_LeadType: vi.fn(() => Promise.resolve({ data: {} })),
}));
vi.mock("@/api/leads/api", () => api);

import LeadTypes from "@/views/Leads/LeadTypes.vue";
import { fieldError, leadsFrame, setControl } from "./leadsFrame";

const mountScreen = async () => {
  const wrapper = mount(LeadTypes, { global: leadsFrame });
  await flushPromises();
  return wrapper;
};
const row = (wrapper, code) => wrapper.get(`[data-code="${code}"]`);
// N27: renames, switches and moves wait for the header's one Save
const save = async (wrapper) => {
  await wrapper.get('[data-testid="lead-types-save"]').trigger("click");
  await flushPromises();
};

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
    await setControl(wrapper, "lead-type-new-code", "agency");
    await setControl(wrapper, "lead-type-new-label", "Agency");
    await wrapper.get('[data-testid="lead-type-add"]').trigger("submit");
    await flushPromises();
    expect(api.POST_LeadType).toHaveBeenCalledWith({ code: "AGENCY", label: "Agency", order: 20 });
  });

  it("renames, deactivates and reorders by PATCH on Save", async () => {
    const wrapper = await mountScreen();
    row(wrapper, "WHOLESALE").findComponent('[data-testid="lead-type-label"]').vm.$emit("update:modelValue", "B2B");
    row(wrapper, "RETAILER").findComponent('[data-testid="lead-type-active"]').vm.$emit("update:modelValue", false);
    await flushPromises();
    expect(api.PATCH_LeadType).not.toHaveBeenCalled();
    await save(wrapper);
    expect(api.PATCH_LeadType).toHaveBeenCalledWith(2, { label: "B2B" });
    expect(api.PATCH_LeadType).toHaveBeenCalledWith(1, { is_active: false });
    api.PATCH_LeadType.mockClear();
    await row(wrapper, "WHOLESALE").findAll("button")[0].trigger("click");
    await save(wrapper);
    expect(api.PATCH_LeadType.mock.calls).toEqual([[2, { order: 0 }], [1, { order: 10 }]]);
  });

  it("a type in use cannot be deleted: the 409 shows on its row", async () => {
    api.DELETE_LeadType.mockRejectedValueOnce({ error: "LEAD_TYPE_IN_USE", message: "companies still carry lead type 'RETAILER'" });
    const wrapper = await mountScreen();
    await row(wrapper, "RETAILER").get('[data-testid="lead-type-delete"]').trigger("click");
    await flushPromises();
    expect(row(wrapper, "RETAILER").get('[data-testid="lead-type-error"]').text()).toContain("companies still carry");
  });

  it("a failed reorder says so", async () => {
    api.PATCH_LeadType.mockRejectedValueOnce({ message: "Order not saved" });
    const wrapper = await mountScreen();
    await row(wrapper, "WHOLESALE").findAll("button")[0].trigger("click");
    await save(wrapper);
    expect(wrapper.get('[data-testid="lead-type-order-error"]').text()).toBe("Order not saved");
  });
});

it("Save is greyed until something changed", async () => {
  setActivePinia(createPinia());
  vi.clearAllMocks();
  const wrapper = await mountScreen();
  expect(wrapper.get('[data-testid="lead-types-save"]').attributes("disabled")).toBeDefined();
  expect(api.PATCH_LeadType).not.toHaveBeenCalled();
});

// Plan 53: the code is checked before the request, as the native pattern did.
it("a code outside letters, digits and _ is refused before the request", async () => {
  setActivePinia(createPinia());
  vi.clearAllMocks();
  const wrapper = await mountScreen();
  await setControl(wrapper, "lead-type-new-code", "B2B-SHOP");
  await setControl(wrapper, "lead-type-new-label", "Shop");
  await wrapper.get('[data-testid="lead-type-add"]').trigger("submit");
  await flushPromises();
  expect(api.POST_LeadType).not.toHaveBeenCalled();
  // T7 (walk 4): on the Code field, not under the form
  expect(fieldError(wrapper, "leads.lead_types.code")).toBe(t("leads.lead_types.code_invalid"));
});

// A refused rename stays on its row with the edit; the next Save sends it again.
it("a refused rename keeps the edit and the next Save retries it", async () => {
  setActivePinia(createPinia());
  vi.clearAllMocks();
  api.PATCH_LeadType.mockRejectedValueOnce({ response: { data: { detail: "Busy" } } });
  const wrapper = await mountScreen();
  row(wrapper, "RETAILER").findComponent('[data-testid="lead-type-label"]').vm.$emit("update:modelValue", "Shops");
  await save(wrapper);
  expect(wrapper.get('[data-testid="lead-type-error"]').text()).toBe("Busy");
  await save(wrapper);
  expect(api.PATCH_LeadType.mock.calls).toEqual([[1, { label: "Shops" }], [1, { label: "Shops" }]]);
});

it("an empty label is a field error before the request", async () => {
  setActivePinia(createPinia());
  vi.clearAllMocks();
  const wrapper = await mountScreen();
  await setControl(wrapper, "lead-type-new-code", "SHOP");
  await setControl(wrapper, "lead-type-new-label", "");
  await wrapper.get('[data-testid="lead-type-add"]').trigger("submit");
  await flushPromises();
  expect(api.POST_LeadType).not.toHaveBeenCalled();
  expect(fieldError(wrapper, "leads.lead_types.label")).toBe("Give the label");
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
