/**
 * etap-09 — AttributeMappingRow.modifier dropdown + live preview + save payload.
 */
import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";

import AttributeMappingRow from "@/views/Suppliers/components/AttributeMappingRow.vue";

const stubs = {
  EntitySearchPicker: true,
  BasicInput: true,
  Dropdown: true,
  Switcher: true,
  FormField: { template: "<div class='stub-field'><slot/></div>" },
  FontAwesomeIcon: true,
};

const baseMapping = {
  id: 42,
  source_field: "weight_g",
  target_type: "real_product",
  target_identifier: "weight",
  is_required: false,
  modifier: "none",
};

function mountRow(overrides = {}) {
  return mount(AttributeMappingRow, {
    props: { mapping: { ...baseMapping, ...overrides } },
    global: { stubs },
  });
}

describe("AttributeMappingRow — etap-09 modifier", () => {
  it("defaults preview to null when modifier is 'none'", () => {
    const wrapper = mountRow();
    expect(wrapper.vm.local.modifier).toBe("none");
    expect(wrapper.vm.modifierPreview).toBeNull();
  });

  it("computes preview '7800 → 7.8' when modifier flips to grams_to_kg", async () => {
    const wrapper = mountRow();
    wrapper.vm.local.modifier = "grams_to_kg";
    await wrapper.vm.$nextTick();
    const preview = wrapper.vm.modifierPreview;
    expect(preview).not.toBeNull();
    expect(preview).toContain("7800");
    expect(preview).toContain("7.8");
  });

  it("includes modifier in the save payload", async () => {
    const wrapper = mountRow();
    wrapper.vm.local.modifier = "grams_to_kg";
    await wrapper.vm.$nextTick();

    wrapper.vm.emitSave();

    const events = wrapper.emitted("save");
    expect(events).toBeTruthy();
    expect(events[0][0]).toMatchObject({ id: 42, modifier: "grams_to_kg" });
  });

  it("hydrates missing modifier as 'none' from prop", () => {
    const wrapper = mount(AttributeMappingRow, {
      props: {
        mapping: {
          id: 7,
          source_field: "x",
          target_type: "skip",
          target_identifier: "",
          is_required: false,
        },
      },
      global: { stubs },
    });
    expect(wrapper.vm.local.modifier).toBe("none");
  });

  it("exposes all 11 modifier options localised", () => {
    const wrapper = mountRow();
    const opts = wrapper.vm.modifierOptions;
    expect(opts).toHaveLength(11);
    expect(opts[0]).toEqual({
      value: "none",
      label: "suppliers.mappings.modifier.none",
    });
    expect(opts.map((o) => o.value)).toContain("grams_to_kg");
  });
});

describe("etap-12 #18 — target_type change clears identifier, never source_field", () => {
  it("existing row (mapping.id set): flipping type clears target_identifier, keeps source_field", async () => {
    const wrapper = mountRow({ id: 42, target_type: "real_product", target_identifier: "weight" });
    expect(wrapper.vm.isNew).toBe(false);
    expect(wrapper.vm.local.target_identifier).toBe("weight");

    wrapper.vm.local.target_type = "feature";
    await wrapper.vm.$nextTick();

    expect(wrapper.vm.local.target_identifier).toBe("");
    expect(wrapper.vm.local.source_field).toBe("weight_g");
  });

  it("new row (no mapping.id): same behaviour — identifier cleared, source_field kept", async () => {
    const wrapper = mount(AttributeMappingRow, {
      props: {
        mapping: {
          source_field: "color",
          target_type: "feature",
          target_identifier: "feat-color",
          is_required: false,
        },
      },
      global: { stubs },
    });
    expect(wrapper.vm.isNew).toBe(true);

    wrapper.vm.local.target_type = "real_product";
    await wrapper.vm.$nextTick();

    expect(wrapper.vm.local.target_identifier).toBe("");
    expect(wrapper.vm.local.source_field).toBe("color");
  });
});
