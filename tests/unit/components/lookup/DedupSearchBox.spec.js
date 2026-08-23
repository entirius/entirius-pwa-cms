import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";

const mockLookupCheck = vi.fn();
const mockDownscaleImage = vi.fn();

vi.mock("@/api/lookup/api", () => ({
  POST_LookupCheck: (...args) => mockLookupCheck(...args),
}));

vi.mock("@/utils/imageDownscale", () => ({
  downscaleImage: (...args) => mockDownscaleImage(...args),
}));

import DedupSearchBox from "@/components/lookup/DedupSearchBox.vue";

const globalStubs = {
  FilterChip: {
    name: "FilterChip",
    props: ["label", "active"],
    emits: ["click"],
    template:
      "<button class='stub-chip' :data-active='active' @click=\"$emit('click')\">{{ label }}</button>",
  },
  BasicInput: {
    name: "BasicInput",
    props: ["modelValue"],
    emits: ["update:modelValue"],
    template:
      "<input class='stub-input' :value='modelValue' @input=\"$emit('update:modelValue', $event.target.value)\" />",
  },
  BasicButton: {
    name: "BasicButton",
    props: ["text", "isDisabled"],
    emits: ["click"],
    template:
      "<button class='stub-button' :disabled='isDisabled' @click=\"$emit('click')\">{{ text }}</button>",
  },
  FontAwesomeIcon: true,
};

describe("DedupSearchBox.vue", () => {
  beforeEach(() => {
    mockLookupCheck.mockReset();
    mockDownscaleImage.mockReset();
  });

  function mountBox(props = {}) {
    return mount(DedupSearchBox, {
      props,
      global: { stubs: globalStubs },
    });
  }

  it("seeds the query from initialQuery and emits results on search", async () => {
    mockLookupCheck.mockResolvedValue({
      data: {
        hits: [{ kind: "pim_product", ref: "SKU-1" }],
        query_parsed: {},
        warnings: [],
      },
    });
    const wrapper = mountBox({ initialQuery: "5901234123457" });
    expect(wrapper.find(".stub-input").element.value).toBe("5901234123457");

    await wrapper.find(".stub-button").trigger("click");
    await flushPromises();

    expect(mockLookupCheck).toHaveBeenCalledWith({
      scope: ["pim_product", "atlas_source_product"],
      q: "5901234123457",
    });
    const emitted = wrapper.emitted("results");
    expect(emitted).toHaveLength(1);
    expect(emitted[0][0].hits).toHaveLength(1);
    expect(emitted[0][0].q).toBe("5901234123457");
  });

  it("sends a multipart request once an image is set from a paste event", async () => {
    mockDownscaleImage.mockResolvedValue(
      new Blob(["x"], { type: "image/jpeg" })
    );
    mockLookupCheck.mockResolvedValue({
      data: { hits: [], query_parsed: {}, warnings: [] },
    });
    const wrapper = mountBox();

    const imageFile = new File(["bytes"], "photo.png", { type: "image/png" });
    await wrapper.find(".stub-input").trigger("paste", {
      clipboardData: { files: [imageFile], items: [] },
    });
    await flushPromises();

    await wrapper.find(".stub-button").trigger("click");
    await flushPromises();

    expect(mockDownscaleImage).toHaveBeenCalledWith(imageFile);
    const payload = mockLookupCheck.mock.calls[0][0];
    expect(payload).toBeInstanceOf(FormData);
    expect(payload.get("image")).toBeInstanceOf(Blob);
  });

  it("toggles scope chips without dropping below one active catalog", async () => {
    const wrapper = mountBox();
    const chips = wrapper.findAll(".stub-chip");
    expect(chips).toHaveLength(2);

    await chips[0].trigger("click");
    expect(wrapper.vm.activeScope).toEqual(["atlas_source_product"]);

    // The last remaining scope cannot be toggled off.
    await chips[1].trigger("click");
    expect(wrapper.vm.activeScope).toEqual(["atlas_source_product"]);
  });
});
