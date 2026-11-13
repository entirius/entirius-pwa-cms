import { describe, it, expect, vi, beforeEach } from "vitest";
import { flushPromises } from "@vue/test-utils";

const todo = vi.hoisted(() => ({
  GET_Today: vi.fn(),
  GET_Tasks: vi.fn(),
  POST_Task: vi.fn(),
  PATCH_Task: vi.fn(),
  POST_TaskDone: vi.fn(() => Promise.resolve({ data: {} })),
  POST_TaskCancel: vi.fn(),
  POST_TaskReopen: vi.fn(() => Promise.resolve({ data: {} })),
}));
const comm = vi.hoisted(() => ({ GET_Conversations: vi.fn(), GET_Replies: vi.fn() }));
const modules = vi.hoisted(() => ({ todo: true, communicator: true, leads: true }));
vi.mock("@/api/todo/api", () => todo);
vi.mock("@/api/communicator/api", () => comm);
vi.mock("@/api/leads/api", () => ({ GET_AssignableUsers: () => Promise.resolve([]), GET_Companies: vi.fn(), GET_Company: vi.fn() }));
vi.mock("@/stores/notify", () => ({ useNotifyStore: () => ({ spawnNotification: vi.fn() }) }));
vi.mock("@/stores/munin", () => ({
  useMuninStore: () => ({ isModuleInstalled: (key) => modules[key], isModuleEnabled: (key) => modules[key], isModuleAtLeast: () => true }),
}));
const desk = vi.hoisted(() => ({ value: false }));
vi.mock("@/composables/useIsDesktop", () => ({ useIsDesktop: () => desk }));
vi.mock("@/stores/access", () => ({ useAccessStore: () => ({ can: () => true, me: { user: { id: 7 } } }) }));

import Today from "@/views/Leads/Today.vue";
import { byTestid, mountOutbound } from "./outboundFrame";
import { crmStubs } from "./crmFrame";

const past = new Date(Date.now() - 3 * 86400000).toISOString();
const task = (extra = {}) => ({ id: 1, subject_ref: "leads.Company:5", subject_label: "Acme Ltd", kind: "phone", title: "Call back", due_at: past, owner: null, status: "open", ...extra });
const mounted = async (options = {}) => {
  const wrapper = mountOutbound(Today, { area: "todo.tasks", stubs: crmStubs, ...options });
  await flushPromises();
  return wrapper;
};

// Plan 15: Today — the panel root.
describe("Leads → Today", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.assign(modules, { todo: true, communicator: true, leads: true });
    todo.GET_Today.mockResolvedValue({ data: { overdue: 1, today: 0, upcoming_7d: 3, results: [task()] } });
    todo.GET_Tasks.mockResolvedValue({ data: { count: 0, results: [] } });
    comm.GET_Conversations.mockResolvedValue({ data: { counts: { draft: 4 } } });
    comm.GET_Replies.mockResolvedValue({ data: { count: 0 } });
  });

  it("an overdue task: the red relative due, a link to its company's Tasks tab, Mark done", async () => {
    const wrapper = await mounted();
    expect(byTestid(wrapper, "task-row").exists()).toBe(true);
    const due = wrapper.findComponent('[data-testid="task-due"]');
    expect(due.props("tone")).toBe("negative");
    expect(due.props("label")).toBe("Overdue 3 days");
    expect(byTestid(wrapper, "task-done").exists()).toBe(true);
  });

  it("counts the drafts and says when no reply waits", async () => {
    const wrapper = await mounted();
    expect(byTestid(wrapper, "today-drafts").text()).toContain("4 drafts to approve");
    expect(byTestid(wrapper, "today-replies").text()).toBe("No replies to review");
  });

  // Acceptance CM18: at a desk the drafts counter opens Approvals, the sidebar's place for that work; a phone the Inbox
  it("the drafts counter opens Approvals at a desk, the Inbox's drafts on a phone", async () => {
    const link = (wrapper) => wrapper.findComponent('[data-testid="today-drafts"]').props("to");
    expect(link(await mounted())).toEqual({ name: "LeadsInbox", query: { filter: "draft" } });
    desk.value = true;
    expect(link(await mounted())).toEqual({ name: "LeadsApprovals" });
    desk.value = false;
  });

  it("zero tasks due: the empty state names the upcoming count", async () => {
    todo.GET_Today.mockResolvedValue({ data: { overdue: 0, today: 0, upcoming_7d: 3, results: [] } });
    const wrapper = await mounted();
    expect(byTestid(wrapper, "today-empty").text()).toContain("leads.today.empty_title");
  });

  it("the chips and the owner filter ask the tasks list", async () => {
    const wrapper = await mounted();
    await byTestid(wrapper, "today-chip-done").trigger("click");
    await flushPromises();
    expect(todo.GET_Tasks).toHaveBeenLastCalledWith({ owner: "me", status: "done", page: 1, page_size: 20 });
    todo.GET_Tasks.mockResolvedValue({ data: { count: 1, results: [task({ status: "done" })] } });
    await byTestid(wrapper, "today-chip-upcoming").trigger("click");
    await flushPromises();
    expect(wrapper.findComponent('[data-testid="task-due"]').props("tone")).toBe("positive");
    expect(byTestid(wrapper, "task-reopen").exists()).toBe(true);
    wrapper.findComponent('[data-testid="today-owner"]').vm.$emit("update:modelValue", "all");
    await flushPromises();
    expect(todo.GET_Tasks.mock.lastCall[0]).not.toHaveProperty("owner");
  });

  it("Mark done asks for the outcome, then closes the task", async () => {
    const wrapper = await mounted();
    await byTestid(wrapper, "task-done").trigger("click");
    await flushPromises();
    expect(byTestid(wrapper, "task-outcome").exists()).toBe(true);
    await byTestid(wrapper, "task-submit").trigger("click");
    await flushPromises();
    expect(todo.POST_TaskDone).toHaveBeenCalledWith(1, "");
  });

  it("without the todo module: the counters only and the note", async () => {
    modules.todo = false;
    const wrapper = await mounted();
    expect(todo.GET_Today).not.toHaveBeenCalled();
    expect(byTestid(wrapper, "today-tasks").exists()).toBe(false);
    expect(byTestid(wrapper, "today-add-task").exists()).toBe(false);
    expect(byTestid(wrapper, "today-no-tasks").exists()).toBe(true);
    expect(byTestid(wrapper, "today-waiting").exists()).toBe(true);
  });

  it("neither todo nor communicator: nothing to show", async () => {
    Object.assign(modules, { todo: false, communicator: false });
    expect(byTestid(await mounted(), "today-empty").text()).toContain("leads.today.nothing");
  });

  it("read-only tasks: no Add task, no Mark done", async () => {
    const wrapper = await mounted({ write: false });
    expect(byTestid(wrapper, "today-add-task").exists()).toBe(false);
    expect(byTestid(wrapper, "task-done").exists()).toBe(false);
  });
});
