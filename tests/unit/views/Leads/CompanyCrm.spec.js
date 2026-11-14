import { describe, it, expect, vi, beforeEach } from "vitest";
import { flushPromises } from "@vue/test-utils";

const leads = vi.hoisted(() => ({
  GET_AssignableUsers: vi.fn(() => Promise.resolve([{ id: 7, username: "anna", name: "Anna Kowalska" }])),
  PATCH_Company: vi.fn(),
  POST_Score: vi.fn(),
}));
const todo = vi.hoisted(() => ({ GET_Tasks: vi.fn() }));
vi.mock("@/api/leads/api", () => leads);
vi.mock("@/api/todo/api", () => todo);
vi.mock("@/stores/notify", () => ({ useNotifyStore: () => ({ spawnNotification: vi.fn() }) }));
vi.mock("@/stores/access", () => ({ useAccessStore: () => ({ can: () => true, me: null }) }));

import { h } from "vue";
import { ReadonlyArea } from "@/composables/useReadonly";
import CompanyDetails from "@/views/Leads/CompanyDetails.vue";
import ScoreCard from "@/views/Leads/ScoreCard.vue";
import TasksTab from "@/views/Leads/tabs/TasksTab.vue";
import { fieldsFromDefinitions } from "@/views/Leads/customFields";
import { setControl } from "./leadsFrame";
import { byTestid, mountOutbound } from "./outboundFrame";
import { crmStubs } from "./crmFrame";

const fields = fieldsFromDefinitions([
  { key: "platform", kind: "select", label: "Platform", order: 0, required: false, is_active: true, options: [{ value: "m2", label: "Magento" }] },
  { key: "employees", kind: "number", label: "Employees", order: 1, required: true, is_active: true, options: [] },
]);
const company = (extra = {}) => ({
  id: 5, name: "Acme", origin: "fair", owner: null, attributes: { platform: "m2", employees: "10" },
  score_points: null, score_segment: "", scored_at: null, activities: [], contacts: [], ...extra,
});
const mount = async (component, props, options = {}) => {
  const wrapper = mountOutbound(component, { area: "leads.companies", stubs: { ...crmStubs, TaskDialog: true }, props, ...options });
  await flushPromises();
  return wrapper;
};

// The card renders its pieces inside its PageLayout / ReadonlyArea, which decide read-only.
const inArea = (area, component) => ({ props: ["company", "fields"], render() { return h(ReadonlyArea, { area }, () => h(component, this.$props)); } });

// Plan 15: the company card's CRM pieces.
describe("Company card → Details", () => {
  beforeEach(() => vi.clearAllMocks());

  it("reads owner, origin and the custom fields by kind", async () => {
    const wrapper = await mount(CompanyDetails, { company: company(), fields });
    expect(byTestid(wrapper, "company-owner").text()).toBe("Unassigned");
    expect(byTestid(wrapper, "company-origin").text()).toBe("fair");
    expect(byTestid(wrapper, "custom-field-platform").text()).toBe("Magento");
  });

  it("Edit → Save sends only what changed and hands the answer up", async () => {
    leads.PATCH_Company.mockResolvedValue({ data: company({ owner: { id: 7, name: "Anna" } }) });
    const wrapper = await mount(CompanyDetails, { company: company(), fields });
    await byTestid(wrapper, "company-details-edit").trigger("click");
    await flushPromises();
    setControl(wrapper, "company-owner", 7);
    wrapper.findComponent({ name: "CustomFields" }).vm.$emit("update:modelValue", { platform: "", employees: "10" });
    await byTestid(wrapper, "company-details-save").trigger("click");
    await flushPromises();
    expect(leads.PATCH_Company).toHaveBeenCalledWith(5, { owner_id: 7, attributes: { platform: null } });
    expect(wrapper.emitted("saved")[0][0].owner.id).toBe(7);
  });

  it("a required field left empty is not saved", async () => {
    const wrapper = await mount(CompanyDetails, { company: company(), fields });
    await byTestid(wrapper, "company-details-edit").trigger("click");
    wrapper.findComponent({ name: "CustomFields" }).vm.$emit("update:modelValue", { platform: "m2", employees: "" });
    await byTestid(wrapper, "company-details-save").trigger("click");
    expect(leads.PATCH_Company).not.toHaveBeenCalled();
  });

  it("read-only: no Edit", async () => {
    const wrapper = await mount(inArea("leads.companies", CompanyDetails), { company: company(), fields }, { write: false });
    expect(byTestid(wrapper, "company-details-edit").exists()).toBe(false);
  });
});

describe("Company card → Score", () => {
  beforeEach(() => vi.clearAllMocks());

  it("shows the segment, the points and the last score's reasons", async () => {
    const activities = [{ id: 1, kind: "score", data: { reasons: ["Runs Magento: +20"] } }];
    const wrapper = await mount(ScoreCard, { company: company({ score_segment: "S2", score_points: 64, activities }) });
    expect(wrapper.findComponent('[data-testid="company-score-segment"]').props("label")).toBe("S2");
    expect(byTestid(wrapper, "company-score").text()).toContain("Runs Magento: +20");
  });

  it("Score now: the answer replaces the score; no profile turns into the set-up note", async () => {
    leads.POST_Score.mockResolvedValueOnce({ data: { segment: "S1", points: 80, reasons: ["Big: +80"] } });
    const wrapper = await mount(ScoreCard, { company: company() });
    expect(byTestid(wrapper, "company-score").text()).toContain("leads.score.none");
    await byTestid(wrapper, "company-score-now").trigger("click");
    await flushPromises();
    expect(byTestid(wrapper, "company-score").text()).toContain("Big: +80");
    leads.POST_Score.mockRejectedValueOnce({ error: "no_scoring_profile" });
    await byTestid(wrapper, "company-score-now").trigger("click");
    await flushPromises();
    expect(byTestid(wrapper, "company-score").text()).toContain("leads.score.no_profile");
    expect(byTestid(wrapper, "company-score-now").exists()).toBe(false);
  });
});

describe("Company card → Tasks", () => {
  beforeEach(() => vi.clearAllMocks());

  it("lists the company's open tasks by its subject ref and reports the count", async () => {
    todo.GET_Tasks.mockResolvedValue({ data: { count: 1, results: [{ id: 2, title: "Call", kind: "phone", due_at: null, status: "open" }] } });
    const wrapper = await mount(TasksTab, { company: company() }, { area: "todo.tasks" });
    expect(todo.GET_Tasks).toHaveBeenCalledWith({ subject_ref: "leads.Company:5", status: "open", page_size: 100 });
    expect(wrapper.findAll('[data-testid="task-row"]')).toHaveLength(1);
    expect(wrapper.emitted("count")[0]).toEqual([1]);
    expect(byTestid(wrapper, "company-add-task").exists()).toBe(true);
    expect(byTestid(wrapper, "company-log-call").exists()).toBe(true);
  });

  it("the task text and Edit open the edit dialog", async () => {
    todo.GET_Tasks.mockResolvedValue({ data: { count: 1, results: [{ id: 2, title: "Call", kind: "phone", due_at: null, status: "open" }] } });
    const wrapper = await mount(TasksTab, { company: company() }, { area: "todo.tasks" });
    expect(byTestid(wrapper, "task-title-link").text()).toBe("Call");
    await byTestid(wrapper, "task-title-link").trigger("click");
    expect(wrapper.findComponent({ name: "TaskDialog" }).props()).toMatchObject({ open: true, mode: "edit" });
    expect(byTestid(wrapper, "task-edit").exists()).toBe(true);
  });

  it("read-only tasks: no Add, Log call or Mark done", async () => {
    todo.GET_Tasks.mockResolvedValue({ data: { count: 1, results: [{ id: 2, title: "Call", kind: "phone", due_at: null, status: "open" }] } });
    const wrapper = await mount(inArea("todo.tasks", TasksTab), { company: company() }, { area: "todo.tasks", write: false });
    ["company-add-task", "company-log-call", "task-done"].forEach((id) => expect(byTestid(wrapper, id).exists()).toBe(false));
  });
});
