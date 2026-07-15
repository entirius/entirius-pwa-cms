import { vi, describe, it, expect, beforeEach } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";

const getStaged = vi.fn(() =>
  Promise.resolve({ data: new Blob(["after-bytes"]) })
);
vi.mock("@/api/enrichment/api", () => ({
  GET_StagedFile: (...args) => getStaged(...args),
}));

import ImageDiff from "@/views/EnrichmentReview/ImageDiff.vue";

beforeEach(() => {
  getStaged.mockClear();
  global.URL.createObjectURL = vi.fn(() => "blob:after");
  global.URL.revokeObjectURL = vi.fn();
});

function render(props) {
  return mount(ImageDiff, { props, global: { stubs: { GalleryModal: true } } });
}

describe("ImageDiff before/after", () => {
  it("renders the before image from beforeUrl", () => {
    const w = render({ beforeUrl: "/media/old.png", proposalId: null });
    const img = w.find('[data-testid="image-diff-before-img"]');
    expect(img.exists()).toBe(true);
    expect(img.attributes("src")).toBe("/media/old.png");
  });

  it("shows 'no current image' when before is empty", () => {
    const w = render({ beforeUrl: "", proposalId: null });
    expect(w.find('[data-testid="image-diff-before-img"]').exists()).toBe(
      false
    );
    expect(w.find('[data-testid="image-diff-before"]').text()).toContain(
      "enrichment.image.none"
    );
  });

  it("fetches the staged 'after' image and objectURLs it", async () => {
    const w = render({ beforeUrl: "/media/old.png", proposalId: 9 });
    await flushPromises();

    expect(getStaged).toHaveBeenCalledWith(9);
    const after = w.find('[data-testid="image-diff-after-img"]');
    expect(after.exists()).toBe(true);
    expect(after.attributes("src")).toBe("blob:after");
  });

  it("does not fetch when there is no proposalId", () => {
    render({ beforeUrl: "/media/old.png", proposalId: null });
    expect(getStaged).not.toHaveBeenCalled();
  });
});
