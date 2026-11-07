import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { t } from "@/i18n";
import BasicButton from "@/boots/BasicButton/index.vue";
import BasicInput from "@/boots/BasicInput/index.vue";

const rows = vi.hoisted(() => ({ rules: [] }));
const api = vi.hoisted(() => ({
  GET_Rules: vi.fn(() => Promise.resolve({ data: { results: rows.rules.map((r) => ({ ...r })) } })),
  GET_Stages: vi.fn(() => Promise.resolve({ data: { results: [{ id: 5, label: "Contacted" }, { id: 6, label: "Replied" }] } })),
  POST_Rule: vi.fn(() => Promise.resolve({ data: {} })),
  PATCH_Rule: vi.fn(() => Promise.resolve({ data: {} })),
  DELETE_Rule: vi.fn(() => Promise.resolve({ data: {} })),
}));
vi.mock("@/api/leads/api", () => api);

import Rules from "@/views/Leads/Rules.vue";
import { leadsFrame, setControl } from "./leadsFrame";

const global = { components: leadsFrame.components, stubs: { ...leadsFrame.stubs, BasicButton, BasicInput } };
const mountScreen = async () => {
  const wrapper = mount(Rules, { global });
  await flushPromises();
  return wrapper;
};
const rule = { id: 1, trigger: "stage_entered", stage_id: 5, action: "communicate", template_key: "lead.cold.b2b", contact_strategy: "primary", require_hooks: true, require_email: true, cooldown_hours: 24, is_active: true, order: 0 };

// S5: Leads → Settings → Rules.
describe("Leads → Settings → Rules", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
    rows.rules = [{ ...rule }];
  });

  it("lists a rule with its stage and template", async () => {
    const wrapper = await mountScreen();
    const text = wrapper.get('[data-testid="rule-row"]').text();
    expect(text).toContain("Contacted");
    expect(text).toContain("lead.cold.b2b");
  });

  it("adds a rule: the stage and the template are required first", async () => {
    const wrapper = await mountScreen();
    await wrapper.get('[data-testid="rule-form"]').trigger("submit");
    expect(api.POST_Rule).not.toHaveBeenCalled();
    expect(wrapper.get('[data-testid="rule-form-error"]').text()).toBe(t("leads.rules.stage_required"));
    await setControl(wrapper, "rule-stage", 6);
    await wrapper.get('[data-testid="rule-form"]').trigger("submit");
    expect(wrapper.get('[data-testid="rule-form-error"]').text()).toBe(t("leads.rules.template_required"));
    await wrapper.get('[data-testid="rule-template"] input').setValue("lead.followup");
    await wrapper.get('[data-testid="rule-form"]').trigger("submit");
    await flushPromises();
    expect(api.POST_Rule).toHaveBeenCalledWith(expect.objectContaining({ trigger: "stage_entered", stage_id: 6, action: "communicate", template_key: "lead.followup", cooldown_hours: 24 }));
  });

  it("an intel_ready rule sends no stage", async () => {
    const wrapper = await mountScreen();
    await setControl(wrapper, "rule-trigger", "intel_ready");
    await setControl(wrapper, "rule-action", "request_audit");
    await wrapper.get('[data-testid="rule-form"]').trigger("submit");
    await flushPromises();
    expect(api.POST_Rule).toHaveBeenCalledWith(expect.objectContaining({ trigger: "intel_ready", stage_id: null, action: "request_audit", template_key: "" }));
  });

  it("edits by PATCH, toggles and deletes", async () => {
    const wrapper = await mountScreen();
    await wrapper.get('[data-testid="rule-edit"]').trigger("click");
    await wrapper.get('[data-testid="rule-template"] input').setValue("lead.other");
    await wrapper.get('[data-testid="rule-form"]').trigger("submit");
    await flushPromises();
    expect(api.PATCH_Rule).toHaveBeenCalledWith(1, expect.objectContaining({ template_key: "lead.other", stage_id: 5 }));
    wrapper.findComponent('[data-testid="rule-active"]').vm.$emit("update:modelValue", false);
    await flushPromises();
    expect(api.PATCH_Rule).toHaveBeenCalledWith(1, { is_active: false });
    await wrapper.get('[data-testid="rule-delete"]').trigger("click");
    await flushPromises();
    expect(api.DELETE_Rule).toHaveBeenCalledWith(1);
  });

  it("shows a refusal of the API on the form", async () => {
    api.POST_Rule.mockRejectedValueOnce({ response: { status: 400, data: { detail: "Nope" } } });
    const wrapper = await mountScreen();
    await setControl(wrapper, "rule-stage", 6);
    await wrapper.get('[data-testid="rule-template"] input').setValue("x");
    await wrapper.get('[data-testid="rule-form"]').trigger("submit");
    await flushPromises();
    expect(wrapper.find('[data-testid="rule-form-error"]').exists()).toBe(true);
  });
});
