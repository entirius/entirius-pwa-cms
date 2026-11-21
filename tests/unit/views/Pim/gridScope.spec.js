import { describe, it, expect } from "vitest";
import { gridFilterScope } from "@/views/Pim/gridScope";

describe("gridFilterScope", () => {
  it("is null for a grid without filters", () => {
    expect(gridFilterScope({ activeFilter: "all", attributeFilters: {} })).toBeNull();
    expect(gridFilterScope()).toBeNull();
  });

  it("maps every filter to its adapter key", () => {
    expect(
      gridFilterScope({
        search: "shoe",
        activeFilter: "no_media",
        visibility: 4,
        productClass: 2,
        category: "shoes",
        attributeFilters: { packshot_check: "replace_size" },
      })
    ).toEqual({
      search: "shoe",
      has_media: false,
      visibility: 4,
      product_class: 2,
      category_idx: "shoes",
      attribute_filters: { packshot_check: "replace_size" },
    });
  });

  it("keeps disabled as is_enabled false", () => {
    expect(gridFilterScope({ activeFilter: "disabled" })).toEqual({ is_enabled: false });
  });
});
