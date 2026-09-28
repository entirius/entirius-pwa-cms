import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";

const mockContent = vi.fn();
const mockPutTags = vi.fn();
vi.mock("@/api/contentDB/api", () => ({
  _METHOD_content: (...args) => mockContent(...args),
  PUT_ImageTags: (...args) => mockPutTags(...args),
  DELETE_ImageTags: vi.fn(),
}));
vi.mock("@/stores/notify", () => ({ useNotifyStore: () => ({ spawnNotification: vi.fn() }) }));

import Gallery from "@/views/Gallery.vue";

const TAGS = [
  { slug: "summer", label: "Summer" },
  { slug: "blog-cover", label: "Blog cover" },
];
const IMAGE = { uid: "img-1", image: "a.jpg", width: 800, height: 600, meta: { fileName: "a.jpg" }, tags: [TAGS[0]] };

// The API answers by URL: the tag list, else one page of images.
const answer = ({ url }) =>
  url === "/image-tags/" ? { data: { data: TAGS } } : { data: { data: [IMAGE], pagination: { pages: 3 } } };

const PageLayout = { template: "<div><slot name='header' /><slot name='toolbar' /><slot /></div>" };
const FilterChip = { props: ["label", "active"], emits: ["click"], template: "<button class='chip' @click=\"$emit('click')\">{{ label }}</button>" };

const mountGallery = async () => {
  const wrapper = mount(Gallery, {
    global: {
      components: { PageLayout, FilterChip },
      stubs: { FilterChip: false, PageHeader: true, BasicSelect: true, MediaTile: true, IconButton: true, Tag: true, Pagination: true, FloatingActions: true, BasicModal: true, ConfirmDialog: true },
    },
  });
  await flushPromises();
  return wrapper;
};

const lastImagesQuery = () => mockContent.mock.calls.map(([arg]) => arg).filter(({ url }) => url === "/images/").at(-1);

describe("Gallery", () => {
  beforeEach(() => {
    mockContent.mockReset().mockImplementation(async (arg) => answer(arg));
    mockPutTags.mockReset().mockResolvedValue({});
  });

  it("a tag chip filters the grid by its slug from page 1, a second click clears it", async () => {
    const wrapper = await mountGallery();
    const chip = wrapper.findAll(".chip")[1];
    await chip.trigger("click");
    await flushPromises();
    expect(lastImagesQuery().params).toMatchObject({ page: 1, tags: ["blog-cover"] });
    expect(wrapper.findAllComponents(FilterChip)[1].props("active")).toBe(true);
    await chip.trigger("click");
    await flushPromises();
    expect(lastImagesQuery().params.tags).toEqual([]);
  });

  it("sort and page size reload the first page with the new value", async () => {
    const wrapper = await mountGallery();
    wrapper.vm.setSort("created_at");
    await flushPromises();
    expect(lastImagesQuery().params).toMatchObject({ page: 1, sort: "created_at", limit: 18 });
    wrapper.vm.setLimit(36);
    await flushPromises();
    expect(lastImagesQuery().params).toMatchObject({ page: 1, sort: "created_at", limit: 36 });
  });

  it("the tag editor saves the picked labels as the image's tag objects", async () => {
    const wrapper = await mountGallery();
    wrapper.vm.openTagEditor(IMAGE);
    expect(wrapper.vm.selected_tags).toEqual(["Summer"]);
    wrapper.vm.selected_tags = ["Summer", "Blog cover"];
    wrapper.vm.saveImageTags();
    await flushPromises();
    expect(mockPutTags).toHaveBeenCalledWith({ uid: "img-1", tags: TAGS });
    expect(wrapper.vm.dialog).toBe(null);
  });

  it("the tag editor works on a copy: a cancelled edit leaves the tile's tags alone", async () => {
    const wrapper = await mountGallery();
    const image = { ...IMAGE, tags: [TAGS[0]] };
    wrapper.vm.openTagEditor(image);
    wrapper.vm.edited_image_tags.push(TAGS[1]);
    wrapper.vm.closeDialog();
    expect(image.tags).toEqual([TAGS[0]]);
  });

  it("deleting a tag that filters the grid drops it from the filter and reloads", async () => {
    const wrapper = await mountGallery();
    await wrapper.findAll(".chip")[0].trigger("click");
    wrapper.vm.selected_tags = ["Summer"];
    await wrapper.vm.deleteSelectedTags();
    await flushPromises();
    expect(wrapper.vm.filter_tags).toEqual([]);
    expect(lastImagesQuery().params.tags).toEqual([]);
  });

  it("deleting a photo waits for the confirmation", async () => {
    const wrapper = await mountGallery();
    wrapper.vm.askDeleteImage(IMAGE);
    expect(mockContent).not.toHaveBeenCalledWith(expect.objectContaining({ method: "delete" }));
    wrapper.vm.runConfirm();
    await flushPromises();
    expect(mockContent).toHaveBeenCalledWith({ url: "/images/img-1", method: "delete" });
    expect(wrapper.vm.confirm).toBe(null);
  });
});
