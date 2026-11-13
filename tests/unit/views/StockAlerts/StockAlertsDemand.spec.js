import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import DataTable from "@/boots/DataTable/index.vue";

// Stock alerts plan 03: the Demand list — rows with the stock badge, the empty state, a row opens the requests of its
// SKU.
const mockGetDemand = vi.fn();
vi.mock("@/api/stockAlerts/api", () => ({ GET_StockAlertsDemand: (...a) => mockGetDemand(...a) }));
vi.mock("@/stores/notify", () => ({ useNotifyStore: () => ({ spawnNotification: vi.fn() }) }));

import StockAlertsDemand from "@/views/StockAlerts/StockAlertsDemand.vue";

const row = (over = {}) => ({
  sku: "TSHIRT-RED-M",
  parent_sku: "TSHIRT",
  product_name: "Red T-shirt",
  variant_line: "Size: M",
  waiting: 4,
  oldest_request: "2026-11-01T10:00:00Z",
  quantity: 0,
  notified_30d: 1,
  ...over,
});

const StatusBadge = { name: "StatusBadge", props: ["label", "tone"], template: "<span class='badge'>{{ label }}</span>" };
const EmptyState = { name: "EmptyState", props: ["title", "message"], template: "<div class='empty'>{{ title }}</div>" };

function mountDemand(push = vi.fn()) {
  return mount(StockAlertsDemand, {
    global: {
      components: { DataTable },
      stubs: { StatusBadge, EmptyState, BasicTooltip: { template: "<span><slot /></span>" }, Pagination: true, PageHeader: true },
      mocks: { $router: { push }, $route: { path: "/stock-alerts", query: {} } },
    },
  });
}

describe("StockAlertsDemand", () => {
  beforeEach(() => mockGetDemand.mockReset());

  it("renders the rows, the summary and asks for the most waited first", async () => {
    mockGetDemand.mockResolvedValue({ data: { count: 1, total_waiting: 4, results: [row()] } });
    const wrapper = mountDemand();
    await flushPromises();

    expect(mockGetDemand).toHaveBeenCalledWith(expect.objectContaining({ ordering: "-waiting", page: 1 }));
    expect(wrapper.text()).toContain("Red T-shirt");
    expect(wrapper.text()).toContain("Size: M · TSHIRT-RED-M");
    expect(wrapper.find("[data-testid='stock-alerts-summary']").text()).toContain('"waiting":4');
  });

  it("badges the stock by quantity", async () => {
    mockGetDemand.mockResolvedValue({
      data: { count: 2, total_waiting: 5, results: [row(), row({ sku: "TSHIRT-RED-L", quantity: 3 })] },
    });
    const wrapper = mountDemand();
    await flushPromises();

    const badges = wrapper.findAllComponents(StatusBadge).map((badge) => [badge.props("label"), badge.props("tone")]);
    expect(badges).toEqual([
      ["stock_alerts.sold_out", "neutral"],
      ['stock_alerts.in_stock::{"count":3}', "positive"],
    ]);
  });

  it("shows the empty state when nobody waits", async () => {
    mockGetDemand.mockResolvedValue({ data: { count: 0, total_waiting: 0, results: [] } });
    const wrapper = mountDemand();
    await flushPromises();

    expect(wrapper.findComponent(EmptyState).props("title")).toBe("stock_alerts.empty_title");
    expect(wrapper.find("[data-testid='stock-alerts-summary']").exists()).toBe(false);
  });

  it("a row click opens the requests filtered by its SKU", async () => {
    mockGetDemand.mockResolvedValue({ data: { count: 1, total_waiting: 4, results: [row()] } });
    const push = vi.fn();
    const wrapper = mountDemand(push);
    await flushPromises();

    wrapper.findComponent(DataTable).vm.$emit("row-click", row());
    expect(push).toHaveBeenCalledWith({ name: "StockAlertsSubscriptions", query: { sku: "TSHIRT-RED-M" } });
  });

  it("sorting sends the ordering and clearing it falls back to the default", async () => {
    mockGetDemand.mockResolvedValue({ data: { count: 1, total_waiting: 4, results: [row()] } });
    const wrapper = mountDemand();
    await flushPromises();
    const table = wrapper.findComponent(DataTable);

    table.vm.$emit("sort", { key: "oldest_request", direction: "asc" });
    expect(mockGetDemand).toHaveBeenLastCalledWith(expect.objectContaining({ ordering: "oldest_request" }));
    table.vm.$emit("sort", { key: null, direction: null });
    expect(mockGetDemand).toHaveBeenLastCalledWith(expect.objectContaining({ ordering: "-waiting" }));
  });
});
