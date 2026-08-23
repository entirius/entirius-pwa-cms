import { describe, it, expect, vi } from "vitest";
import { mount } from "@vue/test-utils";
import Find from "@/views/Atlas/Find.vue";

const globalStubs = {
  DedupSearchBox: {
    name: "DedupSearchBox",
    props: ["initialQuery"],
    emits: ["results", "error"],
    template: "<div class='stub-box' />",
  },
  CandidateRow: {
    name: "CandidateRow",
    props: ["hit"],
    template: "<div class='stub-row'>{{ hit.basic.sku }}</div>",
  },
  EmptyState: {
    name: "EmptyState",
    props: ["title", "message"],
    template: "<div class='stub-empty' :data-title='title'><slot /></div>",
  },
  BasicButton: {
    name: "BasicButton",
    props: ["text"],
    emits: ["click"],
    template:
      "<button class='stub-button' @click=\"$emit('click')\">{{ text }}</button>",
  },
};

function makeHit(overrides = {}) {
  return {
    kind: "pim_product",
    ref: "SKU-1",
    similarity: 80,
    reasons: [],
    basic: { sku: "SKU-1", name: "Bosch", detail_url: "/x" },
    ...overrides,
  };
}

describe("Find.vue (AtlasFind)", () => {
  function mountFind(routerPush = vi.fn()) {
    return mount(Find, {
      global: {
        stubs: globalStubs,
        mocks: { $router: { push: routerPush }, $route: { query: {} } },
      },
    });
  }

  it("renders the understood-as line from query_parsed once results arrive", async () => {
    const wrapper = mountFind();
    await wrapper
      .findComponent({ name: "DedupSearchBox" })
      .vm.$emit("results", {
        hits: [makeHit()],
        query_parsed: { gtin14: "05901234123457", brand_norm: "bosch" },
        warnings: [],
        q: "5901234123457",
      });

    expect(wrapper.text()).toContain("GTIN 05901234123457");
    expect(wrapper.text()).toContain("brand bosch");
  });

  it("shows the empty state with a create-product CTA when a search returns no hits", async () => {
    const push = vi.fn();
    const wrapper = mountFind(push);
    await wrapper
      .findComponent({ name: "DedupSearchBox" })
      .vm.$emit("results", {
        hits: [],
        query_parsed: {},
        warnings: [],
        q: "no such product",
      });

    const empty = wrapper.find(".stub-empty");
    expect(empty.exists()).toBe(true);
    await wrapper
      .find("[data-testid='atlas-find-create-product']")
      .trigger("click");
    expect(push).toHaveBeenCalledWith({
      name: "PimProductCreate",
      query: { q: "no such product" },
    });
  });

  it("does not show the empty state before any search has run", () => {
    const wrapper = mountFind();
    expect(wrapper.find(".stub-empty").exists()).toBe(false);
  });

  it("clears stale hits and suppresses the empty state when a search errors", async () => {
    const wrapper = mountFind();
    const box = wrapper.findComponent({ name: "DedupSearchBox" });

    await box.vm.$emit("results", {
      hits: [makeHit()],
      query_parsed: { gtin14: "05901234123457" },
      warnings: ["image_layer_unavailable"],
      q: "5901234123457",
    });
    expect(wrapper.findAll(".stub-row")).toHaveLength(1);

    await box.vm.$emit("error", "Internal server error");
    expect(wrapper.findAll(".stub-row")).toHaveLength(0);
    expect(wrapper.find("[data-testid='atlas-find-warnings']").exists()).toBe(
      false
    );
    expect(wrapper.find(".stub-empty").exists()).toBe(false);
  });
});
