import { describe, it, expect, vi } from "vitest";
import { defineComponent, h, ref } from "vue";
import { mount } from "@vue/test-utils";
import { ICONS } from "@/boots/Icons/icons";
import FormField from "@/boots/FormField/index.vue";
import BasicInput from "@/boots/BasicInput/index.vue";
import BasicTextarea from "@/boots/BasicTextarea/index.vue";
import NumberInput from "@/boots/NumberInput/index.vue";
import BasicCheckbox from "@/boots/BasicCheckbox/index.vue";
import BasicRadioGroup from "@/boots/BasicRadioGroup/index.vue";
import BasicSwitch from "@/boots/BasicSwitch/index.vue";
import SegmentedControl from "@/boots/SegmentedControl/index.vue";
import ColorInput from "@/boots/ColorInput/index.vue";
import BasicDatePicker from "@/boots/BasicDatePicker/index.vue";

const flatpickrInstance = { destroy: vi.fn(), setDate: vi.fn(), input: { value: "" } };
const flatpickr = vi.fn(() => flatpickrInstance);
vi.mock("flatpickr", () => ({ default: (...args) => flatpickr(...args) }));

const GLOBAL = { stubs: { FormField: false, BasicInput: false, BasicTooltip: true }, directives: { out: {} } };

// A control inside a FormField with the given field props.
function inField(control, fieldProps = {}, controlProps = {}) {
  const Host = defineComponent({
    render: () => h(FormField, { label: "Nazwa", ...fieldProps }, () => h(control, controlProps)),
  });
  return mount(Host, { global: GLOBAL });
}

const iconOf = (wrapper) => wrapper.findComponent({ name: "FontAwesomeIcon" }).attributes("icon");

describe("FormField contract", () => {
  it("labels the control: the label's for is the control's id", () => {
    const wrapper = inField(BasicInput);
    const id = wrapper.find("input").attributes("id");
    expect(id).toBeTruthy();
    expect(wrapper.find("label").attributes("for")).toBe(id);
  });

  it("describes the control with the hint, and with the error instead of it", async () => {
    const wrapper = inField(BasicInput, { description: "Widoczna w sklepie" });
    const input = () => wrapper.find("input");
    const hint = wrapper.find(".form-field__desc");
    expect(input().attributes("aria-describedby")).toBe(hint.attributes("id"));
    expect(input().attributes("aria-invalid")).toBeUndefined();

    const invalid = inField(BasicInput, { description: "Widoczna w sklepie", error: "Pole wymagane" });
    const error = invalid.find(".form-field__error");
    expect(error.attributes("role")).toBe("alert");
    expect(invalid.find("input").attributes("aria-describedby")).toBe(error.attributes("id"));
    expect(invalid.find("input").attributes("aria-invalid")).toBe("true");
    expect(invalid.find(".form-field__desc").exists()).toBe(false);
  });

  it("marks required and disables the control", () => {
    const wrapper = inField(BasicInput, { required: true, disabled: true });
    expect(wrapper.find("label").classes()).toContain("required");
    expect(wrapper.find("input").attributes("required")).toBeDefined();
    expect(wrapper.find("input").attributes("disabled")).toBeDefined();
  });

  it("takes a fixed control id", () => {
    const wrapper = inField(BasicInput, { id: "product-name" });
    expect(wrapper.find("input").attributes("id")).toBe("product-name");
    expect(wrapper.find("label").attributes("for")).toBe("product-name");
  });

  it("shows the help tooltip on BasicTooltip, outside the label", () => {
    const wrapper = inField(BasicInput, { tooltip: "Nazwa w sklepie" });
    const tip = wrapper.findComponent({ name: "BasicTooltip" });
    expect(tip.attributes("variant")).toBe("help");
    expect(tip.attributes("text")).toBe("Nazwa w sklepie");
    expect(wrapper.find("label").find("basic-tooltip-stub").exists()).toBe(false);
  });

  it("lays out inline on request", () => {
    expect(inField(BasicInput, { layout: "inline" }).classes()).toContain("form-field--inline");
    expect(inField(BasicInput).classes()).toContain("form-field--stacked");
  });
});

describe("BasicInput", () => {
  const mountInput = (props = {}) => mount(BasicInput, { props, global: GLOBAL });

  it("stands alone outside a FormField: own id, nothing described", () => {
    const input = mountInput().find("input");
    expect(input.attributes("id")).toBeTruthy();
    expect(input.attributes("aria-describedby")).toBeUndefined();
  });

  it("runs v-model", async () => {
    const wrapper = mountInput({ modelValue: "Ala" });
    expect(wrapper.find("input").element.value).toBe("Ala");
    await wrapper.find("input").setValue("Ola");
    expect(wrapper.emitted("update:modelValue").at(-1)).toEqual(["Ola"]);
  });

  it("shows a readonly value behind the lock (the former LockedField)", () => {
    const wrapper = mountInput({ modelValue: "SKU-1", readonly: true, icon: "search" });
    expect(wrapper.find("input").attributes("readonly")).toBeDefined();
    expect(iconOf(wrapper)).toBe(ICONS.lock);
  });

  it("draws a leading meaning icon", () => {
    const wrapper = mountInput({ icon: "search" });
    expect(iconOf(wrapper)).toBe(ICONS.search);
    expect(wrapper.find("input").classes()).toContain("input-field--icon");
  });

  it("takes disabled, and isDisabled until plan 19", () => {
    expect(mountInput({ disabled: true }).find("input").attributes("disabled")).toBeDefined();
    expect(mountInput({ isDisabled: true }).find("input").attributes("disabled")).toBeDefined();
    expect(mountInput().find("input").attributes("disabled")).toBeUndefined();
  });

  describe("transition API (un-swept screens)", () => {
    it("keeps the floating label on the input", () => {
      const wrapper = mountInput({ label: "Nazwa", id: "name" });
      const label = wrapper.find("label.input-label");
      expect(label.text()).toBe("Nazwa");
      expect(label.attributes("for")).toBe("name");
      expect(wrapper.find("input").attributes("placeholder")).toBe("Nazwa");
    });

    it("keeps validate: its colour class, its own message, and marks the input invalid", () => {
      const wrapper = mountInput({ validate: { status: "error", msg: "Błąd" } });
      expect(wrapper.classes()).toContain("negative");
      expect(wrapper.find(".validation-msg").text()).toBe("Błąd");
      expect(wrapper.find("input").attributes("aria-invalid")).toBe("true");
    });

    it("keeps the onFocusout and onKeyDown events with the value", async () => {
      const wrapper = mountInput({ modelValue: "x" });
      await wrapper.find("input").trigger("focusout");
      await wrapper.find("input").trigger("keydown.enter");
      expect(wrapper.emitted("onFocusout")).toEqual([["x"]]);
      expect(wrapper.emitted("onKeyDown")).toEqual([["x"]]);
    });

    it("passes unknown listeners and classes to the wrapper, as before", async () => {
      const onInput = vi.fn();
      const wrapper = mount(BasicInput, { attrs: { class: "mb-2", onInput }, global: GLOBAL, attachTo: document.body });
      expect(wrapper.classes()).toContain("mb-2");
      await wrapper.find("input").setValue("a");
      expect(onInput).toHaveBeenCalled();
      wrapper.unmount();
    });
  });
});

describe("BasicTextarea", () => {
  it("runs v-model and counts toward maxlength", async () => {
    const wrapper = mount(BasicTextarea, { props: { modelValue: "abc", maxlength: 10 } });
    expect(wrapper.find(".basic-textarea__counter").text()).toBe("3 / 10");
    expect(wrapper.find("textarea").attributes("maxlength")).toBe("10");
    await wrapper.find("textarea").setValue("abcd");
    expect(wrapper.emitted("update:modelValue").at(-1)).toEqual(["abcd"]);
  });

  it("has no counter without maxlength; takes rows, disabled, readonly", () => {
    const wrapper = mount(BasicTextarea, { props: { rows: 3, disabled: true, readonly: true } });
    const field = wrapper.find("textarea");
    expect(wrapper.find(".basic-textarea__counter").exists()).toBe(false);
    expect(field.attributes("rows")).toBe("3");
    expect(field.attributes("disabled")).toBeDefined();
    expect(field.attributes("readonly")).toBeDefined();
  });

  it("reads the contract", () => {
    const wrapper = inField(BasicTextarea, { error: "Za długie" });
    const field = wrapper.find("textarea");
    expect(wrapper.find("label").attributes("for")).toBe(field.attributes("id"));
    expect(field.attributes("aria-invalid")).toBe("true");
  });
});

describe("NumberInput", () => {
  it("takes disabled and isDisabled: value field and both steppers", () => {
    for (const props of [{ disabled: true }, { isDisabled: true }]) {
      const wrapper = mount(NumberInput, { props: { modelValue: "5", ...props } });
      expect(wrapper.find("input").attributes("disabled")).toBeDefined();
      expect(wrapper.findAll("button").every((b) => b.attributes("disabled") !== undefined)).toBe(true);
    }
  });

  it("reads the contract", () => {
    const wrapper = inField(NumberInput, { error: "Za dużo", disabled: true });
    const input = wrapper.find("input");
    expect(wrapper.find("label").attributes("for")).toBe(input.attributes("id"));
    expect(input.attributes("aria-invalid")).toBe("true");
    expect(input.attributes("disabled")).toBeDefined();
    expect(wrapper.find(".number-input").classes()).toContain("number-input--invalid");
  });
});

describe("BasicCheckbox", () => {
  it("runs a boolean v-model with the label in its slot", async () => {
    const wrapper = mount(BasicCheckbox, { props: { modelValue: false }, slots: { default: "Aktywny" } });
    expect(wrapper.text()).toBe("Aktywny");
    await wrapper.find("input").setValue(true);
    expect(wrapper.emitted("update:modelValue").at(-1)).toEqual([true]);
  });

  it("disables and reads the contract", () => {
    const wrapper = inField(BasicCheckbox, { error: "Zaznacz" }, { disabled: true });
    const input = wrapper.find("input");
    expect(input.attributes("disabled")).toBeDefined();
    expect(input.attributes("aria-invalid")).toBe("true");
    expect(wrapper.find("label.form-field__label").attributes("for")).toBe(input.attributes("id"));
  });

  it("keeps the array API until plan 19", async () => {
    const values = [{ label: "Kanał A", value: "a" }];
    const wrapper = mount(BasicCheckbox, { props: { values, init_selected: [] } });
    expect(wrapper.find(".basic-checkbox-wrapper").exists()).toBe(true);
    await wrapper.find("label").trigger("input");
    expect(wrapper.emitted("onSelect").at(-1)).toEqual([["a"]]);
  });
});

describe("BasicRadioGroup", () => {
  const options = [
    { label: "Jeden", value: 1 },
    { label: "Dwa", value: 2 },
  ];

  it("is a named radio group: one name, checked from v-model, a change emits the value", async () => {
    const wrapper = mount(BasicRadioGroup, { props: { options, modelValue: 2, name: "count" } });
    const radios = wrapper.findAll("input[type=radio]");
    expect(wrapper.attributes("role")).toBe("radiogroup");
    expect(radios.map((r) => r.attributes("name"))).toEqual(["count", "count"]);
    expect(radios[1].element.checked).toBe(true);
    await radios[0].trigger("change");
    expect(wrapper.emitted("update:modelValue").at(-1)).toEqual([1]);
  });

  it("is named by the FormField label and disables every option", () => {
    const wrapper = inField(BasicRadioGroup, { disabled: true }, { options });
    const label = wrapper.find("label.form-field__label");
    expect(wrapper.find("[role=radiogroup]").attributes("aria-labelledby")).toBe(label.attributes("id"));
    expect(wrapper.findAll("input").every((r) => r.attributes("disabled") !== undefined)).toBe(true);
  });
});

describe("BasicSwitch", () => {
  it("is a switch: aria-checked follows v-model, a click emits the opposite", async () => {
    const wrapper = mount(BasicSwitch, { props: { modelValue: false, label: "Aktywny" }, global: GLOBAL });
    const button = wrapper.find("button");
    expect(button.attributes("role")).toBe("switch");
    expect(button.attributes("aria-checked")).toBe("false");
    expect(wrapper.find("label").attributes("for")).toBe(button.attributes("id"));
    await button.trigger("click");
    expect(wrapper.emitted("update:modelValue").at(-1)).toEqual([true]);
  });

  it("does not toggle when disabled", async () => {
    const wrapper = mount(BasicSwitch, { props: { modelValue: true, disabled: true }, global: GLOBAL });
    await wrapper.find("button").trigger("click");
    expect(wrapper.find("button").attributes("disabled")).toBeDefined();
    expect(wrapper.emitted("update:modelValue")).toBeUndefined();
  });

  it("shows its hint as a help tooltip", () => {
    const wrapper = mount(BasicSwitch, { props: { label: "A", hint: "Podpowiedź" }, global: GLOBAL });
    expect(wrapper.findComponent({ name: "BasicTooltip" }).attributes("variant")).toBe("help");
  });

  it("inside a FormField the field's label names it", () => {
    const wrapper = inField(BasicSwitch);
    expect(wrapper.find("label.form-field__label").attributes("for")).toBe(wrapper.find("button").attributes("id"));
  });
});

describe("SegmentedControl and ColorInput", () => {
  const options = [
    { label: "Lista", value: "list" },
    { label: "Edycja", value: "edit" },
  ];

  it("SegmentedControl: named by the field, disabled by it, the active option pressed", () => {
    const wrapper = inField(SegmentedControl, { disabled: true }, { options, modelValue: "edit" });
    const group = wrapper.find(".segmented-control");
    expect(group.attributes("aria-labelledby")).toBe(wrapper.find("label").attributes("id"));
    expect(wrapper.findAll("button").map((b) => b.attributes("aria-pressed"))).toEqual(["false", "true"]);
    expect(wrapper.findAll("button").every((b) => b.attributes("disabled") !== undefined)).toBe(true);
  });

  it("ColorInput: the text field reads the contract, disabled reaches the picker too", () => {
    const wrapper = inField(ColorInput, { error: "Zły kolor" }, { disabled: true });
    const text = wrapper.find("input[type=text]");
    expect(wrapper.find("label").attributes("for")).toBe(text.attributes("id"));
    expect(text.attributes("aria-invalid")).toBe("true");
    expect(wrapper.find("input[type=color]").attributes("disabled")).toBeDefined();
  });
});

describe("BasicDatePicker", () => {
  const mountPicker = (props = {}) => mount(BasicDatePicker, { props, global: GLOBAL });

  it("destroys its flatpickr instance on unmount", () => {
    flatpickrInstance.destroy.mockClear();
    const wrapper = mountPicker();
    expect(flatpickr).toHaveBeenCalled();
    wrapper.unmount();
    expect(flatpickrInstance.destroy).toHaveBeenCalledTimes(1);
  });

  it("emits v-model and the transition onChange with the picked date", () => {
    const wrapper = mountPicker();
    const { onChange } = flatpickr.mock.calls.at(-1)[1];
    onChange([], "2026-09-01");
    expect(wrapper.emitted("update:modelValue")).toEqual([["2026-09-01"]]);
    expect(wrapper.emitted("onChange")).toEqual([["2026-09-01"]]);
  });

  it("shows the value on an input-like trigger with the calendar icon; value until plan 19", () => {
    expect(mountPicker({ modelValue: "2026-09-01" }).find("button").text()).toBe("2026-09-01");
    expect(mountPicker({ value: "2026-01-02" }).find("button").text()).toBe("2026-01-02");
    const empty = mountPicker();
    expect(empty.find("button").text()).toBe("routes.set_new");
    expect(iconOf(empty)).toBe(ICONS.calendar);
  });

  it("a disabled trigger does not open", async () => {
    const wrapper = mountPicker({ disabled: true });
    expect(wrapper.find("button").attributes("disabled")).toBeDefined();
  });

  it("follows an outside model change", async () => {
    flatpickrInstance.setDate.mockClear();
    const model = ref("2026-01-01");
    const Host = defineComponent({ render: () => h(BasicDatePicker, { modelValue: model.value }) });
    mount(Host, { global: GLOBAL });
    model.value = "2026-02-02";
    await new Promise((resolve) => setTimeout(resolve));
    expect(flatpickrInstance.setDate).toHaveBeenCalledWith("2026-02-02", false);
  });
});
