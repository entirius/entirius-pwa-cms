import { describe, it, expect, vi } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";

const api = vi.hoisted(() => ({ POST_Import: vi.fn(), GET_Import: vi.fn() }));
vi.mock("@/api/leads/api", () => api);

import Import from "@/views/Leads/Import.vue";

describe("Leads Import", () => {
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
