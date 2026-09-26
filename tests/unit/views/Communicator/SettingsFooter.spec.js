import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";

const api = vi.hoisted(() => ({
  GET_Footers: vi.fn(),
  GET_Templates: vi.fn(),
  PUT_Footer: vi.fn(),
  DELETE_Footer: vi.fn(),
}));
vi.mock("@/api/communicator/api", () => api);
const notify = vi.hoisted(() => ({ spawnNotification: vi.fn() }));
vi.mock("@/stores/notify", () => ({ useNotifyStore: () => notify }));

import SettingsFooter from "@/views/Communicator/settings/SettingsFooter.vue";

const SegmentedControl = {
  props: ["modelValue", "options", "disabled"],
  emits: ["update:modelValue"],
  template: "<div><button v-for='o in options' :key='o.value' type='button' :disabled='disabled' :data-testid='o.testid' @click=\"$emit('update:modelValue', o.value)\">{{ o.label }}</button></div>",
};
const mountFooter = async () => {
  const wrapper = mount(SettingsFooter, { global: { stubs: { SegmentedControl } } });
  await flushPromises();
  return wrapper;
};

// UX-007: one mail footer per language — HTML around {{ legal }}, sanitised by the server, previewed in a sandbox.
describe("Send settings — mail footer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.GET_Footers.mockResolvedValue({ data: { results: [{ language: "pl", html: "<p>Zespół</p>{{ legal }}" }] } });
    api.GET_Templates.mockResolvedValue({ data: { results: [{ language: "pl" }, { language: "en" }] } });
  });

  it("offers the languages of footers and templates and loads the saved footer", async () => {
    const wrapper = await mountFooter();
    expect(wrapper.findAll('[data-testid^="footer-lang-"]').map((b) => b.text())).toEqual(["EN", "PL"]);
    await wrapper.get('[data-testid="footer-lang-pl"]').trigger("click");
    expect(wrapper.get('[data-testid="footer-html"]').element.value).toBe("<p>Zespół</p>{{ legal }}");
    await wrapper.get('[data-testid="footer-lang-en"]').trigger("click");
    expect(wrapper.get('[data-testid="footer-html"]').element.value).toBe("");
  });

  it("the preview puts the sample legal text where {{ legal }} is, in an empty sandbox", async () => {
    const wrapper = await mountFooter();
    await wrapper.get('[data-testid="footer-lang-pl"]').trigger("click");
    const preview = wrapper.get('[data-testid="footer-preview"]');
    expect(preview.attributes("sandbox")).toBe("");
    expect(preview.attributes("srcdoc")).toContain("<p>Zespół</p><p>");
    expect(preview.attributes("srcdoc")).not.toContain("{{ legal }}");
  });

  it("saves, then shows the sanitised HTML the server answered with", async () => {
    api.PUT_Footer.mockResolvedValue({ data: { language: "pl", html: "<p>Clean</p>{{ legal }}" } });
    const wrapper = await mountFooter();
    await wrapper.get('[data-testid="footer-lang-pl"]').trigger("click");
    await wrapper.get('[data-testid="footer-html"]').setValue("<p onclick='x()'>Clean</p>{{ legal }}");
    await wrapper.get("form").trigger("submit");
    await flushPromises();
    expect(api.PUT_Footer).toHaveBeenCalledWith("pl", "<p onclick='x()'>Clean</p>{{ legal }}");
    expect(wrapper.get('[data-testid="footer-html"]').element.value).toBe("<p>Clean</p>{{ legal }}");
    expect(notify.spawnNotification).toHaveBeenCalled();
  });

  it("a footer without {{ legal }} gets a hint, and the server's refusal shows inline", async () => {
    api.PUT_Footer.mockRejectedValue({
      error: "VALIDATION_ERROR",
      message: "Request validation failed.",
      details: [{ field: "html", description: "The footer must contain {{ legal }} exactly once." }],
    });
    const wrapper = await mountFooter();
    await wrapper.get('[data-testid="footer-html"]').setValue("<p>No legal</p>");
    expect(wrapper.find('[data-testid="footer-hint"]').exists()).toBe(true);
    await wrapper.get("form").trigger("submit");
    await flushPromises();
    expect(wrapper.get('[data-testid="footer-error"]').text()).toBe("The footer must contain {{ legal }} exactly once.");
  });

  it("a save stays bound to its language: the switch is locked until the answer lands under that language", async () => {
    let answer;
    api.PUT_Footer.mockImplementation(() => new Promise((resolve) => (answer = resolve)));
    const wrapper = await mountFooter();
    await wrapper.get('[data-testid="footer-lang-pl"]').trigger("click");
    await wrapper.get('[data-testid="footer-html"]').setValue("<p>Nowa</p>{{ legal }}");
    await wrapper.get("form").trigger("submit");
    expect(wrapper.get('[data-testid="footer-lang-en"]').element.disabled).toBe(true);
    answer({ data: { language: "pl", html: "<p>Nowa</p>{{ legal }}" } });
    await flushPromises();
    expect(api.PUT_Footer).toHaveBeenCalledWith("pl", "<p>Nowa</p>{{ legal }}");
    expect(wrapper.get('[data-testid="footer-lang-en"]').element.disabled).toBe(false);
    await wrapper.get('[data-testid="footer-lang-en"]').trigger("click");
    expect(wrapper.get('[data-testid="footer-html"]').element.value).toBe("");
    await wrapper.get('[data-testid="footer-lang-pl"]').trigger("click");
    expect(wrapper.get('[data-testid="footer-html"]').element.value).toBe("<p>Nowa</p>{{ legal }}");
  });

  it("switching the language over unsaved edits asks first", async () => {
    const wrapper = await mountFooter();
    await wrapper.get('[data-testid="footer-html"]').setValue("<p>Draft</p>{{ legal }}");
    await wrapper.get('[data-testid="footer-lang-pl"]').trigger("click");
    await wrapper.get('[data-testid="confirm-cancel"]').trigger("click");
    expect(wrapper.get('[data-testid="footer-html"]').element.value).toBe("<p>Draft</p>{{ legal }}");
    await wrapper.get('[data-testid="footer-lang-pl"]').trigger("click");
    await wrapper.get('[data-testid="confirm-ok"]').trigger("click");
    expect(wrapper.get('[data-testid="footer-html"]').element.value).toBe("<p>Zespół</p>{{ legal }}");
    expect(api.PUT_Footer).not.toHaveBeenCalled();
  });

  it("a saved footer can be removed after a confirmation", async () => {
    api.DELETE_Footer.mockResolvedValue({ status: 204 });
    const wrapper = await mountFooter();
    expect(wrapper.find('[data-testid="footer-remove"]').exists()).toBe(false); // EN has no footer
    await wrapper.get('[data-testid="footer-lang-pl"]').trigger("click");
    await wrapper.get('[data-testid="footer-remove"]').trigger("click");
    await wrapper.get('[data-testid="confirm-ok"]').trigger("click");
    await flushPromises();
    expect(api.DELETE_Footer).toHaveBeenCalledWith("pl");
    expect(wrapper.get('[data-testid="footer-html"]').element.value).toBe("");
    expect(wrapper.find('[data-testid="footer-remove"]').exists()).toBe(false);
    expect(notify.spawnNotification).toHaveBeenCalled();
  });

  it("footers that cannot load say so quietly; template languages still show", async () => {
    api.GET_Footers.mockRejectedValue({ status: 500 });
    const wrapper = await mountFooter();
    expect(wrapper.find('[data-testid="footer-load-error"]').exists()).toBe(true);
    expect(wrapper.findAll('[data-testid^="footer-lang-"]').map((b) => b.text())).toEqual(["EN", "PL"]);
  });
});
