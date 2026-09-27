import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";

// Plan 17: the Dropdown / Switcher `@onSelect` handlers now hang on BasicSelect / BasicSwitch `@update:model-value`.
vi.mock("@/api/pricefighter/api", () => ({
  GET_PfChannels: vi.fn().mockResolvedValue({ data: [{ idx: "b2c", name: "B2C" }] }),
  GET_PfHistory: vi.fn().mockResolvedValue({ data: { results: [], count: 0 } }),
  GET_PfDecisions: vi.fn().mockResolvedValue({ data: { results: [], count: 0 } }),
  GET_PfRules: vi.fn().mockResolvedValue({ data: { results: [] } }),
  POST_PfRule: vi.fn(),
  PATCH_PfRule: vi.fn(),
  DELETE_PfRule: vi.fn(),
  POST_PfApply: vi.fn(),
}));
vi.mock("@/stores/loader", () => ({ useLoaderStore: () => ({ loaderStart() {}, loaderEnd() {}, loaderFinish() {} }) }));
vi.mock("@/stores/notify", () => ({ useNotifyStore: () => ({ spawnNotification() {} }) }));
vi.mock("@/stores/munin", () => ({ useMuninStore: () => ({ isPanelEnabled: () => true }) }));

import { GET_PfHistory, GET_PfDecisions } from "@/api/pricefighter/api";
import DecisionHistory from "@/views/PriceFighter/DecisionHistory.vue";
import GapTable from "@/views/PriceFighter/GapTable.vue";
import Strategies from "@/views/PriceFighter/Strategies.vue";

const control = (name) => ({
  name,
  props: ["modelValue", "options"],
  emits: ["update:modelValue"],
  template: "<div />",
});
const stubs = {
  BasicSelect: control("BasicSelect"),
  BasicSwitch: control("BasicSwitch"),
  FormField: { template: "<div><slot /></div>" },
  DataTable: true,
  BulkActionBar: true,
  EntitySearchPicker: true,
  Pagination: true,
  IconButton: true,
  ConfirmDialog: true,
};
const pick = (wrapper, name, value, at = 0) =>
  wrapper.findAllComponents({ name })[at].vm.$emit("update:modelValue", value);
const lastParams = (api) => api.mock.calls.at(-1)[0];

describe("PriceFighter pickers on BasicSelect / BasicSwitch", () => {
  beforeEach(() => vi.clearAllMocks());

  it("decision history: a picked channel filters, clearing (null) drops the filter", async () => {
    const wrapper = mount(DecisionHistory, { global: { stubs } });
    await flushPromises();
    await pick(wrapper, "BasicSelect", "b2c");
    expect(lastParams(GET_PfHistory).channel).toBe("b2c");
    await pick(wrapper, "BasicSelect", null);
    expect(lastParams(GET_PfHistory)).not.toHaveProperty("channel");
  });

  it("gap table: the 'all' option drops the filter, the switch flips competitor-only", async () => {
    const wrapper = mount(GapTable, { global: { stubs } });
    await flushPromises();
    await pick(wrapper, "BasicSelect", "b2c");
    expect(lastParams(GET_PfDecisions).channel).toBe("b2c");
    await pick(wrapper, "BasicSelect", "__all");
    expect(lastParams(GET_PfDecisions)).not.toHaveProperty("channel");
    await pick(wrapper, "BasicSelect", "compete", 1);
    expect(lastParams(GET_PfDecisions).recommendation).toBe("compete");
    await pick(wrapper, "BasicSwitch", false);
    expect(lastParams(GET_PfDecisions).competitor_only).toBe(false);
  });

  it("strategies: a new scope type resets the scope value", async () => {
    const wrapper = mount(Strategies, { global: { stubs } });
    await flushPromises();
    wrapper.vm.openCreate();
    wrapper.vm.form.scopeValue = "SKU-1";
    await flushPromises();
    await pick(wrapper, "BasicSelect", "channel");
    expect(wrapper.vm.form.scopeType).toBe("channel");
    expect(wrapper.vm.form.scopeValue).toBe("");
  });
});
