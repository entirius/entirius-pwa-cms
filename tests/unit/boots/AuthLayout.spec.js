import { describe, it, expect, afterEach, vi } from "vitest";
import { nextTick } from "vue";
import { mount, flushPromises } from "@vue/test-utils";

import AuthLayout from "@/boots/AuthLayout/index.vue";
import PasswordField from "@/boots/AuthLayout/PasswordField.vue";
import BasicInput from "@/boots/BasicInput/index.vue";

const layout = ({ props = {}, slots = {} } = {}) =>
  mount(AuthLayout, { props: { title: "Zaloguj się", ...props }, slots });

// FormField renders its slot and, like the real one, shows the error in place of the description.
const FormField = {
  props: ["label", "error", "description"],
  template: "<div><slot /><p v-if='error' class='error'>{{ error }}</p><p v-else class='desc'>{{ description }}</p></div>",
};
const IconButton = { props: ["label", "pressed", "icon"], emits: ["click"], template: "<button :aria-pressed='String(pressed)' @click=\"$emit('click')\" />" };
const field = (props = {}) =>
  mount(PasswordField, {
    props: { label: "Hasło", modelValue: "", ...props },
    global: { stubs: { FormField, BasicInput: false }, components: { BasicInput, IconButton } },
  });

describe("AuthLayout", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("renders the screen's one H1 and its subtitle in the form column", () => {
    const wrapper = layout({ props: { subtitle: "Użyj konta." }, slots: { default: "<form />" } });

    expect(wrapper.findAll("h1")).toHaveLength(1);
    expect(wrapper.get("main h1").text()).toBe("Zaloguj się");
    expect(wrapper.get(".auth-layout__subtitle").text()).toBe("Użyj konta.");
    expect(wrapper.find("main form").exists()).toBe(true);
  });

  it("keeps the brand stage decorative and always dark", () => {
    const stage = layout().get(".auth-layout__stage");

    expect(stage.attributes("aria-hidden")).toBe("true");
    expect(stage.attributes("data-theme")).toBe("dark");
    expect(stage.findAll(".auth-layout__field")).toHaveLength(3);
    expect(stage.text()).toContain("login.stage_line");
    expect(stage.find(".auth-layout__chip").exists()).toBe(false); // plan 61c: a slug is no name — no channel chip
  });

  it("has one live region that is there before any status, empty until one comes", async () => {
    const wrapper = layout();
    expect(wrapper.findAll('[aria-live="polite"]')).toHaveLength(1);
    expect(wrapper.get('[aria-live="polite"]').text()).toBe("");

    const withStatus = layout({ props: { statusTone: "positive" }, slots: { status: "Link wysłany." } });
    await nextTick();
    const status = withStatus.get('[aria-live="polite"] .auth-layout__status');
    expect(status.text()).toBe("Link wysłany.");
    expect(status.classes()).toContain("auth-layout__status--positive");
  });

  it("below the shell breakpoint the stage is a band with the wordmark only", () => {
    vi.stubGlobal("matchMedia", () => ({ matches: false, addEventListener: () => {}, removeEventListener: () => {} }));
    const stage = layout().get(".auth-layout__stage");

    expect(stage.find(".auth-layout__copy").exists()).toBe(false);
    expect(stage.find(".auth-layout__foot").exists()).toBe(false);
  });
});

describe("AuthLayout PasswordField", () => {
  it("shows and hides the password with a pressed toggle", async () => {
    const wrapper = field();
    const input = () => wrapper.get("input");
    expect(input().attributes("type")).toBe("password");
    expect(input().attributes("autocomplete")).toBe("current-password");
    // The toggle sits in BasicInput's trailing slot: the text stops before it.
    expect(input().classes()).toContain("input-field--trailing");
    expect(wrapper.find(".input-trailing button").exists()).toBe(true);

    await wrapper.get("button").trigger("click");

    expect(input().attributes("type")).toBe("text");
    expect(wrapper.get("button").attributes("aria-pressed")).toBe("true");
  });

  // Vue drops an event stamped before its listener was attached; happy-dom's event clock can lag behind under load.
  const settle = () => new Promise((resolve) => setTimeout(resolve, 10));
  const pressKey = (wrapper, type, on) => {
    // happy-dom knows no CapsLock modifier: the event answers for it.
    const event = new KeyboardEvent(type, { key: "a", bubbles: true });
    Object.defineProperty(event, "getModifierState", { value: (name) => name === "CapsLock" && on });
    wrapper.get("input").element.dispatchEvent(event);
    return flushPromises();
  };

  it("hints caps lock only while it is on, and drops the hint on leaving the field", async () => {
    const wrapper = field();
    await settle();
    const hint = () => wrapper.find('[data-testid="caps-lock-hint"]');
    const key = (type, on) => pressKey(wrapper, type, on);

    await key("keydown", true);
    expect(hint().text()).toBe("login.caps_lock");
    await key("keyup", false);
    expect(hint().exists()).toBe(false);

    await key("keydown", true);
    await wrapper.get("input").trigger("focusout");
    expect(hint().exists()).toBe(false);
  });

  // Plan 61c: the hint is its own line, not the description a password error replaces.
  it("keeps the caps-lock hint next to a password error", async () => {
    const wrapper = field({ error: "Złe hasło." });
    await settle();
    await pressKey(wrapper, "keydown", true);
    expect(wrapper.get('[data-testid="caps-lock-hint"]').text()).toBe("login.caps_lock");
    expect(wrapper.get(".error").text()).toBe("Złe hasło.");
  });

  it("passes typing up as v-model", async () => {
    const wrapper = field();

    await wrapper.get("input").setValue("sekret");

    expect(wrapper.emitted("update:modelValue")).toEqual([["sekret"]]);
  });
});
