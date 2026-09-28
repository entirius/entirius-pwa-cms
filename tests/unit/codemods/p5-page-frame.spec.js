// @vitest-environment node
// Node, not happy-dom: the codemods resolve their files from import.meta.url, a file: URL only under node.
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { applyEdits } from "../../../scripts/codemods/p3-lib.mjs";
import { isExcluded, transform } from "../../../scripts/codemods/p5-page-frame.mjs";

const fixture = (name) => readFileSync(new URL(`./fixtures/p5-page-frame/${name}`, import.meta.url), "utf8");
const lineOf = (text, offset) => text.slice(0, offset).split("\n").length;
const rewrite = (name) => {
  const input = fixture(`${name}.input.vue`);
  const { edits, flags } = transform(input, `src/views/Faq/${name}.vue`);
  return { output: applyEdits(input, edits), flags };
};

describe("p5-page-frame codemod", () => {
  it("turns the wrapper + card pair into PageLayout, header and toolbar in their slots; every other byte stays", () => {
    const { output, flags } = rewrite("wrapped");
    expect(output).toBe(fixture("wrapped.expected.vue"));
    expect(flags).toEqual([]);
  });

  it("leaves an inline form row (no search, no filters) in the body", () => {
    expect(rewrite("form-row").output).toBe(fixture("form-row.expected.vue"));
  });

  it("keeps a conditional card's condition on a template and leaves its header where it is", () => {
    expect(rewrite("conditional").output).toBe(fixture("conditional.expected.vue"));
  });

  it("turns a card without the wrapper into the PageLayout itself", () => {
    expect(rewrite("root").output).toBe(fixture("root.expected.vue"));
  });

  it("is idempotent: a rewritten page has nothing left", () => {
    const { output } = rewrite("wrapped");
    expect(transform(output, "src/views/Faq/wrapped.vue")).toEqual({ edits: [], flags: [] });
  });

  it("flags what is not the exact frame pair, and a PageHeader outside #header", () => {
    const input = fixture("flags.vue");
    const { edits, flags } = transform(input, "src/views/Faq/flags.vue");
    expect(edits).toEqual([]);
    expect(flags.map((flag) => [lineOf(input, flag.offset), flag.message])).toEqual([
      [3, "page card with extra classes or attributes: frame by hand"],
      [4, "nested or standalone card: BasicCard (or no card) by hand"],
      [7, "page card outside the page wrapper: frame by hand"],
      [12, "PageHeader outside #header: move it by hand, the condition onto the slot"],
    ]);
  });

  it("skips Home and Gallery (plans 26 and 29)", () => {
    const input = fixture("wrapped.input.vue");
    expect(isExcluded("src/views/Home/index.vue")).toBe(true);
    expect(isExcluded("src/views/Gallery.vue")).toBe(true);
    expect(isExcluded("src/views/Faq/ItemList.vue")).toBe(false);
    expect(transform(input, "src/views/Home/index.vue")).toEqual({ edits: [], flags: [] });
    expect(transform(input, "src/views/Gallery.vue")).toEqual({ edits: [], flags: [] });
  });
});
