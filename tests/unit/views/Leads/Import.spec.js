import { describe, it, expect, vi, afterEach } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";

const api = vi.hoisted(() => ({ POST_Import: vi.fn(), GET_Import: vi.fn() }));
vi.mock("@/api/leads/api", () => api);

import Import from "@/views/Leads/Import.vue";

function mountWithFile() {
  const wrapper = mount(Import, { global: { stubs: { RouterLink: true } } });
  const input = wrapper.find('[data-testid="import-file"]');
  Object.defineProperty(input.element, "files", { value: [new File(["domain\n"], "leads.csv", { type: "text/csv" })] });
  return input.trigger("change").then(() => wrapper);
}

describe("Leads Import", () => {
  afterEach(() => vi.useRealTimers());

  it("a failing later poll shows the error, re-enables Upload and stops polling", async () => {
    vi.useFakeTimers();
    api.POST_Import.mockResolvedValue({ data: { id: 5, status: "pending" } });
    api.GET_Import.mockReset();
    api.GET_Import.mockResolvedValueOnce({ data: { id: 5, status: "running" } }).mockRejectedValue({ response: { data: { detail: "gone" } } });
    const wrapper = await mountWithFile();
    await wrapper.find('[data-testid="import-upload"]').trigger("click");
    await flushPromises();
    await vi.advanceTimersByTimeAsync(2000);
    await flushPromises();
    expect(wrapper.find('[data-testid="import-error"]').text()).toBe("gone");
    expect(wrapper.find('[data-testid="import-upload"]').attributes("disabled")).toBeUndefined();
    await vi.advanceTimersByTimeAsync(10000);
    expect(api.GET_Import).toHaveBeenCalledTimes(2);
  });

  it("uploads the picked file and reports created / matched / skipped", async () => {
    const batch = { id: 4, status: "done", created_count: 2, matched_count: 1, skipped_count: 0, report: [] };
    api.POST_Import.mockResolvedValue({ data: { ...batch, status: "pending" } });
    api.GET_Import.mockResolvedValue({ data: batch });
    const wrapper = mount(Import, { global: { stubs: { RouterLink: true } } });
    const file = new File(["domain\n"], "leads.csv", { type: "text/csv" });
    const input = wrapper.find('[data-testid="import-file"]');
    Object.defineProperty(input.element, "files", { value: [file] });
    await input.trigger("change");
    await wrapper.find('[data-testid="import-upload"]').trigger("click");
    await flushPromises();
    expect(api.POST_Import).toHaveBeenCalledWith(file);
    expect(wrapper.find('[data-testid="import-status"]').text()).toBe("done");
    expect(wrapper.find('[data-testid="import-counts"]').text()).toContain('"created":2');
  });
});
