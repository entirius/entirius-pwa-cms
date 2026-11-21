import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";

const mockResults = vi.fn();
const mockVerdicts = vi.fn();
const mockWorkers = vi.fn();
const mockReplace = vi.fn();
const mockRoute = vi.hoisted(() => ({ name: "EnrichmentChecks", path: "/enrichment/checks", query: {} }));

vi.mock("@/api/enrichment/api", () => ({
  GET_ComfyResults: (...a) => mockResults(...a),
  GET_ComfyVerdicts: (...a) => mockVerdicts(...a),
  GET_Workers: (...a) => mockWorkers(...a),
}));
vi.mock("vue-router", () => ({
  useRoute: () => mockRoute,
  useRouter: () => ({ replace: mockReplace, push: vi.fn() }),
}));
vi.mock("@/stores/notify", () => ({ useNotifyStore: () => ({ spawnNotification: vi.fn() }) }));

import ComfyResults from "@/views/EnrichmentReview/ComfyResults.vue";

const mountPage = () =>
  mount(ComfyResults, {
    global: {
      stubs: { DataTable: true, Pagination: true, MobileFilterPanel: true, "router-link": true },
    },
  });

describe("ComfyResults", () => {
  beforeEach(() => {
    [mockResults, mockVerdicts, mockWorkers, mockReplace].forEach((fn) => fn.mockReset());
    mockRoute.query = {};
    mockResults.mockResolvedValue({ data: { count: 1, results: [{ id: 1, subject_ref: "SKU-1", verdict: "review" }] } });
    mockVerdicts.mockResolvedValue({ data: { total: 4, verdicts: { pass: 3, review: 1 } } });
    mockWorkers.mockResolvedValue({ data: [{ key: "pim.packshot", label: "Packshot", kind: "comfy" }, { key: "pim.writer", kind: "write" }] });
  });

  it("reads the filters from the URL and sends them as the contract's params", async () => {
    mockRoute.query = { task: "42", worker: "pim.packshot", verdict: "review", sort: "-score" };
    mountPage();
    await flushPromises();
    expect(mockResults).toHaveBeenCalledWith({
      worker: "pim.packshot", task: 42, ordering: "-score", page: 1, page_size: 20, verdict: "review",
    });
    expect(mockVerdicts).toHaveBeenCalledWith({ worker: "pim.packshot", task: 42 });
  });

  it("preselects the only comfy worker through the URL", async () => {
    mountPage();
    await flushPromises();
    expect(mockReplace).toHaveBeenCalledWith({ path: "/enrichment/checks", query: { worker: "pim.packshot" } });
  });

  it("shows the run chip and the verdict chips with their totals", async () => {
    mockRoute.query = { task: "42" };
    const wrapper = mountPage();
    await flushPromises();
    expect(wrapper.find("[data-testid='checks-task-chip']").exists()).toBe(true);
    expect(wrapper.find("[data-testid='checks-verdict-all']").attributes("label")).toContain("(4)");
    expect(wrapper.find("[data-testid='checks-verdict-pass']").attributes("label")).toContain("(3)");
  });
});
