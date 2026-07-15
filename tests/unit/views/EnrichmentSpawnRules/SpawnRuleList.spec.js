import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";

const mockGetRules = vi.fn();
const mockGetTasks = vi.fn();
const mockRun = vi.fn();
const mockNotify = vi.fn();

vi.mock("@/api/enrichment/api", () => ({
  GET_SpawnRules: (...a) => mockGetRules(...a),
  GET_Tasks: (...a) => mockGetTasks(...a),
  POST_SpawnRuleRun: (...a) => mockRun(...a),
}));
vi.mock("@/stores/loader", () => ({
  useLoaderStore: () => ({ loaderStart() {}, loaderFinish() {} }),
}));
vi.mock("@/stores/notify", () => ({
  useNotifyStore: () => ({ spawnNotification: mockNotify }),
}));
vi.mock("@/composables/useSearchDebounce", () => ({
  useSearchDebounce: () => ({ search: "", debouncedFetch: () => {} }),
}));

import SpawnRuleList from "@/views/EnrichmentSpawnRules/SpawnRuleList.vue";

const rule = (over = {}) => ({
  id: 1,
  key: "desc-pl",
  module: "pim",
  check_key: "pl-description",
  task_type: "fix-attribute",
  auto: false,
  active: true,
  ...over,
});

const mountList = (routerMock = {}) =>
  mount(SpawnRuleList, {
    global: {
      mocks: {
        $route: { query: {}, path: "/enrichment/spawn-rules" },
        $router: { push() {}, replace() {}, ...routerMock },
      },
      stubs: {
        DataTable: true,
        Pagination: true,
        FloatingActions: true,
      },
    },
  });

describe("SpawnRuleList", () => {
  beforeEach(() => {
    mockGetRules.mockReset();
    mockGetTasks.mockReset();
    mockRun.mockReset();
    mockNotify.mockReset();
    mockGetTasks.mockResolvedValue({ data: { results: [] } });
  });

  it("loads rules and marks running ones from gaprule batch keys", async () => {
    mockGetRules.mockResolvedValueOnce({ data: { results: [rule()], count: 1 } });
    mockGetTasks.mockResolvedValue({
      data: { results: [{ id: 7, batch_key: "gaprule:desc-pl", status: "open" }] },
    });

    const wrapper = mountList();
    await flushPromises();

    expect(wrapper.vm.rules).toHaveLength(1);
    expect(wrapper.vm.runningKeys.has("desc-pl")).toBe(true);
    expect(wrapper.vm.columns.some((c) => c.key === "running")).toBe(true);
  });

  it("run now posts to the run endpoint and notifies per status", async () => {
    mockGetRules.mockResolvedValue({ data: { results: [rule()], count: 1 } });
    mockRun.mockResolvedValueOnce({ data: { status: "spawned", task: { id: 42 } } });

    const wrapper = mountList();
    await flushPromises();
    await wrapper.vm.runRule(rule());
    await flushPromises();

    expect(mockRun).toHaveBeenCalledWith("desc-pl");
    expect(mockNotify).toHaveBeenCalledWith(
      expect.objectContaining({ type: "positive" })
    );
  });

  it("run now with no candidates shows an informative toast", async () => {
    mockGetRules.mockResolvedValue({ data: { results: [rule()], count: 1 } });
    mockRun.mockResolvedValueOnce({ data: { status: "no_candidates", task: null } });

    const wrapper = mountList();
    await flushPromises();
    await wrapper.vm.runRule(rule());

    expect(mockNotify).toHaveBeenCalledWith(
      expect.objectContaining({ type: "informative" })
    );
  });

  it("only-active toggle adds active to the query", async () => {
    mockGetRules.mockResolvedValue({ data: { results: [], count: 0 } });
    const wrapper = mountList();
    await flushPromises();

    wrapper.vm.toggleOnlyActive();
    await flushPromises();

    expect(mockGetRules.mock.calls.at(-1)[0].active).toBe(true);
  });
});
