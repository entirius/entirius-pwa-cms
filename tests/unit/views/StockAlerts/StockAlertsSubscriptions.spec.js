import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import { reactive } from "vue";
import { routeLocationKey } from "vue-router";
import DataTable from "@/boots/DataTable/index.vue";
import BasicButton from "@/boots/BasicButton/index.vue";
import { ACCESS_STORE } from "@/composables/useReadonly";

// Stock alerts plan 03: the requests list — filters and page go to the API, the SKU chip clears its filter, Cancel
// only on waiting rows and never in read-only mode, the CSV export carries the current filter.
const api = vi.hoisted(() => ({ list: vi.fn(), exportCsv: vi.fn(), cancel: vi.fn() }));
vi.mock("@/api/stockAlerts/api", () => ({
  GET_StockAlertsSubscriptions: (...a) => api.list(...a),
  GET_StockAlertsExport: (...a) => api.exportCsv(...a),
  POST_StockAlertsCancel: (...a) => api.cancel(...a),
}));
vi.mock("@/stores/notify", () => ({ useNotifyStore: () => ({ spawnNotification: vi.fn() }) }));
vi.mock("@/stores/loader", () => ({ useLoaderStore: () => ({ loaderStart() {}, loaderFinish() {} }) }));

import StockAlertsSubscriptions from "@/views/StockAlerts/StockAlertsSubscriptions.vue";

const AREA = "stock_alerts.subscriptions";
const request = (id, status = "waiting") => ({
  id,
  sku: "TSHIRT-RED-M",
  product_name: "Red T-shirt",
  variant_line: "Size: M",
  email: "anna@example.com",
  language: "en",
  status,
  created: "2026-11-01T10:00:00Z",
  notified_at: null,
  cancelled_at: null,
  cancel_reason: "",
});

const SelectProbe = { name: "BasicSelect", props: ["options", "modelValue", "floatingLabel"], template: "<div />" };
const TagProbe = { name: "Tag", props: ["label", "removable"], emits: ["remove"], template: "<span>{{ label }}</span>" };
const ActionBarProbe = { name: "ActionBar", props: ["actions"], template: "<div />" };

function mountList({ query = {}, write = true, push = vi.fn(), replace = vi.fn() } = {}) {
  const access = { available: true, can: (area, level) => area === AREA && (write || level === "read") };
  return mount(StockAlertsSubscriptions, {
    global: {
      components: { DataTable, BasicButton },
      stubs: {
        BasicSelect: SelectProbe,
        Tag: TagProbe,
        ActionBar: ActionBarProbe,
        BasicButton: false,
        PageHeader: { template: "<div><slot name='actions' /></div>" },
        ConfirmDialog: true,
        Pagination: true,
      },
      provide: { [routeLocationKey]: reactive({ meta: { area: AREA } }), [ACCESS_STORE]: access },
      mocks: { $router: { push, replace }, $route: { path: "/stock-alerts/subscriptions", query } },
    },
  });
}

const cancelButtons = (wrapper) => wrapper.findAll("[data-testid^='stock-alerts-cancel-']");

describe("StockAlertsSubscriptions", () => {
  beforeEach(() => {
    api.list.mockReset().mockResolvedValue({ data: { count: 2, results: [request(1), request(2, "notified")] } });
    api.exportCsv.mockReset().mockResolvedValue({ data: "sku\n" });
    api.cancel.mockReset().mockResolvedValue({ data: request(1, "cancelled") });
  });

  it("sends the SKU from the query string, the status filter and the page", async () => {
    const wrapper = mountList({ query: { sku: "TSHIRT-RED-M" } });
    await flushPromises();
    expect(api.list).toHaveBeenLastCalledWith({ sku: "TSHIRT-RED-M", page: 1, page_size: 20 });

    await wrapper.findComponent(SelectProbe).vm.$emit("update:modelValue", "notified");
    await flushPromises();
    expect(api.list).toHaveBeenLastCalledWith({ sku: "TSHIRT-RED-M", status: "notified", page: 1, page_size: 20 });
  });

  it("reads the page from the query string and a new filter drops it from the URL", async () => {
    const replace = vi.fn();
    const wrapper = mountList({ query: { sku: "TSHIRT-RED-M", page: "2" }, replace });
    await flushPromises();
    expect(api.list).toHaveBeenLastCalledWith({ sku: "TSHIRT-RED-M", page: 2, page_size: 20 });

    await wrapper.findComponent(SelectProbe).vm.$emit("update:modelValue", "notified");
    expect(replace).toHaveBeenCalledWith({ path: "/stock-alerts/subscriptions", query: { sku: "TSHIRT-RED-M" } });
  });

  it("removing the SKU chip drops the SKU and the page from the query", async () => {
    const push = vi.fn();
    const wrapper = mountList({ query: { sku: "TSHIRT-RED-M", page: "2" }, push });
    await flushPromises();

    await wrapper.findComponent(TagProbe).vm.$emit("remove");
    expect(push).toHaveBeenCalledWith({ path: "/stock-alerts/subscriptions", query: {} });
  });

  it("offers Cancel on waiting rows only", async () => {
    const wrapper = mountList();
    await flushPromises();
    expect(cancelButtons(wrapper).map((button) => button.attributes("data-testid"))).toEqual(["stock-alerts-cancel-1"]);
  });

  it("hides Cancel in read-only mode", async () => {
    const wrapper = mountList({ write: false });
    await flushPromises();
    expect(cancelButtons(wrapper)).toHaveLength(0);
    expect(wrapper.text()).toContain("anna@example.com");
  });

  it("cancels the confirmed request and reloads", async () => {
    const wrapper = mountList();
    await flushPromises();
    await cancelButtons(wrapper)[0].trigger("click");
    expect(wrapper.vm.pendingCancel.id).toBe(1);

    await wrapper.vm.cancelRequest();
    expect(api.cancel).toHaveBeenCalledWith(1);
    expect(api.list).toHaveBeenCalledTimes(2);
  });

  it("downloads the CSV of the current filter", async () => {
    window.URL.createObjectURL = vi.fn(() => "blob:x");
    window.URL.revokeObjectURL = vi.fn();
    const wrapper = mountList({ query: { sku: "TSHIRT-RED-M" } });
    await flushPromises();
    await wrapper.findComponent(SelectProbe).vm.$emit("update:modelValue", "waiting");

    const csv = wrapper.findComponent(ActionBarProbe).props("actions").find((action) => action.key === "csv");
    expect(csv.mutates).toBe(false);
    await csv.onClick();
    expect(api.exportCsv).toHaveBeenCalledWith({ sku: "TSHIRT-RED-M", status: "waiting" });
  });
});
