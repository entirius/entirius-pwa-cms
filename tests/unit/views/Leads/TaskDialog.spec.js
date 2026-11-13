import { describe, it, expect, vi, beforeEach } from "vitest";
import { flushPromises } from "@vue/test-utils";

const todo = vi.hoisted(() => ({
  POST_Task: vi.fn(() => Promise.resolve({ data: { id: 9 } })),
  PATCH_Task: vi.fn(() => Promise.resolve({ data: {} })),
  POST_TaskDone: vi.fn(() => Promise.resolve({ data: {} })),
  POST_TaskCancel: vi.fn(() => Promise.resolve({ data: {} })),
}));
vi.mock("@/api/todo/api", () => todo);
vi.mock("@/api/leads/api", () => ({ GET_AssignableUsers: () => Promise.resolve([{ id: 7, username: "anna", name: "Anna" }]), GET_Companies: vi.fn(), GET_Company: vi.fn() }));
vi.mock("@/stores/notify", () => ({ useNotifyStore: () => ({ spawnNotification: vi.fn() }) }));
vi.mock("@/stores/access", () => ({ useAccessStore: () => ({ me: { user: { id: 7 } } }) }));

import TaskDialog from "@/views/Leads/TaskDialog.vue";
import { setControl } from "./leadsFrame";
import { byTestid, mountOutbound } from "./outboundFrame";
import { crmStubs } from "./crmFrame";

const company = { id: 5, name: "Acme Ltd", contacts: [{ id: 3, first_name: "Jan", last_name: "Nowak", email: "jan@acme.test" }] };
const opened = async (props) => {
  const wrapper = mountOutbound(TaskDialog, { area: "todo.tasks", stubs: crmStubs, props: { open: false, ...props } });
  await wrapper.setProps({ open: true });
  await flushPromises();
  return wrapper;
};

// Plan 15: one dialog for every task action.
describe("Leads → task dialog", () => {
  beforeEach(() => vi.clearAllMocks());

  it("Add task needs a title, then posts the company's subject, the contact and the caller as owner", async () => {
    const wrapper = await opened({ mode: "add", company });
    await byTestid(wrapper, "task-submit").trigger("click");
    expect(todo.POST_Task).not.toHaveBeenCalled();
    setControl(wrapper, "task-title", "Call back");
    setControl(wrapper, "task-contact", 3);
    await byTestid(wrapper, "task-submit").trigger("click");
    await flushPromises();
    expect(todo.POST_Task).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Call back", subject_ref: "leads.Company:5", subject_label: "Acme Ltd", contact_ref: "leads.Contact:3", owner_id: 7, kind: "todo" })
    );
    expect(todo.POST_TaskDone).not.toHaveBeenCalled();
    expect(wrapper.emitted("saved")).toHaveLength(1);
  });

  it("Log call creates a phone task without a due date and closes it with the outcome", async () => {
    const wrapper = await opened({ mode: "call", company });
    setControl(wrapper, "task-title", "Intro call");
    setControl(wrapper, "task-outcome", "Interested");
    await byTestid(wrapper, "task-submit").trigger("click");
    await flushPromises();
    expect(todo.POST_Task).toHaveBeenCalledWith(expect.objectContaining({ kind: "phone", due_at: null }));
    expect(todo.POST_TaskDone).toHaveBeenCalledWith(9, "Interested");
  });

  it("from Today a company must be picked", async () => {
    const wrapper = await opened({ mode: "add" });
    setControl(wrapper, "task-title", "Call back");
    await byTestid(wrapper, "task-submit").trigger("click");
    expect(todo.POST_Task).not.toHaveBeenCalled();
    expect(byTestid(wrapper, "task-company").exists()).toBe(true);
  });

  it("edit saves the whitelisted fields; Cancel task asks first", async () => {
    const task = { id: 4, title: "Old", kind: "mail", note: "", due_at: null, owner: { id: 7 }, contact_ref: "" };
    const wrapper = await opened({ mode: "edit", company, task });
    await byTestid(wrapper, "task-submit").trigger("click");
    await flushPromises();
    expect(todo.PATCH_Task).toHaveBeenCalledWith(4, { title: "Old", kind: "mail", note: "", due_at: null, owner_id: 7 });
    await wrapper.setProps({ open: false });
    await wrapper.setProps({ open: true });
    await byTestid(wrapper, "task-cancel-task").trigger("click");
    await byTestid(wrapper, "task-cancel-confirm").trigger("click");
    await flushPromises();
    expect(todo.POST_TaskCancel).toHaveBeenCalledWith(4, "");
  });
});
