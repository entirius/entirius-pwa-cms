import { describe, it, expect, vi } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";

vi.mock("@/api/pim/api", () => ({
  GET_FeatureSetGlobal: () => Promise.resolve({ data: { name: "Bikes", desc: "", is_default: false } }),
  GET_FeatureSetsGlobal: () =>
    Promise.resolve({
      data: {
        results: [
          { idx: "bikes", name: "Bikes", is_default: false },
          { idx: "default", name: "Default", is_default: true },
        ],
      },
    }),
  PATCH_FeatureSet: vi.fn(),
  DELETE_FeatureSet: vi.fn(),
  GET_FeatureSetFeaturesGlobal: () => Promise.resolve({ data: { results: [] } }),
  POST_FeatureSetFeatures: vi.fn(),
  DELETE_FeatureSetFeatures: vi.fn(),
  PATCH_FeatureSetFeaturesReorder: vi.fn(),
  GET_AttributesGroups: () => Promise.resolve({ data: { results: [] } }),
  POST_AttributesGroup: vi.fn(),
  PATCH_AttributesGroup: vi.fn(),
}));
vi.mock("@/stores/loader", () => ({
  useLoaderStore: () => ({ loaderStart() {}, loaderFinish() {} }),
}));
vi.mock("@/stores/notify", () => ({
  useNotifyStore: () => ({ spawnNotification: vi.fn() }),
}));

import FeatureSetEdit from "@/views/Pim/FeatureSetEdit.vue";

const SwitchStub = { name: "BasicSwitch", props: ["modelValue", "label"], emits: ["update:modelValue"], template: "<div />" };
const SelectStub = { name: "BasicSelect", props: ["modelValue", "options"], emits: ["update:modelValue"], template: "<div />" };

const mountEdit = (push = vi.fn()) =>
  mount(FeatureSetEdit, {
    global: {
      components: { BasicSwitch: SwitchStub, BasicSelect: SelectStub },
      mocks: { $route: { params: { idx: "bikes" }, query: {} }, $router: { push, replace() {} } },
      stubs: {
        teleport: true,
        IconButton: true,
        BasicModal: true,
        ConfirmDialog: true,
        SideDrawer: true,
        AttributeLibrary: true,
        draggable: true,
        FormField: { template: "<div><slot /></div>" },
      },
    },
  });

describe("FeatureSetEdit — P3 controls", () => {
  it("the set picker shows the current set and routes to the picked one", async () => {
    const push = vi.fn();
    const wrapper = mountEdit(push);
    await flushPromises();

    const picker = wrapper.findComponent(SelectStub);
    expect(picker.props("modelValue")).toBe("bikes");
    await picker.vm.$emit("update:modelValue", "default");
    expect(push).toHaveBeenCalledWith("/pim/feature-sets/default");
  });

  it("the default switch asks for confirmation while another set is default", async () => {
    const wrapper = mountEdit();
    await flushPromises();

    await wrapper.findComponent(SwitchStub).vm.$emit("update:modelValue", true);
    expect(wrapper.vm.showDefaultConfirm).toBe(true);
    expect(wrapper.vm.form.is_default).toBe(false);

    wrapper.vm.confirmDefaultChange();
    expect(wrapper.vm.form.is_default).toBe(true);
  });

  it("rename finishes once: Enter and the focus leaving the field do not patch twice", async () => {
    const { PATCH_AttributesGroup } = await import("@/api/pim/api");
    PATCH_AttributesGroup.mockResolvedValue({ data: {} });
    const wrapper = mountEdit();
    await flushPromises();

    const group = { idx: "frame", name: "Frame", name_t9n: {}, features: [] };
    wrapper.vm.startRename(group);
    group.name = "Rama";
    await Promise.all([wrapper.vm.finishRename(group), wrapper.vm.finishRename(group)]);

    expect(PATCH_AttributesGroup).toHaveBeenCalledTimes(1);
    expect(wrapper.vm.renamingGroupIdx).toBe(null);
  });

  it("the group menu renames or removes the group", async () => {
    const wrapper = mountEdit();
    await flushPromises();
    wrapper.vm.groups = [{ idx: "frame", name: "Frame", name_t9n: {}, features: [] }];

    wrapper.vm.onGroupMenu(wrapper.vm.groups[0], { key: "rename" });
    expect(wrapper.vm.renamingGroupIdx).toBe("frame");

    wrapper.vm.onGroupMenu(wrapper.vm.groups[0], { key: "remove" });
    expect(wrapper.vm.groups).toHaveLength(0);
  });
});
