/**
 * etap-12 #24 — productClassLabel + productClassBadge / productClassColor map every PIM
 * product_class_name value (including ProductBase, which previously fell through to "Custom").
 *
 * We exercise the Options API method objects directly with a synthetic `this`
 * (no full SFC mount — both ProductList and ProductDetail pull in dozens of
 * unrelated dependencies; pure-mapping logic is testable in isolation).
 */
import { describe, it, expect } from "vitest";

import ProductList from "@/views/Pim/ProductList.vue";
import ProductDetail from "@/views/Pim/ProductDetail.vue";

const ctx = { $t: (key) => key };

describe("etap-12 #24 — ProductList.productClassLabel + productClassBadge", () => {
  const label = (name) =>
    ProductList.methods.productClassLabel.call(ctx, name);
  const badge = (name) =>
    ProductList.methods.productClassBadge.call(ctx, name);

  it.each([
    ["ProductBase", "pim.type_base", "bg-raised t-secondary"],
    ["ProductSimple", "pim.type_simple", "bg-accent-subtle t-strong"],
    ["ProductConfigurable", "pim.type_configurable", "bg-accent-fill t-on-accent-fill"],
    ["ProductBundle", "pim.type_bundle", "bg-warning-subtle t-warning"],
  ])("maps %s to label + badge", (name, expectedLabel, expectedBadge) => {
    expect(label(name)).toBe(expectedLabel);
    expect(badge(name)).toBe(expectedBadge);
  });

  it("falls back to type_custom for unknown class names", () => {
    expect(label("Whatever")).toBe("pim.type_custom");
    expect(badge("Whatever")).toBe("bg-raised t-secondary");
  });

  it("survives null/undefined input without throwing", () => {
    expect(label(null)).toBe("pim.type_custom");
    expect(label(undefined)).toBe("pim.type_custom");
    expect(badge(null)).toBe("bg-raised t-secondary");
  });
});

describe("etap-12 #24 — ProductDetail.productClassLabel + productClassColor (computed)", () => {
  const label = (name) =>
    ProductDetail.computed.productClassLabel.call({
      ...ctx,
      product: { product_class_name: name },
    });
  const color = (name) =>
    ProductDetail.computed.productClassColor.call({
      ...ctx,
      product: { product_class_name: name },
    });

  it.each([
    ["ProductBase", "pim.type_base", "t-body"],
    ["ProductSimple", "pim.type_simple", "t-accent"],
    ["ProductConfigurable", "pim.type_configurable", "t-accent"],
    ["ProductBundle", "pim.type_bundle", "t-warning"],
  ])("maps %s to label + color", (name, expectedLabel, expectedColor) => {
    expect(label(name)).toBe(expectedLabel);
    expect(color(name)).toBe(expectedColor);
  });

  it("falls back to type_custom for unknown class names", () => {
    expect(label("MysteryClass")).toBe("pim.type_custom");
    expect(color("MysteryClass")).toBe("t-body");
  });
});
