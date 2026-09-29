import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import { setActivePinia, createPinia } from "pinia";
import { GET_ContentTypes, GET_ContentChannels, GET_Languages, _METHOD_content } from "@/api/contentDB/api";
import Builder from "@/views/Builder/Builder.vue";
import IconButton from "@/boots/IconButton/index.vue";
import BasicTooltip from "@/boots/BasicTooltip/index.vue";

vi.mock("@/api/contentDB/api", async (importOriginal) => ({
  ...(await importOriginal()),
  GET_ContentTypes: vi.fn(),
  GET_ContentChannels: vi.fn(),
  GET_Languages: vi.fn(),
  _METHOD_content: vi.fn(),
}));

// Plan 61c: the section config summary is a real button (IconButton), not a focusable role="img" span; its keyboard
// focus opens the tooltip with the summary.
const CONTENT_RESPONSE = {
  data: {
    data: {
      attributes: {},
      category: null,
      content: { sections: { s1: { uid: "s1" } }, sections_order: ["s1"], tiles: {}, tiles_order: { s1: [] } },
      meta: null,
      language: "en",
      name: "Doc",
      routes: null,
      extension: null,
      access_rights: [1],
      channels: [],
      authors: [],
      co_authors: [],
      content_type: "page",
    },
    meta: {},
  },
};

const mountBuilder = async () => {
  const wrapper = mount(Builder, {
    attachTo: document.body,
    global: {
      mocks: { $route: { params: { content_type: "content", type: "page", uid: "doc-1" }, query: {} } },
      components: { IconButton, BasicTooltip },
      stubs: {
        PageHeader: true,
        ConfirmDialog: true,
        RenameModal: true,
        NoticeMe: true,
        SubscriberSetter: true,
        BasicSwiper: true,
        HomeVariantSwitcher: true,
        ChannelMultiSelect: true,
        ActionBar: true,
        ImagesControllPreview: true,
        GroupFieldsControllerPreview: true,
        FloatingActions: true,
      },
    },
  });
  await flushPromises();
  await vi.waitFor(() => {
    if (!wrapper.find('[data-testid="builder-section-config"]').exists()) throw new Error("section not rendered yet");
  });
  return wrapper;
};

describe("Builder — section config summary", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    _METHOD_content.mockReset().mockResolvedValue(CONTENT_RESPONSE);
    GET_ContentTypes.mockReset().mockResolvedValue({ data: { data: [{ slug: "page" }] } });
    GET_ContentChannels.mockReset().mockResolvedValue({ data: { data: [] } });
    GET_Languages.mockReset().mockResolvedValue({ data: { data: [] } });
  });

  it("is a button named by the summary whose keyboard focus opens the tooltip", async () => {
    const wrapper = await mountBuilder();
    const trigger = wrapper.get('[data-testid="builder-section-config"]');
    expect(trigger.element.tagName).toBe("BUTTON");
    expect(trigger.attributes("role")).toBeUndefined();
    const name = trigger.attributes("aria-label");
    expect(name).toMatch(/^builder\.setted_config: /);
    const tooltip = wrapper.get(`#${trigger.element.closest(".basic-tooltip").querySelector("[role=tooltip]").id}`);
    expect(tooltip.isVisible()).toBe(false);
    trigger.element.focus();
    await flushPromises();
    expect(tooltip.isVisible()).toBe(true);
    expect(tooltip.text()).toBe(name);
    wrapper.unmount();
  });
});
