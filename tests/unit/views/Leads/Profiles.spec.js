import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { t } from "@/i18n";
import BasicButton from "@/boots/BasicButton/index.vue";
import BasicInput from "@/boots/BasicInput/index.vue";
import BasicTextarea from "@/boots/BasicTextarea/index.vue";

const api = vi.hoisted(() => ({
  GET_Profiles: vi.fn((kind) =>
    Promise.resolve({
      data: { results: kind === "analysis-profiles" ? [{ id: 1, key: "leads.analysis", model: "fake-chat", is_active: true }] : [{ id: 2, key: "leads.pick", model: "fake-chat" }] },
    })
  ),
  GET_Profile: vi.fn(() => Promise.resolve({ data: { id: 1, key: "leads.analysis", model: "fake-chat", is_active: true, prompt_text: "Analyse {{ company }}", json_schema: { type: "object" } } })),
  POST_Profile: vi.fn(() => Promise.resolve({ data: {} })),
  PATCH_Profile: vi.fn(() => Promise.resolve({ data: {} })),
  DELETE_Profile: vi.fn(() => Promise.resolve({ data: {} })),
}));
vi.mock("@/api/leads/api", () => api);

import Profiles from "@/views/Leads/Profiles.vue";
import { leadsFrame } from "./leadsFrame";

const global = { components: leadsFrame.components, stubs: { ...leadsFrame.stubs, BasicButton, BasicInput, BasicTextarea } };
const mountScreen = async () => {
  const wrapper = mount(Profiles, { global });
  await flushPromises();
  return wrapper;
};
const section = (wrapper, kind) => wrapper.get(`[data-testid="profiles-${kind}"]`);

// S5: Leads → Settings → Analysis and recipient profiles.
describe("Leads → Settings → Profiles", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  it("lists both kinds; only the analysis profile has an active switch", async () => {
    const wrapper = await mountScreen();
    expect(section(wrapper, "analysis-profiles").text()).toContain("leads.analysis");
    expect(section(wrapper, "recipient-profiles").text()).toContain("leads.pick");
    expect(section(wrapper, "analysis-profiles").findComponent('[data-testid="profile-active"]').exists()).toBe(true);
    expect(section(wrapper, "recipient-profiles").findComponent('[data-testid="profile-active"]').exists()).toBe(false);
  });

  it("edit loads the prompt from the detail and PATCHes the change", async () => {
    const wrapper = await mountScreen();
    const analysis = section(wrapper, "analysis-profiles");
    await analysis.get('[data-testid="profile-edit"]').trigger("click");
    await flushPromises();
    expect(api.GET_Profile).toHaveBeenCalledWith("analysis-profiles", 1);
    expect(analysis.get('[data-testid="profile-prompt"] textarea').element.value).toBe("Analyse {{ company }}");
    await analysis.get('[data-testid="profile-prompt"] textarea').setValue("New prompt");
    await analysis.get('[data-testid="profile-form"]').trigger("submit");
    await flushPromises();
    expect(api.PATCH_Profile).toHaveBeenCalledWith("analysis-profiles", 1, { key: "leads.analysis", model: "fake-chat", prompt_text: "New prompt", json_schema: { type: "object" }, is_active: true });
  });

  it("adds a recipient profile without is_active; an invalid schema is refused first", async () => {
    const wrapper = await mountScreen();
    const recipient = section(wrapper, "recipient-profiles");
    await recipient.get('[data-testid="profile-key"] input').setValue("leads.pick2");
    await recipient.get('[data-testid="profile-model"] input').setValue("fake-chat");
    await recipient.get('[data-testid="profile-prompt"] textarea').setValue("Pick");
    await recipient.get('[data-testid="profile-schema"] textarea').setValue("{oops");
    await recipient.get('[data-testid="profile-form"]').trigger("submit");
    expect(api.POST_Profile).not.toHaveBeenCalled();
    expect(recipient.get('[data-testid="profile-form-error"]').text()).toBe(t("leads.profiles.schema_invalid"));
    await recipient.get('[data-testid="profile-schema"] textarea').setValue("{}");
    await recipient.get('[data-testid="profile-form"]').trigger("submit");
    await flushPromises();
    expect(api.POST_Profile).toHaveBeenCalledWith("recipient-profiles", { key: "leads.pick2", model: "fake-chat", prompt_text: "Pick", json_schema: {} });
  });

  it("deletes a profile", async () => {
    const wrapper = await mountScreen();
    await section(wrapper, "recipient-profiles").get('[data-testid="profile-delete"]').trigger("click");
    await flushPromises();
    expect(api.DELETE_Profile).toHaveBeenCalledWith("recipient-profiles", 2);
  });
});
