import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import { t } from "@/i18n";
import BasicButton from "@/boots/BasicButton/index.vue";
import StatusBadge from "@/boots/StatusBadge/index.vue";

const route = (intent, extra = {}) => ({ intent, action: "reply_stage", stage_id: null, stage_key: null, flag_contact: false, is_default: true, ...extra });
const server = vi.hoisted(() => ({ routes: [] }));
const api = vi.hoisted(() => ({
  GET_ReplyRoutes: vi.fn(() => Promise.resolve({ data: { results: server.routes.map((r) => ({ ...r })) } })),
  GET_Stages: vi.fn(() => Promise.resolve({ data: { results: [{ id: 5, key: "contacted", label: "Contacted" }, { id: 6, key: "lost", label: "Lost" }] } })),
  PUT_ReplyRoute: vi.fn((intent, body) => Promise.resolve({ data: { intent, stage_key: null, is_default: false, stage_id: null, ...body } })),
  DELETE_ReplyRoute: vi.fn(() => Promise.resolve({ data: {} })),
}));
vi.mock("@/api/leads/api", () => api);

import ReplyRoutes from "@/views/Leads/ReplyRoutes.vue";
import { leadsFrame, setControl } from "./leadsFrame";

const global = { components: leadsFrame.components, stubs: { ...leadsFrame.stubs, BasicButton, StatusBadge, Loader: true } };
const mountScreen = async () => {
  const wrapper = mount(ReplyRoutes, { global });
  await flushPromises();
  return wrapper;
};
const card = (wrapper, intent) => wrapper.get(`[data-testid="route-${intent}"]`);
const inCard = (wrapper, intent, testid) => card(wrapper, intent).get(`[data-testid="${testid}"]`);
const setIn = (wrapper, intent, testid, value) => card(wrapper, intent).findComponent(`[data-testid="${testid}"]`).vm.$emit("update:modelValue", value);

// T4: Leads → Settings → Reply routes.
describe("Leads → Settings → Reply routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    server.routes = [route("interested"), route("out_of_office", { action: "none" }), route("not_interested", { action: "stage", stage_id: 6, stage_key: "lost", is_default: false })];
  });

  it("shows a card per reply class, named, with the default marked", async () => {
    const wrapper = await mountScreen();
    expect(wrapper.findAllComponents({ name: "BasicCard" }).map((c) => c.props("title"))).toEqual([t("leads.intent.interested"), t("leads.intent.out_of_office"), t("leads.intent.not_interested")]);
    expect(card(wrapper, "interested").find('[data-testid="route-default"]').exists()).toBe(true);
    expect(card(wrapper, "not_interested").find('[data-testid="route-default"]').exists()).toBe(false);
    expect(card(wrapper, "not_interested").find('[data-testid="route-stage"]').exists()).toBe(true);
  });

  it("saves a stage move: the stage is required first and only sent for that action", async () => {
    const wrapper = await mountScreen();
    await setIn(wrapper, "interested", "route-action", "stage");
    await card(wrapper, "interested").get("form").trigger("submit");
    expect(api.PUT_ReplyRoute).not.toHaveBeenCalled();
    expect(inCard(wrapper, "interested", "route-message").text()).toBe(t("leads.reply_routes.stage_required"));
    await setIn(wrapper, "interested", "route-stage", 5);
    await card(wrapper, "interested").get("form").trigger("submit");
    await flushPromises();
    expect(api.PUT_ReplyRoute).toHaveBeenCalledWith("interested", { action: "stage", flag_contact: false, stage_id: 5 });
    expect(inCard(wrapper, "interested", "route-message").text()).toBe(t("leads.reply_routes.saved"));
  });

  it("flags the contact and sends no stage for the other actions", async () => {
    const wrapper = await mountScreen();
    await setIn(wrapper, "out_of_office", "route-flag", true);
    await card(wrapper, "out_of_office").get("form").trigger("submit");
    await flushPromises();
    expect(api.PUT_ReplyRoute).toHaveBeenCalledWith("out_of_office", { action: "none", flag_contact: true });
  });

  it("goes back to the default of a stored class, and says when the API refuses", async () => {
    const wrapper = await mountScreen();
    expect(card(wrapper, "interested").find('[data-testid="route-reset"]').exists()).toBe(false);
    await inCard(wrapper, "not_interested", "route-reset").trigger("click");
    await flushPromises();
    expect(api.DELETE_ReplyRoute).toHaveBeenCalledWith("not_interested");
    api.PUT_ReplyRoute.mockRejectedValueOnce({ response: { status: 400, data: { detail: "Nope" } } });
    await card(wrapper, "interested").get("form").trigger("submit");
    await flushPromises();
    expect(inCard(wrapper, "interested", "route-message").classes()).toContain("t-negative");
  });
});
