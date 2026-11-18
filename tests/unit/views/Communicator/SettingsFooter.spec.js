import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";

const api = vi.hoisted(() => ({
  GET_Footers: vi.fn(),
  GET_Templates: vi.fn(),
  PUT_Footer: vi.fn(),
  DELETE_Footer: vi.fn(),
  GET_Mailboxes: vi.fn(),
}));
vi.mock("@/api/communicator/api", () => api);
const notify = vi.hoisted(() => ({ spawnNotification: vi.fn() }));
vi.mock("@/stores/notify", () => ({ useNotifyStore: () => notify }));

import SettingsFooter from "@/views/Communicator/settings/SettingsFooter.vue";
import { mountOptions } from "./communicatorFrame";

const SegmentedControl = {
  props: ["modelValue", "options", "disabled"],
  emits: ["update:modelValue"],
  template: "<div><button v-for='o in options' :key='o.value' type='button' :disabled='disabled' :data-testid='o.testid' @click=\"$emit('update:modelValue', o.value)\">{{ o.label }}</button></div>",
};
const BasicSelect = {
  name: "BasicSelect",
  props: ["modelValue", "options", "disabled", "floatingLabel"],
  emits: ["update:modelValue"],
  template: "<div><button v-for='o in options' :key='o.value' type='button' :data-testid='`brand-${o.value || \"all\"}`' @click=\"$emit('update:modelValue', o.value)\">{{ o.label }}</button></div>",
};
const mountFooter = async () => {
  const wrapper = mount(SettingsFooter, mountOptions({ SegmentedControl, BasicSelect }));
  await flushPromises();
  return wrapper;
};

// UX-007: one mail footer per language — HTML around {{ legal }}, sanitised by the server, previewed in a sandbox.
describe("Send settings — mail footer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.GET_Footers.mockResolvedValue({ data: { results: [{ language: "pl", html: "<p>Zespół</p>{{ legal }}" }] } });
    api.GET_Templates.mockResolvedValue({ data: { results: [{ language: "pl" }, { language: "en" }] } });
    api.GET_Mailboxes.mockResolvedValue({ data: { results: [{ id: 1, brand: "" }] } });
  });

  it("offers the languages of footers and templates and loads the saved footer", async () => {
    const wrapper = await mountFooter();
    expect(wrapper.findAll('[data-testid^="footer-lang-"]').map((b) => b.text())).toEqual(["EN", "PL"]);
    await wrapper.get('[data-testid="footer-lang-pl"]').trigger("click");
    expect(wrapper.get('[data-testid="footer-html"] textarea').element.value).toBe("<p>Zespół</p>{{ legal }}");
    await wrapper.get('[data-testid="footer-lang-en"]').trigger("click");
    expect(wrapper.get('[data-testid="footer-html"] textarea').element.value).toBe("");
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
    await wrapper.get('[data-testid="footer-html"] textarea').setValue("<p onclick='x()'>Clean</p>{{ legal }}");
    wrapper.vm.save();
    await flushPromises();
    expect(api.PUT_Footer).toHaveBeenCalledWith("pl", { html: "<p onclick='x()'>Clean</p>{{ legal }}", unsubscribe_label: "" }, "");
    expect(wrapper.get('[data-testid="footer-html"] textarea').element.value).toBe("<p>Clean</p>{{ legal }}");
  });

  it("a footer without {{ legal }} gets a hint, and the server's refusal shows inline", async () => {
    api.PUT_Footer.mockRejectedValue({
      error: "VALIDATION_ERROR",
      message: "Request validation failed.",
      details: [{ field: "html", description: "The footer must contain {{ legal }} exactly once." }],
    });
    const wrapper = await mountFooter();
    await wrapper.get('[data-testid="footer-html"] textarea').setValue("<p>No legal</p>");
    expect(wrapper.find('[data-testid="footer-hint"]').exists()).toBe(true);
    wrapper.vm.save();
    await flushPromises();
    expect(wrapper.get('[data-testid="footer-error"]').text()).toBe("The footer must contain {{ legal }} exactly once.");
  });

  it("a save stays bound to its language: the switch is locked until the answer lands under that language", async () => {
    let answer;
    api.PUT_Footer.mockImplementation(() => new Promise((resolve) => (answer = resolve)));
    const wrapper = await mountFooter();
    await wrapper.get('[data-testid="footer-lang-pl"]').trigger("click");
    await wrapper.get('[data-testid="footer-html"] textarea').setValue("<p>Nowa</p>{{ legal }}");
    wrapper.vm.save();
    await wrapper.vm.$nextTick();
    expect(wrapper.get('[data-testid="footer-lang-en"]').element.disabled).toBe(true);
    answer({ data: { language: "pl", html: "<p>Nowa</p>{{ legal }}" } });
    await flushPromises();
    expect(api.PUT_Footer).toHaveBeenCalledWith("pl", { html: "<p>Nowa</p>{{ legal }}", unsubscribe_label: "" }, "");
    expect(wrapper.get('[data-testid="footer-lang-en"]').element.disabled).toBe(false);
    await wrapper.get('[data-testid="footer-lang-en"]').trigger("click");
    expect(wrapper.get('[data-testid="footer-html"] textarea').element.value).toBe("");
    await wrapper.get('[data-testid="footer-lang-pl"]').trigger("click");
    expect(wrapper.get('[data-testid="footer-html"] textarea').element.value).toBe("<p>Nowa</p>{{ legal }}");
  });

  it("switching the language over unsaved edits asks first", async () => {
    const wrapper = await mountFooter();
    await wrapper.get('[data-testid="footer-html"] textarea').setValue("<p>Draft</p>{{ legal }}");
    await wrapper.get('[data-testid="footer-lang-pl"]').trigger("click");
    await wrapper.get('[data-testid="confirm-dialog-cancel"]').trigger("click");
    expect(wrapper.get('[data-testid="footer-html"] textarea').element.value).toBe("<p>Draft</p>{{ legal }}");
    await wrapper.get('[data-testid="footer-lang-pl"]').trigger("click");
    await wrapper.get('[data-testid="confirm-dialog-confirm"]').trigger("click");
    expect(wrapper.get('[data-testid="footer-html"] textarea').element.value).toBe("<p>Zespół</p>{{ legal }}");
    expect(api.PUT_Footer).not.toHaveBeenCalled();
  });

  it("a saved footer can be removed after a confirmation", async () => {
    api.DELETE_Footer.mockResolvedValue({ status: 204 });
    const wrapper = await mountFooter();
    expect(wrapper.find('[data-testid="footer-remove"]').exists()).toBe(false); // EN has no footer
    await wrapper.get('[data-testid="footer-lang-pl"]').trigger("click");
    await wrapper.get('[data-testid="footer-remove"]').trigger("click");
    await wrapper.get('[data-testid="confirm-dialog-confirm"]').trigger("click");
    await flushPromises();
    expect(api.DELETE_Footer).toHaveBeenCalledWith("pl", "");
    expect(wrapper.get('[data-testid="footer-html"] textarea').element.value).toBe("");
    expect(wrapper.find('[data-testid="footer-remove"]').exists()).toBe(false);
  });

  // C-29: an empty field previews the mail without a footer — the sample legal text alone, never a blank page.
  it("an empty footer previews the legal text alone", async () => {
    const wrapper = await mountFooter();
    await wrapper.get('[data-testid="footer-lang-en"]').trigger("click");
    const srcdoc = wrapper.get('[data-testid="footer-preview"]').attributes("srcdoc");
    expect(srcdoc).toContain("<p>");
    expect(srcdoc).not.toContain("{{ legal }}");
  });

  it("footers that cannot load say so quietly; template languages still show", async () => {
    api.GET_Footers.mockRejectedValue({ status: 500 });
    const wrapper = await mountFooter();
    expect(wrapper.find('[data-testid="footer-load-error"]').exists()).toBe(true);
    expect(wrapper.findAll('[data-testid^="footer-lang-"]').map((b) => b.text())).toEqual(["EN", "PL"]);
  });

  it("no brand on any mailbox: no brand selector, the footer is for every brand", async () => {
    const wrapper = await mountFooter();
    expect(wrapper.find('[data-testid="footer-brand"]').exists()).toBe(false);
  });

  // U23: a footer per brand and language; blank brand = every brand without its own footer.
  it("a brand has its own footer, saved and removed under that brand", async () => {
    api.GET_Mailboxes.mockResolvedValue({ data: { results: [{ id: 1, brand: "ecom.house" }, { id: 2, brand: "entirius" }] } });
    api.GET_Footers.mockResolvedValue({
      data: {
        results: [
          { language: "pl", brand: "", html: "<p>Wszyscy</p>{{ legal }}", unsubscribe_label: "" },
          { language: "pl", brand: "ecom.house", html: "<p>Ecom</p>{{ legal }}", unsubscribe_label: "Wypisz mnie" },
        ],
      },
    });
    api.PUT_Footer.mockResolvedValue({ data: { language: "pl", brand: "ecom.house", html: "<p>Ecom 2</p>{{ legal }}", unsubscribe_label: "Wypisz mnie" } });
    api.DELETE_Footer.mockResolvedValue({ status: 204 });
    const wrapper = await mountFooter();
    const textarea = () => wrapper.get('[data-testid="footer-html"] textarea').element.value;
    expect(wrapper.findAll('[data-testid^="brand-"]').map((b) => b.text())).toEqual(["All brands", "ecom.house", "entirius"]);
    await wrapper.get('[data-testid="footer-lang-pl"]').trigger("click");
    expect(textarea()).toBe("<p>Wszyscy</p>{{ legal }}");
    await wrapper.get('[data-testid="brand-ecom.house"]').trigger("click");
    expect(textarea()).toBe("<p>Ecom</p>{{ legal }}");
    expect(wrapper.get('[data-testid="footer-unsubscribe-label"] input').element.value).toBe("Wypisz mnie");
    await wrapper.get('[data-testid="footer-html"] textarea').setValue("<p>Ecom 2</p>{{ legal }}");
    wrapper.vm.save();
    await flushPromises();
    expect(api.PUT_Footer).toHaveBeenCalledWith("pl", { html: "<p>Ecom 2</p>{{ legal }}", unsubscribe_label: "Wypisz mnie" }, "ecom.house");
    await wrapper.get('[data-testid="brand-entirius"]').trigger("click");
    expect(textarea()).toBe(""); // entirius has none of its own yet
    expect(wrapper.find('[data-testid="footer-remove"]').exists()).toBe(false);
    await wrapper.get('[data-testid="brand-ecom.house"]').trigger("click");
    await wrapper.get('[data-testid="footer-remove"]').trigger("click");
    await wrapper.get('[data-testid="confirm-dialog-confirm"]').trigger("click");
    await flushPromises();
    expect(api.DELETE_Footer).toHaveBeenCalledWith("pl", "ecom.house");
  });

  // U25: the unsubscribe link at {{ unsubscribe }}, else in small print under the footer; blank text = the default.
  it("the preview shows the unsubscribe link at its placeholder or at the bottom, with its text", async () => {
    const wrapper = await mountFooter();
    await wrapper.get('[data-testid="footer-lang-pl"]').trigger("click");
    const srcdoc = () => wrapper.get('[data-testid="footer-preview"]').attributes("srcdoc");
    expect(srcdoc()).toContain('<p style="font-family:Arial,sans-serif;font-size:11px;color:#555555"><a href="#" style="color:#555555">Nie chcę otrzymywać kolejnych wiadomości</a></p></body>');
    await wrapper.get('[data-testid="footer-html"] textarea').setValue("<p>A {{ unsubscribe }} B</p>{{ legal }}");
    await wrapper.get('[data-testid="footer-unsubscribe-label"] input').setValue("Stop <mail>");
    expect(srcdoc()).toContain('<p>A <a href="#" style="color:#555555">Stop &lt;mail&gt;</a> B</p>');
    expect(srcdoc()).not.toContain("{{ unsubscribe }}");
    expect(srcdoc()).not.toContain("font-size:11px");
    wrapper.vm.save();
    await flushPromises();
    expect(api.PUT_Footer).toHaveBeenCalledWith("pl", { html: "<p>A {{ unsubscribe }} B</p>{{ legal }}", unsubscribe_label: "Stop <mail>" }, "");
  });

  it("the default link text follows the footer's language", async () => {
    const wrapper = await mountFooter();
    await wrapper.get('[data-testid="footer-lang-en"]').trigger("click");
    expect(wrapper.findComponent('[data-testid="footer-unsubscribe-label"]').props("placeholder")).toBe("I don't want to receive further messages");
  });
});
