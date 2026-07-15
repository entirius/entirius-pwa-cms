import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";

const mockGetTasks = vi.fn();
const mockNotify = vi.fn();

vi.mock("@/api/enrichment/api", () => ({
  GET_Tasks: (...a) => mockGetTasks(...a),
}));
vi.mock("@/stores/notify", () => ({
  useNotifyStore: () => ({ spawnNotification: mockNotify }),
}));

import TaskList from "@/views/EnrichmentTasks/TaskList.vue";

const task = (over = {}) => ({
  id: 1,
  type: "assign-featureset",
  status: "open",
  counts: {},
  created_at: "2026-06-11T18:34:47Z",
  scope_spec: { mode: "gap", check: "feature_set_default", module: "pim" },
  params: { limit: 200, spawn_rule: "classify-featureset" },
  ...over,
});

const mountList = (routerMock = {}) =>
  mount(TaskList, {
    global: {
      mocks: {
        $route: { query: {}, path: "/enrichment/tasks" },
        $router: { push() {}, replace() {}, ...routerMock },
      },
      stubs: {
        DataTable: true,
        Pagination: true,
        TaskQueueDrawer: true,
      },
    },
  });

describe("TaskList", () => {
  beforeEach(() => {
    mockGetTasks.mockReset();
    mockNotify.mockReset();
    mockGetTasks.mockResolvedValue({ data: { results: [], count: 0 } });
  });

  it("loads tasks and flattens scope_spec.check + params.spawn_rule", async () => {
    mockGetTasks.mockResolvedValueOnce({ data: { results: [task()], count: 1 } });

    const wrapper = mountList();
    await flushPromises();

    expect(wrapper.vm.tasks).toHaveLength(1);
    expect(wrapper.vm.tasks[0].check).toBe("feature_set_default");
    expect(wrapper.vm.tasks[0].rule).toBe("classify-featureset");
    expect(wrapper.vm.totalCount).toBe(1);
  });

  it("falls back to em-dash when nested fields are missing", async () => {
    mockGetTasks.mockResolvedValueOnce({
      data: { results: [task({ scope_spec: {}, params: {} })], count: 1 },
    });

    const wrapper = mountList();
    await flushPromises();

    expect(wrapper.vm.tasks[0].check).toBe("—");
    expect(wrapper.vm.tasks[0].rule).toBe("—");
  });

  it("initial fetch defaults to status=open", async () => {
    const wrapper = mountList();
    await flushPromises();

    expect(wrapper.vm.statusFilter).toBe("open");
    expect(mockGetTasks.mock.calls.at(-1)[0].status).toBe("open");
  });

  it("status filter change requests that status and syncs the route", async () => {
    const replace = vi.fn();
    const wrapper = mountList({ replace });
    await flushPromises();

    wrapper.vm.onFilterChange("done");
    await flushPromises();

    expect(mockGetTasks.mock.calls.at(-1)[0].status).toBe("done");
    expect(replace).toHaveBeenCalledWith(
      expect.objectContaining({ query: expect.objectContaining({ status: "done" }) })
    );
  });

  it("__all filter omits the status param", async () => {
    const wrapper = mountList();
    await flushPromises();

    wrapper.vm.onFilterChange("__all");
    await flushPromises();

    expect(mockGetTasks.mock.calls.at(-1)[0].status).toBeUndefined();
  });

  it("row click opens the queue drawer for that task", async () => {
    const wrapper = mountList();
    await flushPromises();

    wrapper.vm.openQueue({ id: 7, rule: "classify-featureset", type: "assign-featureset" });

    expect(wrapper.vm.queueVisible).toBe(true);
    expect(wrapper.vm.queueTaskId).toBe(7);
    expect(wrapper.vm.queueLabel).toBe("classify-featureset");
  });
});
