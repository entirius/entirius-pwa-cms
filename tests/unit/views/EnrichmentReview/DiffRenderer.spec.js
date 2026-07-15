import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";

import DiffRenderer from "@/views/EnrichmentReview/DiffRenderer.vue";

function render(props) {
  return mount(DiffRenderer, { props });
}

describe("DiffRenderer dispatch", () => {
  it("renders StringDiff for text kind and unwraps {text}", () => {
    const w = render({
      targetKind: "text",
      current: { text: "old" },
      proposed: { text: "new" },
    });
    const child = w.findComponent({ name: "StringDiff" });
    expect(child.exists()).toBe(true);
    expect(child.props("before")).toBe("old");
    expect(child.props("after")).toBe("new");
  });

  it("renders NumericDiff for number kind", () => {
    const w = render({
      targetKind: "number",
      current: { value: 1 },
      proposed: { value: 2 },
    });
    const child = w.findComponent({ name: "NumericDiff" });
    expect(child.exists()).toBe(true);
    expect(child.props("before")).toBe(1);
    expect(child.props("after")).toBe(2);
  });

  it("renders ArrayDiff for array kind passing arrays through", () => {
    const w = render({
      targetKind: "array",
      current: ["a"],
      proposed: ["a", "b"],
    });
    const child = w.findComponent({ name: "ArrayDiff" });
    expect(child.exists()).toBe(true);
    expect(child.props("after")).toEqual(["a", "b"]);
  });

  it("falls back to JsonDiff for unknown kind and keeps the whole object", () => {
    const proposed = { a: 1, b: 2 };
    const w = render({ targetKind: "weird", current: {}, proposed });
    const child = w.findComponent({ name: "JsonDiff" });
    expect(child.exists()).toBe(true);
    expect(child.props("after")).toEqual(proposed);
  });

  it("handles null snapshots without throwing", () => {
    const w = render({
      targetKind: "text",
      current: null,
      proposed: { text: "x" },
    });
    expect(w.findComponent({ name: "StringDiff" }).props("before")).toBe(null);
  });

  it("renders ImageDiff for image kind with before url + proposalId", () => {
    const w = mount(DiffRenderer, {
      props: {
        targetKind: "image",
        current: { url: "/media/x.png" },
        proposalId: 7,
        subjectLabel: "SKU-1",
      },
      global: { stubs: { ImageDiff: true } },
    });
    const child = w.findComponent({ name: "ImageDiff" });
    expect(child.exists()).toBe(true);
    expect(child.props("proposalId")).toBe(7);
    expect(child.props("beforeUrl")).toContain("/media/x.png");
    // No scalar diff component is mounted for image kind.
    expect(w.findComponent({ name: "StringDiff" }).exists()).toBe(false);
  });
});
