import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { t } from "@/i18n";
import BasicButton from "@/boots/BasicButton/index.vue";
import BasicInput from "@/boots/BasicInput/index.vue";
import StatusBadge from "@/boots/StatusBadge/index.vue";

const rows = vi.hoisted(() => ({ routes: [] }));
const api = vi.hoisted(() => ({
  GET_Routes: vi.fn(() => Promise.resolve({ data: { results: rows.routes.map((r) => ({ ...r })) } })),
  POST_Route: vi.fn(() => Promise.resolve({ data: {} })),
  PUT_Route: vi.fn(() => Promise.resolve({ data: {} })),
  DELETE_Route: vi.fn(() => Promise.resolve({ data: {} })),
  PATCH_DefaultRoute: vi.fn(() => Promise.resolve({ data: {} })),
}));
const leads = vi.hoisted(() => ({ PATCH_LeadsSettings: vi.fn(() => Promise.resolve({ data: {} })) }));
vi.mock("@/api/communicator/api", () => api);
vi.mock("@/api/leads/api", () => leads);
vi.mock("@/stores/munin", () => ({ useMuninStore: () => ({ isModuleEnabled: () => true }) }));

import Routes from "@/views/Communicator/Routes.vue";
import { leadsFrame } from "../Leads/leadsFrame";

const global = { components: leadsFrame.components, stubs: { ...leadsFrame.stubs, BasicButton, BasicInput, StatusBadge } };
const mountScreen = async () => {
  const wrapper = mount(Routes, { global });
  await flushPromises();
  return wrapper;
};
const route = (fields) => ({
  key: "ecomhouse", name: "Ecom House", from_email: "wiktorw@ecom.house", cc_email: "dw@ecom.house", is_active: true, is_default: false,
  daily_cap: 50, warmup_start_cap: null, warmup_step: 5, warmup_started_on: null, cap_today: 50, sent_today: 12, ...fields,
});
const err = (code) => ({ response: { data: { error: code } } });

// Q11: Communicator → Settings → Sender routes.
describe("Communicator → Settings → Sender routes", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
    rows.routes = [route({ is_default: true }), route({ key: "entirius", name: "Entirius", from_email: "michalk@entirius.com", cc_email: "", daily_cap: 100, cap_today: 5, sent_today: 2, warmup_start_cap: 5, is_active: false })];
  });

  it("lists routes with From, DW, today's counter, the default and a warm-up mark", async () => {
    const wrapper = await mountScreen();
    const [first, second] = wrapper.findAll('[data-testid="route-row"]');
    expect(first.text()).toContain("wiktorw@ecom.house");
    expect(first.text()).toContain("dw@ecom.house");
    expect(first.get('[data-testid="route-cap"]').text()).toContain("12 / 50");
    expect(first.find('[data-testid="route-default-badge"]').exists()).toBe(true);
    expect(first.find('[data-testid="route-make-default"]').exists()).toBe(false);
    expect(second.get('[data-testid="route-cap"]').text()).toContain("2 / 5");
    expect(second.find('[data-testid="route-warmup-badge"]').exists()).toBe(true);
    expect(wrapper.get('[data-testid="routes-default-line"]').text()).toContain("ecomhouse");
  });

  it("an empty list says so", async () => {
    rows.routes = [];
    const wrapper = await mountScreen();
    expect(wrapper.find('[data-testid="routes-empty"]').exists()).toBe(true);
  });

  it("adds a route: the key and From are checked first, then POST with every field", async () => {
    const wrapper = await mountScreen();
    await wrapper.get('[data-testid="route-form"]').trigger("submit");
    expect(api.POST_Route).not.toHaveBeenCalled();
    expect(wrapper.get('[data-testid="route-form-error"]').text()).toBe(t("communicator.routes.key_invalid"));
    await wrapper.get('[data-testid="route-key"] input').setValue("third");
    await wrapper.get('[data-testid="route-form"]').trigger("submit");
    expect(wrapper.get('[data-testid="route-form-error"]').text()).toBe(t("communicator.routes.from_invalid"));
    await wrapper.get('[data-testid="route-from"] input').setValue("x@third.pl");
    await wrapper.get('[data-testid="route-daily-cap"] input').setValue("30");
    await wrapper.get('[data-testid="route-form"]').trigger("submit");
    await flushPromises();
    expect(api.POST_Route).toHaveBeenCalledWith(expect.objectContaining({ key: "third", from_email: "x@third.pl", daily_cap: 30, warmup_start_cap: null, cc_email: "" }));
  });

  it("a warm-up without the daily limit is refused before the call", async () => {
    const wrapper = await mountScreen();
    await wrapper.get('[data-testid="route-key"] input').setValue("third");
    await wrapper.get('[data-testid="route-from"] input').setValue("x@third.pl");
    await wrapper.get('[data-testid="route-warmup-start"] input').setValue("5");
    await wrapper.get('[data-testid="route-form"]').trigger("submit");
    expect(api.POST_Route).not.toHaveBeenCalled();
    expect(wrapper.get('[data-testid="route-form-error"]').text()).toBe(t("communicator.routes.warmup_needs_cap"));
  });

  it("edit replaces the route with PUT and the key stays fixed", async () => {
    const wrapper = await mountScreen();
    await wrapper.findAll('[data-testid="route-edit"]')[0].trigger("click");
    expect(wrapper.find('[data-testid="route-key"]').exists()).toBe(false);
    await wrapper.get('[data-testid="route-cc"] input').setValue("");
    await wrapper.get('[data-testid="route-form"]').trigger("submit");
    await flushPromises();
    expect(api.PUT_Route).toHaveBeenCalledWith("ecomhouse", expect.objectContaining({ cc_email: "", from_email: "wiktorw@ecom.house", daily_cap: 50 }));
    expect(api.PUT_Route.mock.calls[0][1].key).toBeUndefined();
  });

  it("the switch sends the whole route with the one change", async () => {
    const wrapper = await mountScreen();
    wrapper.findAllComponents('[data-testid="route-active"]')[1].vm.$emit("update:modelValue", true);
    await flushPromises();
    expect(api.PUT_Route).toHaveBeenCalledWith("entirius", expect.objectContaining({ is_active: true, warmup_start_cap: 5, daily_cap: 100 }));
  });

  it("make default writes the channel and the leads default; a leads failure only adds a note", async () => {
    const wrapper = await mountScreen();
    await wrapper.get('[data-testid="route-make-default"]').trigger("click");
    await flushPromises();
    expect(api.PATCH_DefaultRoute).toHaveBeenCalledWith("entirius");
    expect(leads.PATCH_LeadsSettings).toHaveBeenCalledWith({ default_sender_route: "entirius" });
    leads.PATCH_LeadsSettings.mockRejectedValueOnce(new Error("x"));
    await wrapper.get('[data-testid="route-make-default"]').trigger("click");
    await flushPromises();
    expect(wrapper.get('[data-testid="routes-notice"]').text()).toBe(t("communicator.routes.leads_default_failed"));
  });

  it("clear default sends an empty key", async () => {
    const wrapper = await mountScreen();
    await wrapper.get('[data-testid="route-clear-default"]').trigger("click");
    await flushPromises();
    expect(api.PATCH_DefaultRoute).toHaveBeenCalledWith("");
  });

  it("deleting asks first; the default route answers 409 in a sentence", async () => {
    const wrapper = await mountScreen();
    await wrapper.findAll('[data-testid="route-delete"]')[0].trigger("click");
    expect(api.DELETE_Route).not.toHaveBeenCalled();
    api.DELETE_Route.mockRejectedValueOnce(err("ROUTE_IS_DEFAULT"));
    await wrapper.get('[data-testid="confirm-dialog-confirm"]').trigger("click");
    await flushPromises();
    expect(api.DELETE_Route).toHaveBeenCalledWith("ecomhouse");
    expect(wrapper.get('[data-testid="route-error"]').text()).toBe(t("communicator.routes.err_is_default"));
  });

  it("an existing key answers 409 ROUTE_EXISTS in a sentence", async () => {
    const wrapper = await mountScreen();
    api.POST_Route.mockRejectedValueOnce(err("ROUTE_EXISTS"));
    await wrapper.get('[data-testid="route-key"] input').setValue("entirius");
    await wrapper.get('[data-testid="route-from"] input').setValue("x@third.pl");
    await wrapper.get('[data-testid="route-form"]').trigger("submit");
    await flushPromises();
    expect(wrapper.get('[data-testid="route-form-error"]').text()).toBe(t("communicator.routes.err_exists"));
  });
});
