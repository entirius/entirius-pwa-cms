import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import { t } from "@/i18n";

const action = (intent, extra = {}) => ({ intent, sequence: "stop", notify: "high", remind_after_days: null, needs_review: false, min_confidence: null, auto_suppress: false, is_default: true, ...extra });
const server = vi.hoisted(() => ({ actions: [] }));
const api = vi.hoisted(() => ({
  GET_ReplyActions: vi.fn(() => Promise.resolve({ data: { results: server.actions.map((a) => ({ ...a })) } })),
  PUT_ReplyAction: vi.fn((intent, body) => Promise.resolve({ data: { intent, is_default: false, auto_suppress: false, ...body } })),
  DELETE_ReplyAction: vi.fn(() => Promise.resolve({ data: {} })),
}));
vi.mock("@/api/communicator/api", () => api);

import ReplyActions from "@/views/Communicator/ReplyActions.vue";
import { mountOptions } from "./communicatorFrame";

const mountScreen = async () => {
  const wrapper = mount(ReplyActions, mountOptions({ Loader: true }));
  await flushPromises();
  return wrapper;
};
const card = (wrapper, intent) => wrapper.get(`[data-testid="action-${intent}"]`);
const setIn = (wrapper, intent, testid, value) => card(wrapper, intent).findComponent(`[data-testid="${testid}"]`).vm.$emit("update:modelValue", value);
const submit = async (wrapper, intent) => {
  await card(wrapper, intent).get("form").trigger("submit");
  await flushPromises();
};

// T4: Leads → Settings → Reply steps.
describe("Leads → Settings → Reply steps", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    server.actions = [action("interested"), action("out_of_office", { sequence: "pause_until_return", notify: "low", is_default: false }), action("unsubscribe")];
  });

  it("offers pause-until-return only for out of office, and auto-suppress only for unsubscribe", async () => {
    const wrapper = await mountScreen();
    const options = (intent) => card(wrapper, intent).findComponent('[data-testid="action-sequence"]').props("options").map((o) => o.value);
    expect(options("interested")).toEqual(["stop", "pause"]);
    expect(options("out_of_office")).toEqual(["stop", "pause", "pause_until_return"]);
    expect(card(wrapper, "interested").find('[data-testid="action-suppress"]').exists()).toBe(false);
    expect(card(wrapper, "unsubscribe").find('[data-testid="action-suppress"]').exists()).toBe(true);
  });

  it("saves the whole mapping of a class: reminder and threshold typed, empty = null", async () => {
    const wrapper = await mountScreen();
    await setIn(wrapper, "interested", "action-sequence", "pause");
    await setIn(wrapper, "interested", "action-notify", "medium");
    await card(wrapper, "interested").get('[data-testid="action-remind"] input').setValue("3");
    await submit(wrapper, "interested");
    expect(api.PUT_ReplyAction).toHaveBeenCalledWith("interested", { sequence: "pause", notify: "medium", remind_after_days: 3, needs_review: false, min_confidence: null });
    expect(card(wrapper, "interested").get('[data-testid="action-message"]').text()).toBe(t("communicator.reply_actions.saved"));
  });

  it("sends auto_suppress for unsubscribe only", async () => {
    const wrapper = await mountScreen();
    await setIn(wrapper, "unsubscribe", "action-suppress", true);
    await submit(wrapper, "unsubscribe");
    expect(api.PUT_ReplyAction).toHaveBeenCalledWith("unsubscribe", expect.objectContaining({ auto_suppress: true }));
  });

  it("refuses a threshold above 1 without calling the API; reset deletes the stored class", async () => {
    const wrapper = await mountScreen();
    await card(wrapper, "interested").get('[data-testid="action-confidence"] input').setValue("1.5");
    await submit(wrapper, "interested");
    expect(api.PUT_ReplyAction).not.toHaveBeenCalled();
    expect(card(wrapper, "interested").get('[data-testid="action-message"]').text()).toBe(t("communicator.reply_actions.confidence_invalid"));
    await card(wrapper, "out_of_office").get('[data-testid="action-reset"]').trigger("click");
    await flushPromises();
    expect(api.DELETE_ReplyAction).toHaveBeenCalledWith("out_of_office");
  });
});
