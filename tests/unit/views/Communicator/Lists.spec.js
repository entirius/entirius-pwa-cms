import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";

const api = vi.hoisted(() => ({
  GET_Templates: vi.fn(),
  GET_Sequences: vi.fn(),
  GET_SequenceTexts: vi.fn(),
  POST_Sequence: vi.fn(),
  POST_SequenceText: vi.fn(),
  GET_Suppressions: vi.fn(),
  POST_Suppression: vi.fn(),
  DELETE_Suppression: vi.fn(),
  PATCH_Sequence: vi.fn(),
}));
const router = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock("@/api/communicator/api", () => api);
const backend = vi.hoisted(() => ({ outbound: false }));
vi.mock("@/stores/munin", () => ({ useMuninStore: () => ({ isModuleEnabled: () => false, isModuleAtLeast: () => backend.outbound }) }));
vi.mock("vue-router", () => ({ useRouter: () => router }));

import SequenceList from "@/views/Communicator/SequenceList.vue";
import SettingsSuppressions from "@/views/Communicator/settings/SettingsSuppressions.vue";
import TemplateList from "@/views/Communicator/TemplateList.vue";
import { control } from "../Leads/leadsFrame";
import { mountOptions } from "./communicatorFrame";

const mountView = async (view) => {
  const wrapper = mount(view, mountOptions({ RouterLink: true, TextPool: true }));
  await flushPromises();
  return wrapper;
};

// Plan 55: the Communicator lists on DataTable — rows keep their test ids, enums read as words (C-13, C-39).
describe("Communicator lists", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
    backend.outbound = false;
    api.GET_Sequences.mockResolvedValue({ data: { results: [] } });
  });

  it("a template row opens the template and names its kind", async () => {
    api.GET_Templates.mockResolvedValue({ data: { results: [{ id: 3, key: "cold", kind: "ai_prompt", language: "pl", current_version_id: 4127, is_active: true }] } });
    const wrapper = await mountView(TemplateList);
    const row = wrapper.get('[data-testid="template-row"]');
    expect(row.text()).toContain("AI prompt");
    // N25: the language by its name, no version id column
    expect(row.text()).toContain("Polish");
    expect(row.text()).not.toContain("4127");
    await row.trigger("click");
    expect(router.push).toHaveBeenCalledWith({ name: "CommunicatorTemplateEdit", params: { id: 3 } });
  });

  it("a sequence key outside letters, digits, - and _ is refused before the create", async () => {
    const wrapper = await mountView(SequenceList);
    await wrapper.get('[data-testid="sequence-key"] input').setValue("bad key");
    await wrapper.get('[data-testid="sequence-add"] form').trigger("submit");
    expect(api.POST_Sequence).not.toHaveBeenCalled();
    // Plan 54d: the error sits on the key field (FormField error, aria-invalid), not in the card.
    const field = wrapper.get('[data-testid="sequence-key"]').element.closest(".form-field");
    expect(field.querySelector(".form-field__error").textContent).toContain("A key may hold only letters, digits, “-” and “_”");
    expect(wrapper.get('[data-testid="sequence-key"] input').attributes("aria-invalid")).toBe("true");
    expect(wrapper.find('[data-testid="sequence-error"]').exists()).toBe(false);
  });

  // Plan 56b: the key error is live after the first refusal, and an older API error does not stay next to it.
  it("the key error clears while the operator fixes the key; a refused key drops the old API error", async () => {
    api.POST_Sequence.mockRejectedValueOnce({ response: { data: { detail: "Key taken" } } });
    const wrapper = await mountView(SequenceList);
    const key = () => wrapper.get('[data-testid="sequence-key"] input');
    const submit = async () => {
      await wrapper.get('[data-testid="sequence-add"] form').trigger("submit");
      await flushPromises();
    };
    await key().setValue("taken");
    await submit();
    expect(wrapper.get('[data-testid="sequence-error"]').text()).toBe("Key taken");
    await key().setValue("bad key");
    await submit();
    expect(wrapper.find('[data-testid="sequence-error"]').exists()).toBe(false);
    expect(key().attributes("aria-invalid")).toBe("true");
    await key().setValue("good_key");
    expect(key().attributes("aria-invalid")).toBeUndefined();
    expect(wrapper.get('[data-testid="sequence-key"]').element.closest(".form-field").querySelector(".form-field__error")).toBeNull();
  });

  it("a valid sequence is created with its steps numbered", async () => {
    api.POST_Sequence.mockResolvedValue({ data: {} });
    const wrapper = await mountView(SequenceList);
    await wrapper.get('[data-testid="sequence-key"] input').setValue("follow_up-2");
    await wrapper.get('[data-testid="sequence-add"] form').trigger("submit");
    await flushPromises();
    expect(api.POST_Sequence).toHaveBeenCalledWith({
      key: "follow_up-2",
      steps: [{ days_after_previous: 3, template_key: "", number: 1 }],
    });
  });

  it("suppressions name their kind and an erased address cannot be removed", async () => {
    api.GET_Suppressions.mockResolvedValue({
      data: { results: [{ id: 1, kind: "domain", value: "shop.test" }, { id: 2, kind: "email_token", value: "x" }] },
    });
    const wrapper = await mountView(SettingsSuppressions);
    const rows = wrapper.findAll('[data-testid="suppression-row"]');
    expect(rows.map((row) => row.find('[data-column="kindText"]').text())).toEqual(["Domain", "Erased address"]);
    expect(rows.map((row) => row.findAll("button").length)).toEqual([1, 0]);
    expect(control(wrapper, "suppression-kind").props("options").map((option) => option.label)).toEqual(["Email", "Domain"]);
  });

  // Plan 14 (communicator >= 0.5.0): each sequence can be turned off and one can start automatically.
  it("the switches save on change; a second autostart is refused and names the one that holds it", async () => {
    backend.outbound = true;
    const sequences = [
      { id: 1, key: "follow-up", is_active: true, autostart: true, steps: [] },
      { id: 2, key: "nurture", is_active: true, autostart: false, steps: [] },
    ];
    api.GET_Sequences.mockResolvedValue({ data: { results: sequences } });
    api.GET_SequenceTexts.mockResolvedValue({ data: { results: [] } });
    api.PATCH_Sequence.mockRejectedValueOnce({ httpStatus: 409, message: "conflict" });
    const BasicCard = { props: ["title", "gap"], template: '<section v-bind="$attrs"><slot name="actions" /><slot /></section>' };
    const wrapper = mount(SequenceList, mountOptions({ RouterLink: true, TextPool: true, BasicCard }));
    await flushPromises();
    expect(wrapper.findAll('[data-testid="sequence-autostart-badge"]')).toHaveLength(1);
    const cards = wrapper.findAll('[data-testid="sequence"]');
    cards[1].findComponent('[data-testid="sequence-autostart"]').vm.$emit("update:modelValue", true);
    await flushPromises();
    expect(api.PATCH_Sequence).toHaveBeenCalledWith(2, { autostart: true });
    expect(wrapper.get('[data-testid="sequence-autostart-error"]').text()).toContain("turn it off on follow-up first");
    api.PATCH_Sequence.mockResolvedValueOnce({ data: {} });
    cards[0].findComponent('[data-testid="sequence-active"]').vm.$emit("update:modelValue", false);
    await flushPromises();
    expect(api.PATCH_Sequence).toHaveBeenLastCalledWith(1, { is_active: false });
  });

  it("an older backend shows no switches", async () => {
    api.GET_Sequences.mockResolvedValue({ data: { results: [{ id: 1, key: "a", is_active: true, steps: [] }] } });
    api.GET_SequenceTexts.mockResolvedValue({ data: { results: [] } });
    const wrapper = await mountView(SequenceList);
    expect(wrapper.find('[data-testid="sequence-active"]').exists()).toBe(false);
  });
});
