import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { reactive } from "vue";

const notify = vi.hoisted(() => ({ spawnNotification: vi.fn() }));
vi.mock("@/stores/notify", () => ({ useNotifyStore: () => notify }));
vi.mock("@/stores/munin", () => ({ useMuninStore: () => ({ isModuleAtLeast: () => true, isModuleEnabled: () => true }) }));

// Each card exposes `dirty` and `save()` (true = saved); the page holds the one Save.
const { state, cardModule } = vi.hoisted(() => {
  const state = { cards: {} };
  const cardModule = async (name) => {
    const { defineComponent, h } = await import("vue");
    const component = defineComponent({
      name,
      setup(_, { expose }) {
        expose(state.cards[name]);
        return () => h("div");
      },
    });
    return { default: component };
  };
  return { state, cardModule };
});
vi.mock("@/views/Communicator/settings/SettingsPolicy.vue", () => cardModule("SettingsPolicy"));
vi.mock("@/views/Communicator/settings/SettingsChannel.vue", () => cardModule("SettingsChannel"));
vi.mock("@/views/Communicator/settings/SettingsFooter.vue", () => cardModule("SettingsFooter"));
vi.mock("@/views/Communicator/settings/SettingsScheduled.vue", () => cardModule("SettingsScheduled"));
vi.mock("@/views/Communicator/settings/SettingsSuppressions.vue", () => cardModule("SettingsSuppressions"));

import Settings from "@/views/Communicator/Settings.vue";
import { communicatorFrame } from "./communicatorFrame";

const mountPage = async () => {
  const wrapper = mount(Settings, { global: { ...communicatorFrame, stubs: { ...communicatorFrame.stubs, PageHeader: { template: "<header><slot name='actions' /></header>" } } } });
  await flushPromises();
  return wrapper;
};
const saveButton = (wrapper) => wrapper.get('[data-testid="settings-save"]');

// N27 (Leads walk 2): Send settings has one Save, in the header; it saves only the cards that changed.
describe("Send settings — one Save", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
    for (const name of ["SettingsPolicy", "SettingsChannel", "SettingsFooter", "SettingsScheduled", "SettingsSuppressions"])
      state.cards[name] = reactive({ dirty: false, save: vi.fn(() => Promise.resolve(true)) });
  });

  it("is greyed with Nothing to save until a card changed", async () => {
    const wrapper = await mountPage();
    expect(saveButton(wrapper).attributes("disabled")).toBeDefined();
    expect(saveButton(wrapper).attributes("title")).toBe("Nothing to save");
    state.cards.SettingsChannel.dirty = true;
    await flushPromises();
    expect(saveButton(wrapper).attributes("disabled")).toBeUndefined();
  });

  it("saves only the changed cards and toasts once when all saved", async () => {
    const wrapper = await mountPage();
    state.cards.SettingsPolicy.dirty = true;
    state.cards.SettingsFooter.dirty = true;
    await flushPromises();
    await saveButton(wrapper).trigger("click");
    await flushPromises();
    expect(state.cards.SettingsPolicy.save).toHaveBeenCalledTimes(1);
    expect(state.cards.SettingsFooter.save).toHaveBeenCalledTimes(1);
    expect(state.cards.SettingsChannel.save).not.toHaveBeenCalled();
    expect(notify.spawnNotification).toHaveBeenCalledTimes(1);
  });

  it("a card that refuses keeps its error and no success toast", async () => {
    const wrapper = await mountPage();
    state.cards.SettingsChannel.dirty = true;
    state.cards.SettingsChannel.save = vi.fn(() => Promise.resolve(false));
    await flushPromises();
    await saveButton(wrapper).trigger("click");
    await flushPromises();
    expect(notify.spawnNotification).not.toHaveBeenCalled();
  });
});
