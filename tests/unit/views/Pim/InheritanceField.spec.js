import { describe, it, expect, vi } from "vitest";
import { mount } from "@vue/test-utils";

vi.mock("@/stores/pimChannel", () => ({
  usePimChannelStore: () => ({ isDefaultChannel: false }),
}));

import InheritanceField from "@/views/Pim/components/InheritanceField.vue";

const mountField = (props = {}) =>
  mount(InheritanceField, {
    props: { inherited: true, language: "en", ...props },
    global: {
      mocks: { $t: (key) => key },
      stubs: { Tag: true, BasicButton: { template: "<button @click=\"$emit('click')\"><slot /></button>", emits: ["click"] } },
    },
    slots: { default: "<span class='slot' />" },
  });

describe("InheritanceField", () => {
  it("emits toggle-override with override=true while inherited", async () => {
    const wrapper = mountField();
    await wrapper.find("button").trigger("click");
    expect(wrapper.emitted("toggle-override")[0][0]).toEqual({ language: "en", override: true });
  });

  it("emits override=false once the language is overridden", async () => {
    const wrapper = mountField({ overriddenLangs: ["en"] });
    await wrapper.find("button").trigger("click");
    expect(wrapper.emitted("toggle-override")[0][0]).toEqual({ language: "en", override: false });
  });

  it("renders no toggle when the product does not inherit", () => {
    expect(mountField({ inherited: false }).find("button").exists()).toBe(false);
  });
});
