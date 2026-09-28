import { describe, it, expect, vi } from "vitest";
import Builder from "@/views/Builder/Builder.vue";
import HomeVariantSwitcher from "@/views/Builder/HomeVariantSwitcher.vue";

// Plan 28 moved the editor's toolbar into a PageHeader ActionBar and the tile-cap check out of the template.
const editor = (overrides = {}) => ({
  $t: (key) => key,
  uid: "doc-1",
  advanced_options: false,
  has_options: () => false,
  saveDraft: vi.fn(),
  saveAndPublish: vi.fn(),
  $refs: {},
  ...overrides,
});
const actionsOf = (vm) => Builder.computed.editorActions.call(vm);

describe("Builder — header actions", () => {
  it("lists copy, settings, draft and publish in R5 order", () => {
    const actions = actionsOf(editor());
    expect(actions.map(({ key, role, icon }) => [key, role, icon])).toEqual([
      ["copy", "utility", "duplicate"],
      ["advanced", "utility", "settings"],
      ["draft", "secondary", "saveDraft"],
      ["publish", "primary", "publish"],
    ]);
    expect(actions.map(({ label }) => label)).toEqual([
      "builder.copy",
      "builder.advanced",
      "builder.save_draw",
      "builder.publish_document",
    ]);
  });

  it("creates before it can publish, and toggles the advanced row", () => {
    const vm = editor({ uid: null });
    const [copy, advanced, draft, publish] = actionsOf(vm);
    expect(draft.label).toBe("builder.post_draw");
    expect(publish.disabled).toBe(true);

    copy.onClick();
    advanced.onClick();
    expect(vm.rename_modal).toBe(true);
    expect(vm.advanced_options).toBe(true);
    expect(actionsOf(vm)[1].icon).toBe("close");
  });

  it("adds the document options utility when the config has them, opening its kit", () => {
    const click = vi.fn();
    const vm = editor({ has_options: () => true, $refs: { documentConfigSetter: { $el: { click } } } });
    const actions = actionsOf(vm);
    expect(actions.map(({ key }) => key)).toEqual(["copy", "advanced", "document-options", "draft", "publish"]);
    actions[2].onClick();
    expect(click).toHaveBeenCalledTimes(1);
  });
});

describe("Builder — tile cap", () => {
  const vm = (tiles_order) => ({
    sections: { s1: { core_type: "capped" }, s2: { core_type: "free" } },
    tiles_order,
    config_options: { capped: { max_tiles: 2 } },
    section_options: Builder.methods.section_options,
  });
  const reached = (tiles_order, uid) => Builder.methods.isTileLimitReached.call(vm(tiles_order), uid);

  it("blocks add and copy once a capped section is full", () => {
    expect(reached({ s1: ["a"] }, "s1")).toBe(false);
    expect(reached({ s1: ["a", "b"] }, "s1")).toBe(true);
    expect(reached({}, "s1")).toBe(false);
  });

  it("never blocks a section type without options", () => {
    expect(reached({ s2: ["a", "b", "c"] }, "s2")).toBe(false);
  });
});

describe("HomeVariantSwitcher — BasicSelect options", () => {
  const switcher = () => ({
    $t: (key) => key,
    currentChannel: "pl",
    availableChannels: [{ idx: "pl", name: "Polska" }, { idx: "de" }, { idx: "en" }],
    variants: { pl: { uid: "home-pl" }, de: { uid: "home-de" } },
    $emit: vi.fn(),
    isCurrent: HomeVariantSwitcher.methods.isCurrent,
    variantState: HomeVariantSwitcher.methods.variantState,
  });

  it("names each channel's home: this one, an existing one, or one to create", () => {
    expect(HomeVariantSwitcher.computed.options.call(switcher())).toEqual([
      { label: "Polska", value: "pl", description: "builder.home_current" },
      { label: "de", value: "de", description: "builder.home_exists" },
      { label: "en", value: "en", description: "builder.home_create" },
    ]);
  });

  it("switches to an existing home or asks for a new one, and ignores the current channel", () => {
    const vm = switcher();
    HomeVariantSwitcher.methods.onSelect.call(vm, "pl");
    expect(vm.$emit).not.toHaveBeenCalled();

    HomeVariantSwitcher.methods.onSelect.call(vm, "de");
    HomeVariantSwitcher.methods.onSelect.call(vm, "en");
    expect(vm.$emit.mock.calls).toEqual([
      ["switch", { channel_idx: "de", target_uid: "home-de" }],
      ["switch", { channel_idx: "en", target_uid: null }],
    ]);
  });
});
