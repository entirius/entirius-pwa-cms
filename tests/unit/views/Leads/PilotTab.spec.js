import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import { t } from "@/i18n";
import BasicButton from "@/boots/BasicButton/index.vue";
import BasicInput from "@/boots/BasicInput/index.vue";
import BasicTextarea from "@/boots/BasicTextarea/index.vue";
import StatusBadge from "@/boots/StatusBadge/index.vue";

const server = vi.hoisted(() => ({ pilots: [] }));
const api = vi.hoisted(() => ({
  GET_Pilots: vi.fn(() => Promise.resolve({ data: { results: server.pilots.map((p) => ({ ...p })) } })),
  POST_Pilot: vi.fn(() => Promise.resolve({ data: {} })),
  PATCH_Pilot: vi.fn(() => Promise.resolve({ data: {} })),
  DELETE_Pilot: vi.fn(() => Promise.resolve({ data: {} })),
}));
vi.mock("@/api/leads/api", () => api);

import PilotTab from "@/views/Leads/tabs/PilotTab.vue";
import { leadsFrame, setControl } from "./leadsFrame";

const global = { components: leadsFrame.components, stubs: { ...leadsFrame.stubs, BasicButton, BasicInput, BasicTextarea, StatusBadge } };
const mountTab = async () => {
  const wrapper = mount(PilotTab, { props: { company: { id: 9 } }, global });
  await flushPromises();
  return wrapper;
};
const submit = async (wrapper) => {
  await wrapper.get('[data-testid="pilot-form"]').trigger("submit");
  await flushPromises();
};
const pilot = { id: 3, company_id: 9, start_date: "2026-11-01", end_date: "2026-11-15", success_criterion: "10 orders", result: "pending", result_note: "", license_switch_date: null };

// T3: company card → Pilot.
describe("Company card → Pilot tab", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    server.pilots = [{ ...pilot }];
  });

  it("lists the pilots of the company with dates, criterion and result", async () => {
    const wrapper = await mountTab();
    expect(api.GET_Pilots).toHaveBeenCalledWith({ company: 9 });
    const row = wrapper.get('[data-testid="pilot-row"]').text();
    expect(row).toContain("2026-11-01 → 2026-11-15");
    expect(row).toContain("10 orders");
    expect(wrapper.get('[data-testid="pilot-result"]').text()).toBe("leads.pilot.results.pending");
  });

  it("starts a pilot: the start date defaults to today, empty dates are left out", async () => {
    server.pilots = [];
    const wrapper = await mountTab();
    expect(wrapper.find('[data-testid="pilot-empty"]').exists()).toBe(true);
    await wrapper.get('[data-testid="pilot-criterion-input"] textarea').setValue("5 orders");
    await submit(wrapper);
    const body = api.POST_Pilot.mock.calls[0][0];
    expect(body).toMatchObject({ company_id: 9, success_criterion: "5 orders", result: "pending" });
    expect(body.start_date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(body).not.toHaveProperty("end_date");
    expect(body).not.toHaveProperty("license_switch_date");
  });

  it("requires the start date", async () => {
    server.pilots = [];
    const wrapper = await mountTab();
    await wrapper.get('[data-testid="pilot-start"] input').setValue("");
    await submit(wrapper);
    expect(api.POST_Pilot).not.toHaveBeenCalled();
    expect(wrapper.get('[data-testid="pilot-form-error"]').text()).toBe(t("leads.pilot.start_required"));
  });

  it("edits the result by PATCH and clears an emptied date with null", async () => {
    const wrapper = await mountTab();
    await wrapper.get('[data-testid="pilot-edit"]').trigger("click");
    expect(wrapper.get('[data-testid="pilot-end"] input').element.value).toBe("2026-11-15");
    await setControl(wrapper, "pilot-result-input", "success");
    await wrapper.get('[data-testid="pilot-note-input"] textarea').setValue("Beat the target");
    await wrapper.get('[data-testid="pilot-end"] input').setValue("");
    await wrapper.get('[data-testid="pilot-license"] input').setValue("2026-12-01");
    await submit(wrapper);
    expect(api.PATCH_Pilot).toHaveBeenCalledWith(3, {
      start_date: "2026-11-01",
      success_criterion: "10 orders",
      result: "success",
      result_note: "Beat the target",
      end_date: null,
      license_switch_date: "2026-12-01",
    });
  });

  it("deletes a pilot and shows the refusal of the API", async () => {
    const wrapper = await mountTab();
    await wrapper.get('[data-testid="pilot-delete"]').trigger("click");
    await flushPromises();
    expect(api.DELETE_Pilot).toHaveBeenCalledWith(3);
    api.POST_Pilot.mockRejectedValueOnce({ response: { status: 400, data: { detail: "Nope" } } });
    await submit(wrapper);
    expect(wrapper.find('[data-testid="pilot-form-error"]').exists()).toBe(true);
  });
});
