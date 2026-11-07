import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import BasicInput from "@/boots/BasicInput/index.vue";
import StatusBadge from "@/boots/StatusBadge/index.vue";

const funnel = {
  companies: 40,
  transitions: [{ from_stage: "new", to_stage: "contacted", count: 12, avg_seconds_in_from_stage: 7200 }],
  stages: [
    { stage: "new", current: 5, entered: 40, left: 12, avg_seconds_in_stage: 90000 },
    { stage: "contacted", current: 12, entered: 12, left: 0, avg_seconds_in_stage: null },
  ],
  origins: [{ origin: "ecom.house", companies: 30 }, { origin: "", companies: 10 }],
};
const pilots = {
  as_of: "2026-11-07",
  total: 3,
  by_result: { pending: 1, success: 1, failure: 1, cancelled: 0 },
  running: 1,
  overdue: 0,
  avg_length_days: 14.5,
  license_switch_due: [{ pilot_id: 1, company_id: 9, domain: "example-shop.test", switch_date: "2026-11-20" }],
};
const api = vi.hoisted(() => ({ GET_FunnelReport: vi.fn(), GET_PilotReport: vi.fn(), GET_Stages: vi.fn() }));
vi.mock("@/api/leads/api", () => api);

import Reports from "@/views/Leads/Reports.vue";
import { leadsFrame, setControl } from "./leadsFrame";

const RouterLink = { props: ["to"], template: "<a :data-to='JSON.stringify(to)'><slot /></a>" };
const global = { components: leadsFrame.components, stubs: { ...leadsFrame.stubs, BasicInput, StatusBadge, RouterLink, Loader: true } };
const mountScreen = async () => {
  const wrapper = mount(Reports, { global });
  await flushPromises();
  return wrapper;
};

// T3: Leads → Reports.
describe("Leads → Reports", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.GET_FunnelReport.mockResolvedValue({ data: funnel });
    api.GET_PilotReport.mockResolvedValue({ data: pilots });
    api.GET_Stages.mockResolvedValue({ data: { results: [{ key: "new", label: "New" }, { key: "contacted", label: "Contacted" }] } });
  });

  it("shows the funnel by stage and transition, with stage labels and durations", async () => {
    const wrapper = await mountScreen();
    expect(api.GET_FunnelReport).toHaveBeenCalledWith({});
    expect(wrapper.get('[data-testid="funnel-companies"]').text()).toContain("40");
    const stage = wrapper.get('[data-testid="funnel-stage"][data-stage="new"]').text();
    expect(stage).toContain("New");
    expect(stage).toContain("1d 1h"); // 90000 s
    expect(wrapper.get('[data-testid="funnel-stage"][data-stage="contacted"]').text()).toContain("—");
    const transition = wrapper.get('[data-testid="funnel-transition"]').text();
    expect(transition).toContain("New → Contacted");
    expect(transition).toContain("12");
    expect(transition).toContain("2h 0m");
  });

  it("filters by origin: any omits it, no origin sends it empty, a name sends the name", async () => {
    const wrapper = await mountScreen();
    const options = wrapper.findComponent('[data-testid="funnel-origin"]').props("options");
    expect(options.map((o) => o.value)).toEqual(["__any__", "ecom.house", "__none__"]);
    expect(options[0].label).toBe("Any origin");
    expect(options[1].label).toBe("ecom.house (30)");
    await setControl(wrapper, "funnel-origin", "ecom.house");
    await flushPromises();
    expect(api.GET_FunnelReport).toHaveBeenLastCalledWith({ origin: "ecom.house" });
    await setControl(wrapper, "funnel-origin", "__none__");
    await flushPromises();
    expect(api.GET_FunnelReport).toHaveBeenLastCalledWith({ origin: "" });
    await setControl(wrapper, "funnel-origin", "__any__");
    await flushPromises();
    expect(api.GET_FunnelReport).toHaveBeenLastCalledWith({});
  });

  it("bounds the window with dates as ISO instants", async () => {
    const wrapper = await mountScreen();
    await wrapper.get('[data-testid="funnel-from"] input').setValue("2026-11-01");
    await flushPromises();
    await wrapper.get('[data-testid="funnel-to"] input').setValue("2026-11-05");
    await flushPromises();
    expect(api.GET_FunnelReport).toHaveBeenLastCalledWith({ date_from: "2026-11-01T00:00:00+00:00", date_to: "2026-11-05T23:59:59+00:00" });
  });

  it("shows the pilot report: tiles, results and the licence switches coming", async () => {
    const wrapper = await mountScreen();
    expect(wrapper.get('[data-testid="pilot-total"]').text()).toContain("3");
    expect(wrapper.get('[data-testid="pilot-avg"]').text()).toContain("14.5 days");
    expect(wrapper.get('[data-testid="pilot-by-result"]').findAll("li")).toHaveLength(4);
    expect(wrapper.get('[data-testid="pilot-switch"]').text()).toContain("example-shop.test");
    expect(wrapper.get('[data-testid="pilot-switch"] a').attributes("data-to")).toContain('"tab":"pilot"');
  });

  it("says when a report cannot be loaded, and each report stands alone", async () => {
    api.GET_FunnelReport.mockRejectedValue({ response: { status: 500 } });
    const wrapper = await mountScreen();
    expect(wrapper.find('[data-testid="funnel-error"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="pilot-total"]').exists()).toBe(true);
  });
});
