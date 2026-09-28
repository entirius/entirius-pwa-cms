import { describe, it, expect, vi } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";

vi.mock("@/api/stock/api", () => ({
  GET_WarehouseProducts: vi.fn().mockResolvedValue({
    data: {
      results: [
        { sku: "SKU-1", quantity: 5, has_stock: true, dispatch_resolved: null },
        { sku: "SKU-2", quantity: 0, has_stock: false, dispatch_resolved: null },
      ],
      count: 2,
    },
  }),
  PATCH_WarehouseStock: vi.fn(),
}));
vi.mock("@/stores/loader", () => ({ useLoaderStore: () => ({ loaderStart() {}, loaderFinish() {} }) }));
vi.mock("@/stores/notify", () => ({ useNotifyStore: () => ({ spawnNotification() {} }) }));
vi.mock("@/composables/useFormErrors", () => ({
  useFormErrors: () => ({ handleApiError: vi.fn() }),
  extractApiMessage: (e, fallback) => fallback,
}));

import NumberInput from "@/boots/NumberInput/index.vue";
import DataTable from "@/boots/DataTable/index.vue";
import WarehouseStockTable from "@/views/Stock/WarehouseStockTable.vue";

const activeWarehouse = { code: "main", name: "Main", source_type: "manual" };

function mountTable() {
  return mount(WarehouseStockTable, {
    global: {
      provide: { activeWarehouse: () => activeWarehouse },
      components: { NumberInput, DataTable },
      stubs: { StockWarehousePicker: true, ActionBar: true, Pagination: true, ImportCSVModal: true },
    },
  });
}

// Plan 38 review: the DataTable quantity cell wires NumberInput to onQtyChange/getDisplayQty. A shallow render
// (DataTable stubbed) never exercises that binding — mount it for real.
describe("WarehouseStockTable quantity cell", () => {
  it("shows the stored quantity and marks a row dirty on change", async () => {
    const wrapper = mountTable();
    await flushPromises();

    const inputs = wrapper.findAll(".number-input__value");
    expect(inputs).toHaveLength(2);
    expect(inputs[0].element.value).toBe("5");
    expect(inputs[1].element.value).toBe("0");
    expect(wrapper.vm.isDirty("SKU-1")).toBe(false);

    await inputs[0].setValue("9");
    expect(wrapper.vm.isDirty("SKU-1")).toBe(true);
    expect(wrapper.vm.getDisplayQty({ sku: "SKU-1", has_stock: true, quantity: 5 })).toBe("9");
  });

  it("stays dirty once changed, even back at the original digits (pre-existing: onQtyChange compares the emitted string to the numeric quantity)", async () => {
    const wrapper = mountTable();
    await flushPromises();

    const inputs = wrapper.findAll(".number-input__value");
    await inputs[0].setValue("9");
    expect(wrapper.vm.isDirty("SKU-1")).toBe(true);

    await inputs[0].setValue("5");
    expect(wrapper.vm.isDirty("SKU-1")).toBe(true);
  });
});
