import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import CustomFields from "@/views/Leads/CustomFields.vue";
import { changedValues, fieldsFromDefinitions, formatValue, validateValues } from "@/views/Leads/customFields";
import { leadsFrame } from "./leadsFrame";

const stub = (name, props) => ({ name, props, template: "<div />" });
const stubs = {
  ...leadsFrame.stubs,
  FormField: { name: "FormField", props: ["label", "error", "required", "disabled"], template: "<div><slot /></div>" },
  BasicInput: stub("BasicInput", ["modelValue", "format"]),
  NumberInput: stub("NumberInput", ["modelValue"]),
  BasicDatePicker: stub("BasicDatePicker", ["modelValue"]),
};
const options = [
  { value: "magento", label: "Magento" },
  { value: "shopify", label: "Shopify" },
];
const definitions = [
  { key: "site", kind: "url", label: "Site", order: 6, required: false, options: [], is_active: true },
  { key: "note", kind: "text", label: "Note", order: 0, required: true, options: [], is_active: true },
  { key: "employees", kind: "number", label: "Employees", order: 1, required: false, options: [], is_active: true },
  { key: "partner", kind: "bool", label: "Partner", order: 2, required: false, options: [], is_active: true },
  { key: "contract_end", kind: "date", label: "Contract end", order: 3, required: false, options: [], is_active: true },
  { key: "platform", kind: "select", label: "Platform", order: 4, required: false, options, is_active: true },
  { key: "channels", kind: "multiselect", label: "Channels", order: 5, required: false, options, is_active: true },
  { key: "old", kind: "text", label: "Old", order: 7, required: false, options: [], is_active: false },
];
const fields = fieldsFromDefinitions(definitions);

// Plan 15: one renderer for the channel's custom fields — every kind gets its boot, validates and saves.
describe("custom fields", () => {
  it("keeps the active definitions in their order", () => {
    expect(fields.map((field) => field.key)).toEqual(["note", "employees", "partner", "contract_end", "platform", "channels", "site"]);
  });

  it("renders every kind with its boot and emits the changed value", async () => {
    const wrapper = mount(CustomFields, { props: { fields, modelValue: {} }, global: { stubs } });
    const control = (key, name) => wrapper.get(`[data-testid="custom-field-${key}"]`).findComponent({ name });
    expect(control("note", "BasicInput").props("format")).toBeUndefined();
    expect(control("site", "BasicInput").props("format")).toBe("url");
    expect(control("employees", "NumberInput").exists()).toBe(true);
    expect(control("partner", "BasicSwitch").exists()).toBe(true);
    expect(control("contract_end", "BasicDatePicker").exists()).toBe(true);
    expect(control("platform", "BasicSelect").props("multiple")).toBe(false);
    expect(control("channels", "BasicSelect").props("multiple")).toBe(true);
    control("platform", "BasicSelect").vm.$emit("update:modelValue", "magento");
    expect(wrapper.emitted("update:modelValue")[0][0]).toEqual({ platform: "magento" });
  });

  it("validates required, number and link values", () => {
    expect(validateValues(fields, { employees: "abc", site: "acme.pl" })).toEqual({
      note: "Required",
      employees: "Enter a number",
      site: "Enter a link starting with http:// or https://",
    });
    expect(validateValues(fields, { note: "x", employees: "12,5", site: "https://acme.pl" })).toEqual({});
  });

  it("saves only what changed; an emptied value is null; numbers use a dot", () => {
    const before = { note: "x", platform: "magento", partner: true };
    const after = { note: "x", platform: "", partner: false, employees: "12,5", channels: ["shopify"] };
    expect(changedValues(fields, after, before)).toEqual({ employees: "12.5", partner: false, platform: null, channels: ["shopify"] });
  });

  it("formats a stored value by kind", () => {
    const byKey = Object.fromEntries(fields.map((field) => [field.key, field]));
    expect(formatValue(byKey.partner, true)).toBe("Yes");
    expect(formatValue(byKey.partner, false)).toBe("No");
    expect(formatValue(byKey.platform, "magento")).toBe("Magento");
    expect(formatValue(byKey.channels, ["magento", "shopify"])).toBe("Magento, Shopify");
    expect(formatValue(byKey.contract_end, "2026-11-13")).toMatch(/2026/);
    expect(formatValue(byKey.note, null)).toBe("");
  });
});
