// Plan 17: the handlers the old Dropdown / Switcher called are now called by BasicSelect / BasicSwitch
// `update:modelValue` and by the IconButtons that took over the per-option extension actions.
import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";

const mockContent = vi.fn();
const handy = { handyType: {}, defaults: {}, open_Handykit: vi.fn(), pass_Asset: vi.fn() };

vi.mock("@/api/contentDB/api", () => ({ _METHOD_content: (...a) => mockContent(...a) }));
vi.mock("@/api/contentDB/translator", () => ({
  POST_ContentTranslateEstimate: vi.fn(),
  POST_ContentTranslateExecute: vi.fn(),
}));
vi.mock("@/stores/notify", () => ({ useNotifyStore: () => ({ spawnNotification: vi.fn() }) }));
vi.mock("@/stores/loader", () => ({ useLoaderStore: () => ({}) }));
vi.mock("@/stores/handy", () => ({ useHandyStore: () => handy }));
vi.mock("@/stores/contentDBChannel", () => ({
  useContentDBChannelStore: () => ({ availableLanguages: ["pl", "en", "de"], defaultLanguage: "pl" }),
}));

import MetaKit from "@/functionals/Handy-kit/kits/meta-kit/meta-kit.vue";
import RoutesList from "@/functionals/Handy-kit/kits/routes-kit/routes-list.vue";
import TranslateAllContentModal from "@/functionals/TranslateAllContentModal/index.vue";
import ButtonsController from "@/configs/builder/components/ButtonsController/index.vue";
import GroupFieldsController from "@/configs/builder/components/GroupFieldsController/index.vue";

const model = { props: ["modelValue", "options", "label"], emits: ["update:modelValue"], template: "<div />" };
const BasicSelect = { name: "BasicSelect", ...model };
const BasicSwitch = { name: "BasicSwitch", ...model };
const IconButton = { name: "IconButton", props: ["icon", "label"], emits: ["click"], template: "<button />" };
const stubs = {
  BasicSelect,
  BasicSwitch,
  IconButton,
  BasicTooltip: true,
  BasicTextarea: true,
  BasicWysiwyg: true,
  BasicImage: true,
  Pagination: true,
  ConfirmDialog: { props: ["open"], template: "<div v-if='open' class='confirm' />" },
  BasicModal: { template: "<div><slot /></div>" },
  BasicMenu: true,
  draggable: true,
};
const mountWith = (component, props = {}) => mount(component, { props, global: { stubs } });
const pick = (wrapper, stub, index, value) =>
  wrapper.findAllComponents(stub)[index].vm.$emit("update:modelValue", value);

beforeEach(() => {
  mockContent.mockReset().mockResolvedValue({ data: { data: [], pagination: {} } });
  handy.defaults = {};
});

describe("meta-kit", () => {
  it("maps the Index / Follow switches onto their string states", async () => {
    const wrapper = mountWith(MetaKit);
    const [index, follow] = wrapper.findAllComponents(BasicSwitch);
    expect(index.props("modelValue")).toBe(true);

    index.vm.$emit("update:modelValue", false);
    follow.vm.$emit("update:modelValue", false);
    expect(wrapper.vm.index).toBe("No-index");
    expect(wrapper.vm.follow).toBe("No-follow");
    index.vm.$emit("update:modelValue", true);
    expect(wrapper.vm.index).toBe("Index");
  });

  it("re-fetches the gallery sorted by the picked order", async () => {
    const wrapper = mountWith(MetaKit);
    await flushPromises();
    pick(wrapper, BasicSelect, 0, "-created_at");

    expect(wrapper.vm.sort_by).toBe("-created_at");
    expect(mockContent).toHaveBeenLastCalledWith(
      expect.objectContaining({ url: "/images/", params: { page: 1, limit: 5, sort: "-created_at" } })
    );
  });
});

describe("routes-list", () => {
  const route = { url: "/a", draft: null, label: "A" };

  it("adds a picked route; edit and delete act on their own row, not on the picked route", async () => {
    handy.defaults = { type: "product", routes: null };
    mockContent.mockResolvedValueOnce({
      data: { data: [{ url: "/a", label: "A" }, { url: "/b", label: "B" }], pagination: {} },
    });
    const wrapper = mountWith(RoutesList);
    await flushPromises();

    pick(wrapper, BasicSelect, 0, route);
    await wrapper.vm.$nextTick();
    expect(wrapper.vm.selected).toEqual([{ label: "A", value: route }]);

    // Row order: /a (edit, delete), /b (edit, delete).
    const buttons = wrapper.findAllComponents(IconButton);
    buttons[2].vm.$emit("click");
    expect(wrapper.vm.mode).toBe("edit");
    expect(wrapper.vm.route_url).toBe("/b");
    buttons[3].vm.$emit("click");
    await wrapper.vm.$nextTick();
    expect(wrapper.vm.to_delete).toBe("/b");
    expect(wrapper.find(".confirm").exists()).toBe(true);
  });

  it("unsets the picked set route", async () => {
    handy.defaults = { type: "product", routes: ["/a", "/b"] };
    const wrapper = mountWith(RoutesList);
    pick(wrapper, BasicSelect, 1, { url: "/a", draft: null, label: "/a" });
    await wrapper.vm.$nextTick();

    wrapper.findAllComponents(IconButton).at(-1).vm.$emit("click");
    expect(wrapper.vm.selected.map(({ value }) => value.url)).toEqual(["/b"]);
    expect(wrapper.vm.picked_setted).toBe(null);
  });
});

describe("TranslateAllContentModal", () => {
  it("toggles a picked target language", () => {
    const wrapper = mountWith(TranslateAllContentModal, { channelIdx: "c1" });
    pick(wrapper, BasicSelect, 1, "en");
    expect(wrapper.vm.selectedLanguages).toEqual(["en"]);
    pick(wrapper, BasicSelect, 1, "en");
    expect(wrapper.vm.selectedLanguages).toEqual([]);
  });
});

describe("ButtonsController", () => {
  const buttons = () => [
    { link_url: "/x", link_label: "X", link_type: "internal", link_decorator: null, link_rtl: null },
    { link_url: "/y", link_label: "Y", link_type: "external", link_decorator: null, link_rtl: null },
  ];

  it("edits the picked button and deletes it", async () => {
    const wrapper = mountWith(ButtonsController, { value: buttons() });
    pick(wrapper, BasicSelect, 0, 1);
    await wrapper.vm.$nextTick();
    expect(wrapper.vm.mode).toBe("edit");
    expect(wrapper.vm.link_label).toBe("Y");

    wrapper.findAllComponents(IconButton).at(-1).vm.$emit("click");
    expect(wrapper.emitted("onChange").at(-1)[0].map(({ link_label }) => link_label)).toEqual(["X"]);
  });
});

describe("GroupFieldsController", () => {
  const config = {
    fields: { on: { type: "switcher" }, size: { type: "dropdown", options: [{ label: "S", value: "s" }] } },
  };

  it("flips a switcher field and sets a dropdown field of the group", async () => {
    const wrapper = mountWith(GroupFieldsController, { config });
    wrapper.vm.mode = "add";
    await wrapper.vm.$nextTick();
    pick(wrapper, BasicSwitch, 0, true);
    expect(wrapper.vm.group.on).toBe(true);
    pick(wrapper, BasicSelect, 0, "s");
    expect(wrapper.vm.group.size).toBe("s");
  });
});
