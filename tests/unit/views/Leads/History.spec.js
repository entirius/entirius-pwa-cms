import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { enableAutoUnmount, flushPromises } from "@vue/test-utils";

enableAutoUnmount(afterEach);

const leads = vi.hoisted(() => ({ GET_History: vi.fn(), GET_HistoryActors: vi.fn(), GET_Companies: vi.fn() }));
vi.mock("@/api/leads/api", () => leads);
vi.mock("@/stores/notify", () => ({ useNotifyStore: () => ({ spawnNotification: vi.fn() }) }));

// The router replaces the query at once, as the address bar would.
const route = vi.hoisted(() => ({ current: null }));
const router = vi.hoisted(() => ({ replace: vi.fn() }));
vi.mock("vue-router", async (original) => {
  const { reactive } = await import("vue");
  route.current = reactive({ query: {} });
  router.replace.mockImplementation(({ query }) => (route.current.query = query));
  return { ...(await original()), useRoute: () => route.current, useRouter: () => router };
});

import History from "@/views/Leads/History.vue";
import { historyRow } from "@/views/Leads/history";
import { activityActor as actorLabel } from "@/utils/leadsLabels";
import { mountOutbound, byTestid } from "./outboundFrame";
import { control, setControl } from "./leadsFrame";

const entry = (extra = {}) => ({
  id: 1,
  company_id: 5,
  company_name: "Acme Ltd",
  contact_id: null,
  deal_id: null,
  deal_title: null,
  kind: "task",
  message: "cancelled: Call back",
  data: { event: "task_cancelled", title: "Call back", reason: "duplicate" },
  actor: "manager",
  created_at: "2026-11-15T10:00:00Z",
  ...extra,
});
const stubs = { EntitySearchPicker: { name: "EntitySearchPicker", props: ["modelValue", "fetchFn"], template: "<div />" } };
const mounted = async () => {
  const wrapper = mountOutbound(History, { area: "leads.companies", stubs });
  await flushPromises();
  return wrapper;
};
const lastParams = () => leads.GET_History.mock.calls.at(-1)[0];

// U11: History — the journal of every change in the CRM.
describe("Leads → History", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    route.current.query = {};
    leads.GET_History.mockResolvedValue({ data: { count: 1, results: [entry()] } });
    leads.GET_HistoryActors.mockResolvedValue({ data: { results: ["import:", "manager", "system"] } });
  });

  it("shows when, who, what, on what and why for every entry", async () => {
    const wrapper = await mounted();
    const row = byTestid(wrapper, "history-row");
    expect(row.text()).toContain("manager");
    expect(row.text()).toContain("Task cancelled: Call back");
    expect(row.text()).toContain("Acme Ltd");
    expect(row.text()).toContain("duplicate");
    expect(row.text()).not.toContain("Call back — duplicate");
    expect(lastParams()).toMatchObject({ page: 1, page_size: 50 });
  });

  it("the person filter lists the actors and reloads from page one", async () => {
    const wrapper = await mounted();
    expect(control(wrapper, "history-actor").props("options")).toEqual([
      { value: "import:", label: "Import" },
      { value: "manager", label: "manager" },
      { value: "system", label: "System" },
    ]);
    setControl(wrapper, "history-actor", "manager");
    await flushPromises();
    expect(lastParams()).toMatchObject({ actor: "manager", page: 1 });
  });

  it("kind, company and period go to the API; one day is both ends", async () => {
    const wrapper = await mounted();
    setControl(wrapper, "history-kind", "task");
    setControl(wrapper, "history-company", "5");
    setControl(wrapper, "history-period", "2026-11-14");
    await flushPromises();
    expect(lastParams()).toMatchObject({ kind: "task", company: "5", date_from: "2026-11-14", date_to: "2026-11-14" });
    setControl(wrapper, "history-period", "2026-11-01 – 2026-11-14");
    await flushPromises();
    expect(lastParams()).toMatchObject({ date_from: "2026-11-01", date_to: "2026-11-14" });
  });

  it("the filters and the page live in the URL and are read back from it", async () => {
    const wrapper = await mounted();
    setControl(wrapper, "history-actor", "manager");
    setControl(wrapper, "history-kind", "task");
    await flushPromises();
    expect(route.current.query).toEqual({ actor: "manager", kind: "task" });
    expect(router.replace).toHaveBeenCalledTimes(1);
    const back = mountOutbound(History, { area: "leads.companies", stubs });
    await flushPromises();
    expect(control(back, "history-actor").props("modelValue")).toBe("manager");
    expect(lastParams()).toMatchObject({ actor: "manager", kind: "task", page: 1 });
  });

  it("an older answer never replaces a newer one", async () => {
    let slow;
    leads.GET_History.mockReturnValueOnce(new Promise((resolve) => (slow = resolve)));
    const wrapper = mountOutbound(History, { area: "leads.companies", stubs });
    leads.GET_History.mockResolvedValueOnce({ data: { count: 1, results: [entry({ id: 2, company_name: "Newer Ltd" })] } });
    setControl(wrapper, "history-actor", "manager");
    await flushPromises();
    slow({ data: { count: 1, results: [entry({ id: 1, company_name: "Older Ltd" })] } });
    await flushPromises();
    expect(wrapper.text()).toContain("Newer Ltd");
    expect(wrapper.text()).not.toContain("Older Ltd");
  });

  it("an empty journal says so", async () => {
    leads.GET_History.mockResolvedValue({ data: { count: 0, results: [] } });
    const wrapper = await mounted();
    expect(control(wrapper, "history-table").props("emptyText")).toBe("Nothing has happened in the CRM yet");
  });
});

describe("history rows", () => {
  it("a settings entry is about the channel, a deal entry names the deal", () => {
    const settings = historyRow(entry({ company_id: null, company_name: null, kind: "settings", actor: "anna", data: { event: "channel_settings", changes: { history_months: { from: 24, to: 12 } } } }));
    expect(settings).toMatchObject({ who: "anna", on: "Settings", what: "Settings changed: history kept", companyId: null });
    expect(historyRow(entry({ deal_title: "Pilot" })).on).toBe("Acme Ltd · Pilot");
  });

  it("system and an import read as words", () => {
    expect(actorLabel("system")).toBe("System");
    expect(actorLabel("import:12")).toBe("Import");
    expect(actorLabel("")).toBe("System");
  });

  // A coded reason reads as words; a reason a person typed stays as typed.
  it("a coded reason is a label, a typed one stays", () => {
    const reason = (kind, data) => historyRow(entry({ kind, data })).reason;
    expect(reason("potential", { reason: "reply:not_now" })).toBe("Reply: Not now");
    expect(reason("note", { reason: "wrong_person" })).toBe("Wrong person");
    expect(reason("optout", { reason: "optout_confirmed" })).toBe("Opt-out confirmed");
    expect(reason("potential", { reason: "some_new_code" })).toBe("some_new_code");
    expect(reason("task", { reason: "wrong_person" })).toBe("wrong_person");
    expect(reason("deal", { reason: "chose another vendor" })).toBe("chose another vendor");
  });
});
