import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import { t } from "@/i18n";
import BasicButton from "@/boots/BasicButton/index.vue";
import BasicInput from "@/boots/BasicInput/index.vue";

const rows = vi.hoisted(() => ({ profiles: [] }));
const api = vi.hoisted(() => ({
  GET_ScoringProfiles: vi.fn(() => Promise.resolve({ data: { results: rows.profiles.map((p) => ({ ...p })) } })),
  POST_ScoringProfile: vi.fn(() => Promise.resolve({ data: {} })),
  PATCH_ScoringProfile: vi.fn(() => Promise.resolve({ data: {} })),
  DELETE_ScoringProfile: vi.fn(() => Promise.resolve({ data: {} })),
}));
vi.mock("@/api/leads/api", () => api);

import Scoring from "@/views/Leads/Scoring.vue";
import { leadsFrame, setControl } from "./leadsFrame";

const global = { components: leadsFrame.components, stubs: { ...leadsFrame.stubs, BasicButton, BasicInput } };
const mountScreen = async () => {
  const wrapper = mount(Scoring, { global });
  await flushPromises();
  return wrapper;
};
const submit = async (wrapper) => {
  await wrapper.get('[data-testid="scoring-form"]').trigger("submit");
  await flushPromises();
};
const profile = {
  id: 1,
  key: "default",
  thresholds: { S: 20, M: 40, L: 70 },
  rules: [{ field: "lead_type", op: "in", value: ["RETAILER"], label: "retailer", points: 30 }],
  disqualifiers: [{ field: "platform", op: "eq", value: "marketplace", label: "marketplace" }],
  is_active: true,
};

// T3: Leads → Settings → Scoring.
describe("Leads → Settings → Scoring", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    rows.profiles = [structuredClone(profile)];
  });

  it("lists a profile with its thresholds and the number of rules", async () => {
    const wrapper = await mountScreen();
    const text = wrapper.get('[data-testid="scoring-row"]').text();
    expect(text).toContain("default");
    expect(text).toContain('leads.scoring.summary::{"S":20,"M":40,"L":70}'); // $t in the template is the key in specs
    expect(text).toContain('leads.scoring.counts.rules::{"count":1}');
  });

  it("adds a profile: a rule row is typed on save (a list for “is one of”, integer points)", async () => {
    const wrapper = await mountScreen();
    await wrapper.get('[data-testid="scoring-add-rules"]').trigger("click");
    await wrapper.get('[data-testid="scoring-add-disqualifiers"]').trigger("click");
    const conds = () => wrapper.findAll('[data-testid="scoring-cond"]');
    await conds()[0].get('[data-testid="cond-value"] input').setValue("RETAILER, WHOLESALER");
    await conds()[0].get('[data-testid="cond-points"] input').setValue("25");
    await submit(wrapper); // the disqualifier row is still empty
    expect(api.POST_ScoringProfile).not.toHaveBeenCalled();
    expect(wrapper.get('[data-testid="scoring-form-error"]').text()).toBe(t("leads.scoring.row_invalid"));
    await conds()[1].get('[data-testid="cond-value"] input').setValue("RETAILER");
    await submit(wrapper);
    expect(api.POST_ScoringProfile).toHaveBeenCalledWith(
      expect.objectContaining({
        thresholds: { S: 20, M: 40, L: 70 },
        rules: [{ field: "lead_type", op: "in", value: ["RETAILER", "WHOLESALER"], label: "", points: 25 }],
        disqualifiers: [{ field: "lead_type", op: "in", value: ["RETAILER"], label: "" }],
        is_active: true,
      })
    );
  });

  it("refuses thresholds out of order before calling the API", async () => {
    const wrapper = await mountScreen();
    await wrapper.get('[data-testid="scoring-threshold-S"] input').setValue("90");
    await submit(wrapper);
    expect(api.POST_ScoringProfile).not.toHaveBeenCalled();
    expect(wrapper.get('[data-testid="scoring-form-error"]').text()).toBe(t("leads.scoring.thresholds_order"));
  });

  it("edits by PATCH with the saved rows in the form, toggles and deletes", async () => {
    const wrapper = await mountScreen();
    await wrapper.get('[data-testid="scoring-edit"]').trigger("click");
    expect(wrapper.get('[data-testid="cond-value"] input').element.value).toBe("RETAILER");
    await wrapper.get('[data-testid="scoring-threshold-L"] input').setValue("80");
    await submit(wrapper);
    expect(api.PATCH_ScoringProfile).toHaveBeenCalledWith(1, expect.objectContaining({ key: "default", thresholds: { S: 20, M: 40, L: 80 } }));
    wrapper.findComponent('[data-testid="scoring-active"]').vm.$emit("update:modelValue", false);
    await flushPromises();
    expect(api.PATCH_ScoringProfile).toHaveBeenCalledWith(1, { is_active: false });
    await wrapper.get('[data-testid="scoring-delete"]').trigger("click");
    await flushPromises();
    expect(api.DELETE_ScoringProfile).toHaveBeenCalledWith(1);
  });

  it("shows the refusal of the API on the form", async () => {
    api.POST_ScoringProfile.mockRejectedValueOnce({ response: { status: 400, data: { detail: "Nope" } } });
    const wrapper = await mountScreen();
    await submit(wrapper);
    expect(wrapper.find('[data-testid="scoring-form-error"]').exists()).toBe(true);
  });
});
