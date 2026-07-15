import { describe, it, expect, vi, beforeEach } from "vitest";

const mockForceRepush = vi.fn();
const mockAcknowledge = vi.fn();

vi.mock("@/api/suppliers/api", () => ({
  POST_ForceRepushProduct: (...args) => mockForceRepush(...args),
  POST_AcknowledgeSku: (...args) => mockAcknowledge(...args),
}));

import { useSupplierBulkActions } from "@/composables/useSupplierBulkActions";

beforeEach(() => {
  mockForceRepush.mockReset();
  mockAcknowledge.mockReset();
});

describe("useSupplierBulkActions", () => {
  it("forceRepushSps — happy path returns all succeeded, none failed", async () => {
    mockForceRepush.mockResolvedValue({ data: {} });
    const { forceRepushSps } = useSupplierBulkActions();
    const rows = [{ id: 1, real_product_sku: "A" }, { id: 2, real_product_sku: "B" }];

    const result = await forceRepushSps(rows);

    expect(result.succeeded).toHaveLength(2);
    expect(result.failed).toHaveLength(0);
    expect(mockForceRepush).toHaveBeenCalledTimes(2);
    expect(mockForceRepush).toHaveBeenCalledWith(1);
    expect(mockForceRepush).toHaveBeenCalledWith(2);
  });

  it("forceRepushSps — partial failure aggregates succeeded + failed", async () => {
    mockForceRepush.mockImplementation((id) =>
      id === 2 ? Promise.reject(new Error("boom")) : Promise.resolve({ data: {} })
    );
    const { forceRepushSps } = useSupplierBulkActions();
    const rows = [{ id: 1, real_product_sku: "A" }, { id: 2, real_product_sku: "B" }, { id: 3, real_product_sku: "C" }];

    const result = await forceRepushSps(rows);

    expect(result.succeeded.map((r) => r.id).sort()).toEqual([1, 3]);
    expect(result.failed).toHaveLength(1);
    expect(result.failed[0].row.id).toBe(2);
    expect(result.failed[0].error).toBeInstanceOf(Error);
  });

  it("acknowledgeSps — deduplicates SKUs across selected SP rows", async () => {
    mockAcknowledge.mockResolvedValue({ data: {} });
    const { acknowledgeSps } = useSupplierBulkActions();
    const rows = [
      { id: 1, real_product_sku: "SKU-A" },
      { id: 2, real_product_sku: "SKU-A" }, // duplicate SKU
      { id: 3, real_product_sku: "SKU-B" },
      { id: 4, real_product_sku: null }, // filtered out
    ];

    const result = await acknowledgeSps(rows);

    expect(mockAcknowledge).toHaveBeenCalledTimes(2);
    expect(mockAcknowledge).toHaveBeenCalledWith("SKU-A", { all_unseen: true });
    expect(mockAcknowledge).toHaveBeenCalledWith("SKU-B", { all_unseen: true });
    expect(result.succeeded.sort()).toEqual(["SKU-A", "SKU-B"]);
    expect(result.failed).toHaveLength(0);
  });

  it("acknowledgeSps — collects per-SKU failures without aborting other SKUs", async () => {
    mockAcknowledge.mockImplementation((sku) =>
      sku === "SKU-X" ? Promise.reject(new Error("conflict")) : Promise.resolve({ data: {} })
    );
    const { acknowledgeSps } = useSupplierBulkActions();
    const rows = [
      { id: 1, real_product_sku: "SKU-X" },
      { id: 2, real_product_sku: "SKU-Y" },
    ];

    const result = await acknowledgeSps(rows);

    expect(result.succeeded).toEqual(["SKU-Y"]);
    expect(result.failed).toHaveLength(1);
    expect(result.failed[0].sku).toBe("SKU-X");
  });
});
