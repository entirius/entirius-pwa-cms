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
    ["ProductBase", "pim.type_base", "bg-basic-200 t-basic-600"],
    ["ProductSimple", "pim.type_simple", "bg-support-100 t-support-400"],
    ["ProductConfigurable", "pim.type_configurable", "bg-primary-100 t-primary-300"],
    ["ProductBundle", "pim.type_bundle", "bg-warning-100 t-warning-300"],
  ])("maps %s to label + badge", (name, expectedLabel, expectedBadge) => {
    expect(label(name)).toBe(expectedLabel);
    expect(badge(name)).toBe(expectedBadge);
  });

  it("falls back to type_custom for unknown class names", () => {
    expect(label("Whatever")).toBe("pim.type_custom");
    expect(badge("Whatever")).toBe("bg-basic-200 t-basic-600");
  });

  it("survives null/undefined input without throwing", () => {
    expect(label(null)).toBe("pim.type_custom");
    expect(label(undefined)).toBe("pim.type_custom");
    expect(badge(null)).toBe("bg-basic-200 t-basic-600");
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
    ["ProductBase", "pim.type_base", "t-basic-700"],
    ["ProductSimple", "pim.type_simple", "t-support-400"],
    ["ProductConfigurable", "pim.type_configurable", "t-primary-300"],
    ["ProductBundle", "pim.type_bundle", "t-warning-300"],
  ])("maps %s to label + color", (name, expectedLabel, expectedColor) => {
    expect(label(name)).toBe(expectedLabel);
    expect(color(name)).toBe(expectedColor);
  });

  it("falls back to type_custom for unknown class names", () => {
    expect(label("MysteryClass")).toBe("pim.type_custom");
    expect(color("MysteryClass")).toBe("t-basic-700");
  });
});
