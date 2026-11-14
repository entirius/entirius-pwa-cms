import { describe, it, expect, vi, beforeEach } from "vitest";
import { flushPromises } from "@vue/test-utils";

const api = vi.hoisted(() => ({ GET_Models: vi.fn(), GET_ReplyClassProfile: vi.fn(), PUT_ReplyClassProfile: vi.fn() }));
vi.mock("@/api/communicator/api", () => api);
const health = vi.hoisted(() => ({ aiUsable: true }));
vi.mock("@/stores/configHealth", () => ({ useConfigHealthStore: () => health }));

import ReplyClassification from "@/views/Leads/ReplyClassification.vue";
import { fieldError } from "./leadsFrame";
import { byTestid, mountOutbound } from "./outboundFrame";

const profile = { prompt_text: "Sort it", model: "fake-mini", min_confidence: 0.7, max_chars: 3000, is_active: true };
const mounted = async (options = {}) => {
  const wrapper = mountOutbound(ReplyClassification, { area: "communicator.content", ...options });
  await flushPromises();
  return wrapper;
};

// Plan 14: Settings → Reply classification — the AI profile of the channel.
describe("Leads → Settings → Reply classification", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    health.aiUsable = true;
    api.GET_Models.mockResolvedValue({ data: { results: [{ model_id: "fake-mini", provider: "fake" }] } });
    api.GET_ReplyClassProfile.mockResolvedValue({ data: profile });
    api.PUT_ReplyClassProfile.mockResolvedValue({ data: profile });
  });

  it("shows the confidence in percent and saves it as a fraction", async () => {
    const wrapper = await mounted();
    expect(wrapper.findComponent('[data-testid="classify-min-confidence"]').props("modelValue")).toBe("70");
    expect(byTestid(wrapper, "classify-save").attributes("disabled")).toBeDefined(); // N27: nothing to save yet
    wrapper.findComponent('[data-testid="classify-min-confidence"]').vm.$emit("update:modelValue", "85");
    await flushPromises();
    await byTestid(wrapper, "classify-save").trigger("click");
    await flushPromises();
    expect(api.PUT_ReplyClassProfile).toHaveBeenCalledWith({ ...profile, min_confidence: 0.85 });
  });

  it("no profile yet: an empty, inactive form; toolbox off says replies are not sorted", async () => {
    api.GET_ReplyClassProfile.mockRejectedValueOnce({ httpStatus: 404 });
    health.aiUsable = false;
    const wrapper = await mounted();
    expect(byTestid(wrapper, "classify-inactive").exists()).toBe(true);
    expect(byTestid(wrapper, "classify-toolbox-off").exists()).toBe(true);
    expect(api.GET_Models).not.toHaveBeenCalled();
  });

  it("a failed load, field errors and read-only", async () => {
    api.GET_ReplyClassProfile.mockRejectedValueOnce({ message: "down" });
    expect(byTestid(await mounted(), "classify-error").text()).toBe("down");
    api.PUT_ReplyClassProfile.mockRejectedValueOnce({ response: { data: { error: "VALIDATION", message: "bad", details: [{ field: "model", description: "unknown model" }] } } });
    const wrapper = await mounted();
    wrapper.findComponent('[data-testid="classify-min-confidence"]').vm.$emit("update:modelValue", "85");
    await flushPromises();
    await byTestid(wrapper, "classify-save").trigger("click");
    await flushPromises();
    // T7 (walk 4): an API message outside the known ones never prints raw
    expect(fieldError(wrapper, "leads.classify.model")).toBe("Check this field");
    expect(byTestid(await mounted({ write: false }), "classify-save").exists()).toBe(false);
  });
});
