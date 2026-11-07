import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";

const api = vi.hoisted(() => ({ POST_Import: vi.fn(), GET_Import: vi.fn() }));
vi.mock("@/api/leads/api", () => api);
const comm = vi.hoisted(() => ({ GET_Routes: vi.fn() }));
vi.mock("@/api/communicator/api", () => comm);
const munin = vi.hoisted(() => ({ communicator: true }));
vi.mock("@/stores/munin", () => ({ useMuninStore: () => ({ isModuleEnabled: (key) => key !== "communicator" || munin.communicator }) }));
const push = vi.hoisted(() => vi.fn());
vi.mock("vue-router", () => ({ useRouter: () => ({ push }) }));

import Import from "@/views/Leads/Import.vue";
import { leadsFrame } from "./leadsFrame";
import { t } from "@/i18n";

function mountWithFile() {
  const wrapper = mount(Import, { global: { components: leadsFrame.components, stubs: { ...leadsFrame.stubs, RouterLink: true } } });
  const input = wrapper.find('[data-testid="import-file"]');
  Object.defineProperty(input.element, "files", { value: [new File(["domain\n"], "leads.csv", { type: "text/csv" })] });
  return input.trigger("change").then(() => wrapper);
}

describe("Leads Import", () => {
  beforeEach(() => {
    munin.communicator = true;
    comm.GET_Routes.mockReset();
    comm.GET_Routes.mockResolvedValue({ data: { results: [] } });
  });
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
    expect(wrapper.find('[data-testid="import-upload"]').attributes("disabled")).toBe("false");
    await vi.advanceTimersByTimeAsync(10000);
    expect(api.GET_Import).toHaveBeenCalledTimes(2);
  });

  it("uploads the picked file and reports created / matched / skipped", async () => {
    const batch = { id: 4, status: "done", created_count: 2, matched_count: 1, skipped_count: 0, report: [] };
    api.POST_Import.mockResolvedValue({ data: { ...batch, status: "pending" } });
    api.GET_Import.mockResolvedValue({ data: batch });
    const wrapper = mount(Import, { global: { components: leadsFrame.components, stubs: { ...leadsFrame.stubs, RouterLink: true } } });
    const file = new File(["domain\n"], "leads.csv", { type: "text/csv" });
    const input = wrapper.find('[data-testid="import-file"]');
    Object.defineProperty(input.element, "files", { value: [file] });
    await input.trigger("change");
    await wrapper.find('[data-testid="import-upload"]').trigger("click");
    await flushPromises();
    expect(api.POST_Import).toHaveBeenCalledWith(file, "");
    expect(wrapper.find('[data-testid="import-status"]').text()).toBe("done");
    expect(wrapper.find('[data-testid="import-counts"]').text()).toContain('"created":2');
  });

  // FIX-17 item 13: the screen says which columns, which legal bases and what happens next, and offers a sample.
  it("explains the columns, the legal bases and what happens after the upload", () => {
    const wrapper = mount(Import, { global: { components: leadsFrame.components, stubs: { ...leadsFrame.stubs, RouterLink: true } } });
    expect(wrapper.findAll('[data-testid="import-columns"] li')).toHaveLength(4);
    expect(t("leads.import.column_company")).toContain("company_name");
    expect(t("leads.import.column_legal_basis")).toContain("consent, legitimate_interest, contract");
    expect(t("leads.import.after")).toContain("first stage");
    expect(wrapper.find('[data-testid="import-sample"]').exists()).toBe(true);
    expect(wrapper.get('[data-testid="import-file-name"]').text()).toBe("leads.import.no_file");
  });

  it("naming the picked file replaces the bare browser control", async () => {
    const wrapper = await mountWithFile();
    expect(wrapper.get('[data-testid="import-file-name"]').text()).toBe("leads.csv");
  });

  // Q11: "the whole file goes through route X"
  describe("sender route of the file", () => {
    const routes = [
      { key: "ecomhouse", name: "Ecom House", is_active: true, is_default: true },
      { key: "old", name: "Old", is_active: false, is_default: false },
      { key: "entirius", name: "", is_active: true, is_default: false },
    ];

    it("offers the active routes with the channel default first, and sends the chosen key with the file", async () => {
      comm.GET_Routes.mockResolvedValue({ data: { results: routes } });
      api.POST_Import.mockResolvedValue({ data: { id: 6, status: "done", created_count: 1, matched_count: 0, skipped_count: 0, report: [] } });
      api.GET_Import.mockResolvedValue({ data: { id: 6, status: "done", created_count: 1, matched_count: 0, skipped_count: 0, report: [] } });
      const wrapper = await mountWithFile();
      await flushPromises();
      const options = wrapper.getComponent('[data-testid="import-route"]').props("options");
      expect(options.map((option) => option.value)).toEqual(["", "ecomhouse", "entirius"]);
      expect(options[0].label).toContain("ecomhouse");
      wrapper.getComponent('[data-testid="import-route"]').vm.$emit("update:modelValue", "entirius");
      await wrapper.find('[data-testid="import-upload"]').trigger("click");
      await flushPromises();
      expect(api.POST_Import.mock.calls.at(-1)[1]).toBe("entirius");
    });

    it("shows no route choice without routes, or when communicator is off (the import works as before)", async () => {
      let wrapper = await mountWithFile();
      await flushPromises();
      expect(wrapper.find('[data-testid="import-route-box"]').exists()).toBe(false);
      munin.communicator = false;
      comm.GET_Routes.mockClear();
      wrapper = await mountWithFile();
      await flushPromises();
      expect(comm.GET_Routes).not.toHaveBeenCalled();
      expect(wrapper.find('[data-testid="import-route-box"]').exists()).toBe(false);
    });
  });
});
