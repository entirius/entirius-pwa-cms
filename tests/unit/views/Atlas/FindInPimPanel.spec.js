import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";

const mockProductLink = vi.fn();
const mockSpawnNotification = vi.fn();

vi.mock("@/api/atlas/api", () => ({
  POST_ProductLink: (...args) => mockProductLink(...args),
}));

vi.mock("@/stores/notify", () => ({
  useNotifyStore: () => ({ spawnNotification: mockSpawnNotification }),
}));

import FindInPimPanel from "@/views/Atlas/components/FindInPimPanel.vue";

const globalStubs = {
  DedupSearchBox: {
    name: "DedupSearchBox",
    props: ["scope", "initialQuery", "imageUrl", "inline"],
    emits: ["results"],
    template: "<div class='stub-box' />",
  },
  CandidateRow: {
    name: "CandidateRow",
    props: ["hit"],
    template: "<div class='stub-row'><slot name='actions' /></div>",
  },
  FontAwesomeIcon: true,
};

function makeHit(overrides = {}) {
  return {
    kind: "pim_product",
    ref: "SKU-1",
    score: 90,
    decision: "match",
    reasons: [],
    basic: { sku: "SKU-1", name: "Bosch GSR 12V-15", detail_url: "/x" },
    ...overrides,
  };
}

describe("FindInPimPanel.vue", () => {
  beforeEach(() => {
    mockProductLink.mockReset();
    mockSpawnNotification.mockReset();
  });

  function mountPanel(props = {}) {
    return mount(FindInPimPanel, {
      props: {
        sourceIdx: "kinghoff",
        name: "Bosch GSR 12V-15",
        ean: "5901234123457",
        imageUrl: "/media/atlas/photo.jpg",
        externalId: "K-1",
        ...props,
      },
      global: { stubs: globalStubs },
    });
  }

  it("seeds DedupSearchBox from name+ean and passes imageUrl through", () => {
    const wrapper = mountPanel();
    const box = wrapper.findComponent({ name: "DedupSearchBox" });
    expect(box.props("initialQuery")).toBe("Bosch GSR 12V-15 5901234123457");
    expect(box.props("imageUrl")).toBe("/media/atlas/photo.jpg");
    expect(box.props("scope")).toEqual(["pim_product"]);
  });

  it("link() success: posts source_idx/real_product_sku/external_id, notifies, emits linked", async () => {
    mockProductLink.mockResolvedValue({ data: {} });
    const wrapper = mountPanel();
    await wrapper
      .findComponent({ name: "DedupSearchBox" })
      .vm.$emit("results", { hits: [makeHit()] });

    await wrapper
      .find("[data-testid='find-in-pim-link-SKU-1']")
      .trigger("click");
    await flushPromises();

    expect(mockProductLink).toHaveBeenCalledWith({
      source_idx: "kinghoff",
      real_product_sku: "SKU-1",
      external_id: "K-1",
    });
    expect(mockSpawnNotification).toHaveBeenCalledWith(
      expect.objectContaining({ type: "positive" })
    );
    expect(wrapper.emitted("linked")).toHaveLength(1);
  });

  it("link() failure: notifies negative and does not emit linked", async () => {
    mockProductLink.mockRejectedValue({
      response: { data: { detail: "Conflict" } },
    });
    const wrapper = mountPanel();
    await wrapper
      .findComponent({ name: "DedupSearchBox" })
      .vm.$emit("results", { hits: [makeHit()] });

    await wrapper
      .find("[data-testid='find-in-pim-link-SKU-1']")
      .trigger("click");
    await flushPromises();

    expect(mockSpawnNotification).toHaveBeenCalledWith(
      expect.objectContaining({ type: "negative" })
    );
    expect(wrapper.emitted("linked")).toBeUndefined();
  });

  it("disables the Link button for the in-flight sku until the request settles", async () => {
    let resolveLink;
    mockProductLink.mockReturnValue(
      new Promise((resolve) => {
        resolveLink = resolve;
      })
    );
    const wrapper = mountPanel();
    await wrapper
      .findComponent({ name: "DedupSearchBox" })
      .vm.$emit("results", { hits: [makeHit()] });

    const button = wrapper.find("[data-testid='find-in-pim-link-SKU-1']");
    await button.trigger("click");
    expect(
      wrapper
        .find("[data-testid='find-in-pim-link-SKU-1']")
        .attributes("disabled")
    ).toBeDefined();

    resolveLink({ data: {} });
    await flushPromises();
    expect(
      wrapper
        .find("[data-testid='find-in-pim-link-SKU-1']")
        .attributes("disabled")
    ).toBeUndefined();
  });
});
