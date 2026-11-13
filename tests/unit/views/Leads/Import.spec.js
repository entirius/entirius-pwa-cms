import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";

const api = vi.hoisted(() => ({ POST_Import: vi.fn(), GET_Import: vi.fn(), GET_AssignableUsers: vi.fn(), GET_Attributes: vi.fn() }));
vi.mock("@/api/leads/api", () => api);
const push = vi.hoisted(() => vi.fn());
vi.mock("vue-router", () => ({ useRouter: () => ({ push }) }));

import Import from "@/views/Leads/Import.vue";
import { leadsFrame } from "./leadsFrame";
import { t } from "@/i18n";
import { useMuninStore } from "@/stores/munin";
import { useAccessStore } from "@/stores/access";

function mountWithFile() {
  const wrapper = mount(Import, { global: { components: leadsFrame.components, stubs: { ...leadsFrame.stubs, RouterLink: true } } });
  const input = wrapper.find('[data-testid="import-file"]');
  Object.defineProperty(input.element, "files", { value: [new File(["domain\n"], "leads.csv", { type: "text/csv" })] });
  return input.trigger("change").then(() => wrapper);
}

// The views read the munin store (the outbound guards): an empty one = an older backend.
beforeEach(() => {
  setActivePinia(createPinia());
  api.GET_AssignableUsers.mockResolvedValue([{ id: 7, username: "anna", name: "Anna Kowalska" }]);
  api.GET_Attributes.mockImplementation((entity) =>
    Promise.resolve({ data: { results: entity === "company" ? [{ key: "size", label: "Size", kind: "number" }, { key: "old", label: "Old", kind: "text", is_active: false }] : [{ key: "role", label: "Role", kind: "select" }] } })
  );
});

const outboundOn = () => Object.assign(useMuninStore(), { loaded: true, modules: [{ key: "leads", version: "0.5.0", enabled_in_cms: true }] });

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
    expect(api.POST_Import).toHaveBeenCalledWith(file);
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

  // Plan 14 (leads >= 0.5.0): the automation starts on new companies only when ticked, with its cost note in sight.
  it("leads >= 0.5.0: the run-rules checkbox with its note goes with the upload", async () => {
    Object.assign(useMuninStore(), { loaded: true, modules: [{ key: "leads", version: "0.5.0", enabled_in_cms: true }] });
    api.POST_Import.mockResolvedValue({ data: { id: 4, status: "done", report: [] } });
    api.GET_Import.mockResolvedValue({ data: { id: 4, status: "done", report: [] } });
    const wrapper = await mountWithFile();
    expect(wrapper.find('[data-testid="import-run-rules-note"]').text()).toBe("leads.import.run_rules_note");
    wrapper.findComponent('[data-testid="import-run-rules"]').vm.$emit("update:modelValue", true);
    await wrapper.find('[data-testid="import-upload"]').trigger("click");
    await flushPromises();
    expect(api.POST_Import.mock.calls.at(-1)[1]).toBe(true);
  });

  // Acceptance CM1–CM3: the owner (me by default), the custom-field columns, the ignored columns and the automation count.
  it("leads >= 0.5.0: owner pre-set to me and sent; custom-field columns listed", async () => {
    outboundOn();
    useAccessStore().me = { user: { id: 7 }, permissions: {} };
    api.POST_Import.mockResolvedValue({ data: { id: 4, status: "done", report: [] } });
    api.GET_Import.mockResolvedValue({ data: { id: 4, status: "done", report: [] } });
    const wrapper = await mountWithFile();
    await flushPromises();
    expect(wrapper.findComponent('[data-testid="import-owner"]').props("modelValue")).toBe(7);
    expect(wrapper.findAll('[data-testid="import-custom-column"]').map((li) => li.text())).toEqual([
      'leads.import.column_attr::{"column":"attr.size","label":"Size","kind":"Number"}',
      'leads.import.column_attr::{"column":"contact.attr.role","label":"Role","kind":"Choice"}',
    ]);
    await wrapper.find('[data-testid="import-upload"]').trigger("click");
    await flushPromises();
    expect(api.POST_Import.mock.calls.at(-1).slice(1)).toEqual([false, 7]);
  });

  it("a caller who cannot own companies starts with no owner, and none is sent", async () => {
    outboundOn();
    useAccessStore().me = { user: { id: 1 }, permissions: {} };
    api.POST_Import.mockResolvedValue({ data: { id: 4, status: "done", report: [] } });
    api.GET_Import.mockResolvedValue({ data: { id: 4, status: "done", report: [] } });
    const wrapper = await mountWithFile();
    await flushPromises();
    expect(wrapper.findComponent('[data-testid="import-owner"]').props("modelValue")).toBe(null);
    await wrapper.find('[data-testid="import-upload"]').trigger("click");
    await flushPromises();
    expect(api.POST_Import.mock.calls.at(-1).slice(1)).toEqual([false, null]);
  });

  it("the report names the ignored columns and the automation count; an older backend shows neither", async () => {
    outboundOn();
    const batch = { id: 4, status: "done", report: [], ignored_columns: ["phone", "notes"], automation_started_count: 2 };
    api.POST_Import.mockResolvedValue({ data: batch });
    api.GET_Import.mockResolvedValue({ data: batch });
    const wrapper = await mountWithFile();
    wrapper.findComponent('[data-testid="import-run-rules"]').vm.$emit("update:modelValue", true);
    await wrapper.find('[data-testid="import-upload"]').trigger("click");
    await flushPromises();
    expect(wrapper.get('[data-testid="import-ignored"]').text()).toBe('leads.import.ignored::{"list":"phone, notes"}');
    expect(wrapper.get('[data-testid="import-automation"]').text()).toBe('leads.import.automation_started::{"count":2}');
    api.GET_Import.mockResolvedValue({ data: { id: 4, status: "done", report: [] } });
    const older = await mountWithFile();
    await older.find('[data-testid="import-upload"]').trigger("click");
    await flushPromises();
    expect(older.find('[data-testid="import-ignored"]').exists()).toBe(false);
    expect(older.find('[data-testid="import-automation"]').exists()).toBe(false);
  });

  it("an older backend has no checkbox", async () => {
    const wrapper = await mountWithFile();
    expect(wrapper.find('[data-testid="import-run-rules"]').exists()).toBe(false);
  });
});
