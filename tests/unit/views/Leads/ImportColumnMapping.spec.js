import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { ref } from "vue";

const api = vi.hoisted(() => ({
  POST_Import: vi.fn(),
  POST_ImportPreview: vi.fn(),
  GET_Import: vi.fn(),
  GET_AssignableUsers: vi.fn(),
  GET_Attributes: vi.fn(),
}));
vi.mock("@/api/leads/api", () => api);
vi.mock("vue-router", () => ({ useRouter: () => ({ push: vi.fn() }) }));

import Import from "@/views/Leads/Import.vue";
import ImportMapping from "@/views/Leads/ImportMapping.vue";
import { READONLY } from "@/composables/useReadonly";
import { leadsFrame, setControl } from "./leadsFrame";
import { COLUMNS, FIELDS } from "./importFixtures";
import { clientError } from "../../helpers/clientError";

// U17: the file is read first, its columns checked and corrected, and only then imported with that mapping.
const PREVIEW = {
  filename: "baza.xlsx",
  format: "xlsx",
  row_count: 2,
  columns: COLUMNS,
  rows: [
    { row: 2, values: { company_name: "Alfa", website: "https://alfa.pl", email: "jan@alfa.pl" }, skip_reason: null },
    { row: 3, values: { company_name: "Beta", email: "nie-email" }, skip_reason: "invalid_email" },
  ],
  warnings: [],
  fields: FIELDS,
};
const global = { components: leadsFrame.components, stubs: { ...leadsFrame.stubs, RouterLink: true } };
const sel = (id) => `[data-testid="${id}"]`;

function pickFile(wrapper, name) {
  const input = wrapper.find(sel("import-file"));
  Object.defineProperty(input.element, "files", { value: [new File(["x"], name)], configurable: true });
  return input.trigger("change");
}

async function mountChecked() {
  const wrapper = mount(Import, { global });
  const input = wrapper.find(sel("import-file"));
  Object.defineProperty(input.element, "files", { value: [new File(["x"], "baza.xlsx")], configurable: true });
  await input.trigger("change");
  await wrapper.find(sel("import-check")).trigger("click");
  await flushPromises();
  return wrapper;
}

beforeEach(() => {
  setActivePinia(createPinia());
  for (const fn of Object.values(api)) fn.mockReset();
  api.POST_ImportPreview.mockResolvedValue({ data: PREVIEW });
  api.GET_AssignableUsers.mockResolvedValue([]);
  api.GET_Attributes.mockResolvedValue({ data: { results: [] } });
});
afterEach(() => vi.useRealTimers());

describe("Leads Import — column mapping (U17)", () => {
  it("offers .xlsx and .csv in the file picker", () => {
    const accept = mount(Import, { global }).get(sel("import-file")).attributes("accept");
    expect(accept).toContain(".xlsx");
    expect(accept).toContain(".csv");
  });

  it("shows every column with its proposal, its confidence in words and sample values; Import only after the check", async () => {
    const wrapper = mount(Import, { global });
    expect(wrapper.find(sel("import-upload")).exists()).toBe(false);
    const input = wrapper.find(sel("import-file"));
    Object.defineProperty(input.element, "files", { value: [new File(["x"], "baza.xlsx")], configurable: true });
    await input.trigger("change");
    await wrapper.find(sel("import-check")).trigger("click");
    await flushPromises();
    expect(api.POST_ImportPreview).toHaveBeenCalledWith(expect.any(File));
    expect(api.POST_Import).not.toHaveBeenCalled();
    expect(wrapper.findAll(sel("mapping-column")).map((cell) => cell.text())).toEqual(COLUMNS.map((column) => column.name));
    expect(wrapper.findComponent(sel("mapping-field-0")).props("modelValue")).toBe("company_name");
    expect(wrapper.findComponent(sel("mapping-field-5")).props("modelValue")).toBe("ignore");
    const levels = COLUMNS.map((column) => wrapper.get(sel(`mapping-confidence-${column.index}`)).attributes("label"));
    expect(levels).toEqual([
      "leads.import.mapping.confidence.sure",
      "leads.import.mapping.confidence.sure",
      "leads.import.mapping.confidence.check",
      "leads.import.mapping.confidence.check",
      "leads.import.mapping.confidence.check",
      "leads.import.mapping.confidence.unknown",
    ]);
    expect(wrapper.get(sel("mapping-note-4")).text()).toBe("skipped: Kolumna3 fits this field better");
    expect(wrapper.findAll(sel("mapping-samples"))[0].text()).toBe("Alfa");
    expect(wrapper.find(sel("import-upload")).attributes("disabled")).toBe("false");
  });

  it("the preview lists the first rows after the mapping, with the reason a row would be skipped", async () => {
    const wrapper = await mountChecked();
    const preview = wrapper.get(sel("mapping-preview")).text();
    expect(preview).toContain("Alfa");
    expect(preview).toContain("https://alfa.pl");
    expect(preview).toContain("the e-mail address is not valid");
    expect(preview).not.toContain("a1");
  });

  it("a changed field refreshes the rows under the user's mapping, and keeps the user's pick", async () => {
    vi.useFakeTimers();
    const wrapper = await mountChecked();
    api.POST_ImportPreview.mockResolvedValue({
      data: { ...PREVIEW, rows: [{ row: 2, values: { company_name: "Alfa", phone: "a1" }, skip_reason: null }] },
    });
    setControl(wrapper, "mapping-field-5", "phone");
    await flushPromises();
    expect(wrapper.get(sel("mapping-confidence-5")).attributes("label")).toBe("leads.import.mapping.confidence.sure");
    await vi.advanceTimersByTimeAsync(500);
    await flushPromises();
    expect(api.POST_ImportPreview).toHaveBeenCalledTimes(2);
    expect(JSON.parse(JSON.stringify(api.POST_ImportPreview.mock.calls[1][1]))).toMatchObject({ xyz: "phone", "Nazwa firmy": "company_name" });
    expect(wrapper.findComponent(sel("mapping-field-5")).props("modelValue")).toBe("phone");
  });

  it("two columns on one field: both say so, Import waits and no refresh is asked until one is skipped", async () => {
    vi.useFakeTimers();
    const wrapper = await mountChecked();
    setControl(wrapper, "mapping-field-4", "email");
    await flushPromises();
    expect(wrapper.get(sel("mapping-conflict-2")).text()).toBe('leads.import.mapping.conflict::{"columns":"E-mail 2"}');
    expect(wrapper.get(sel("mapping-conflict-4")).text()).toBe('leads.import.mapping.conflict::{"columns":"Kolumna3"}');
    expect(wrapper.find(sel("mapping-conflicts")).exists()).toBe(true);
    expect(wrapper.find(sel("import-upload")).attributes("disabled")).toBe("true");
    await vi.advanceTimersByTimeAsync(500);
    expect(api.POST_ImportPreview).toHaveBeenCalledTimes(1);
    setControl(wrapper, "mapping-field-2", "ignore");
    await flushPromises();
    expect(wrapper.find(sel("mapping-conflicts")).exists()).toBe(false);
    expect(wrapper.find(sel("import-upload")).attributes("disabled")).toBe("false");
  });

  it("without a domain, website or e-mail column Import waits and says why", async () => {
    const wrapper = await mountChecked();
    setControl(wrapper, "mapping-field-1", "ignore");
    await flushPromises();
    setControl(wrapper, "mapping-field-2", "ignore");
    await flushPromises();
    expect(wrapper.find(sel("mapping-no-identity")).exists()).toBe(true);
    expect(wrapper.find(sel("import-upload")).attributes("disabled")).toBe("true");
  });

  it("Import sends the file with the approved mapping of every column, then says where each column went", async () => {
    const batch = {
      id: 41,
      status: "done",
      created_count: 2,
      matched_count: 0,
      skipped_count: 0,
      report: [],
      ignored_columns: ["REGON", "E-mail 2", "xyz"],
      column_mapping: [
        { column: "Nazwa firmy", field: "company_name", label: "Company name" },
        { column: "WWW", field: "website", label: "Website" },
        { column: "Kolumna3", field: "email", label: "Email" },
        { column: "REGON", field: "ignore", label: null },
        { column: "E-mail 2", field: "ignore", label: null },
        { column: "xyz", field: "contact.attr.linkedin", label: "LinkedIn" },
      ],
    };
    api.POST_Import.mockResolvedValue({ data: { ...batch, status: "pending" } });
    api.GET_Import.mockResolvedValue({ data: batch });
    const wrapper = await mountChecked();
    setControl(wrapper, "mapping-field-5", "contact.attr.linkedin");
    await wrapper.find(sel("import-upload")).trigger("click");
    await flushPromises();
    const [file, runRules, ownerId, mapping] = api.POST_Import.mock.calls[0];
    expect(file).toBeInstanceOf(File);
    expect([runRules, ownerId]).toEqual([undefined, undefined]);
    expect(mapping).toEqual({
      "Nazwa firmy": "company_name",
      WWW: "website",
      Kolumna3: "email",
      REGON: "ignore",
      "E-mail 2": "ignore",
      xyz: "contact.attr.linkedin",
    });
    expect(wrapper.find(sel("import-mapping")).exists()).toBe(false);
    expect(wrapper.get(sel("import-counts")).text()).toContain('"created":2');
    expect(wrapper.find(sel("import-ignored")).exists()).toBe(false);
    expect(wrapper.findAll(`${sel("import-went")} li`).map((li) => li.text())).toEqual([
      "Nazwa firmy → Company name",
      "WWW → Website",
      "Kolumna3 → E-mail",
      "REGON → skipped",
      "E-mail 2 → skipped",
      "xyz → LinkedIn",
    ]);
  });

  it("a file the server cannot read says why in words, from the error's issue", async () => {
    api.POST_ImportPreview.mockRejectedValue(
      await clientError(400, { error: "VALIDATION_ERROR", message: "Request validation failed.", details: [{ field: "file", issue: "UNSUPPORTED_FORMAT", description: "x" }] })
    );
    const wrapper = await mountChecked();
    expect(wrapper.get(sel("import-error")).text()).toContain(".xlsx");
    expect(wrapper.find(sel("import-mapping")).exists()).toBe(false);
    expect(api.POST_Import).not.toHaveBeenCalled();
  });

  it("a file with too many columns says so, not the generic validation text", async () => {
    api.POST_ImportPreview.mockRejectedValue(
      await clientError(400, { error: "VALIDATION_ERROR", message: "Request validation failed.", details: [{ field: "file", issue: "TOO_MANY_COLUMNS", description: "x" }] })
    );
    const wrapper = await mountChecked();
    expect(wrapper.get(sel("import-error")).text()).toContain("too many columns");
    expect(wrapper.get(sel("import-error")).text()).not.toContain("Request validation failed");
  });

  it("an older backend without the preview (404) goes straight to the import", async () => {
    api.POST_ImportPreview.mockRejectedValue(await clientError(404, { error: "NOT_FOUND" }));
    api.POST_Import.mockResolvedValue({ data: { id: 9, status: "done", report: [] } });
    await mountChecked();
    expect(api.POST_Import).toHaveBeenCalled();
  });

  it("a refused row names the CRM field and the file's column", async () => {
    const batch = {
      id: 42,
      status: "done",
      created_count: 0,
      matched_count: 0,
      skipped_count: 1,
      report: [{ row: 3, reason: "bad_attribute:segment_size" }],
      column_mapping: [{ column: "Wielkość", field: "attr.segment_size" }],
    };
    api.POST_ImportPreview.mockResolvedValue({ data: { ...PREVIEW, fields: [...FIELDS, { key: "attr.segment_size", label: "Company size", entity: "company", custom: true }] } });
    api.POST_Import.mockResolvedValue({ data: batch });
    api.GET_Import.mockResolvedValue({ data: batch });
    const wrapper = await mountChecked();
    await wrapper.find(sel("import-upload")).trigger("click");
    await flushPromises();
    const text = wrapper.get(sel("import-rows")).text();
    expect(text).toContain('Company size (file column "Wielkość")');
    expect(text).not.toContain("segment_size");
  });

  it("another file starts over: the mapping of the first one is gone", async () => {
    const wrapper = await mountChecked();
    const input = wrapper.find(sel("import-file"));
    Object.defineProperty(input.element, "files", { value: [new File(["y"], "inna.csv")], configurable: true });
    await input.trigger("change");
    expect(wrapper.find(sel("import-mapping")).exists()).toBe(false);
    expect(wrapper.find(sel("import-check")).exists()).toBe(true);
  });

  it("another file picked while the import is polled: Check works again and the old report never shows", async () => {
    vi.useFakeTimers();
    const running = { id: 41, status: "running", created_count: 0, matched_count: 0, skipped_count: 0, report: [] };
    let answer;
    api.POST_Import.mockResolvedValue({ data: { ...running, status: "pending" } });
    api.GET_Import.mockReturnValue(new Promise((resolve) => (answer = resolve)));
    const wrapper = await mountChecked();
    await wrapper.find(sel("import-upload")).trigger("click");
    await flushPromises();
    expect(wrapper.find(sel("import-report")).exists()).toBe(true);
    pickFile(wrapper, "inna.csv");
    await flushPromises();
    expect(wrapper.find(sel("import-report")).exists()).toBe(false);
    expect(wrapper.find(sel("import-check")).attributes("disabled")).toBe("false");
    answer({ data: { ...running, status: "done" } });
    await vi.advanceTimersByTimeAsync(3000);
    await flushPromises();
    expect(wrapper.find(sel("import-report")).exists()).toBe(false);
    expect(api.GET_Import).toHaveBeenCalledTimes(1);
    expect(wrapper.find(sel("import-check")).attributes("disabled")).toBe("false");
  });

  it("the preview of the first file arriving after another file was picked is dropped", async () => {
    let answer;
    api.POST_ImportPreview.mockReturnValueOnce(new Promise((resolve) => (answer = resolve)));
    const wrapper = mount(Import, { global });
    pickFile(wrapper, "baza.xlsx");
    await wrapper.find(sel("import-check")).trigger("click");
    pickFile(wrapper, "inna.csv");
    answer({ data: PREVIEW });
    await flushPromises();
    expect(wrapper.find(sel("import-mapping")).exists()).toBe(false);
    expect(wrapper.get(sel("import-file-name")).text()).toBe("inna.csv");
    expect(wrapper.find(sel("import-check")).attributes("disabled")).toBe("false");
  });

  it("while the import is on its way to the server another file cannot be picked", async () => {
    let answer;
    api.POST_Import.mockReturnValue(new Promise((resolve) => (answer = resolve)));
    api.GET_Import.mockResolvedValue({ data: { id: 41, status: "done", report: [] } });
    const wrapper = await mountChecked();
    await wrapper.find(sel("import-upload")).trigger("click");
    expect(wrapper.find(sel("import-choose")).attributes("disabled")).toBe("true");
    expect(wrapper.find(sel("import-other-file")).attributes("disabled")).toBe("true");
    expect(wrapper.find(sel("import-file")).attributes("disabled")).toBeDefined();
    answer({ data: { id: 41, status: "pending" } });
    await flushPromises();
    expect(wrapper.find(sel("import-choose")).attributes("disabled")).toBe("false");
  });

  it("a preview answering after the import failed does not clear the import's error", async () => {
    vi.useFakeTimers();
    const wrapper = await mountChecked();
    let answer;
    api.POST_ImportPreview.mockReturnValue(new Promise((resolve) => (answer = resolve)));
    api.POST_Import.mockRejectedValue(await clientError(400, { detail: "Import refused" }));
    setControl(wrapper, "mapping-field-5", "phone");
    await vi.advanceTimersByTimeAsync(500);
    await wrapper.find(sel("import-upload")).trigger("click");
    await flushPromises();
    expect(wrapper.get(sel("import-error")).text()).toContain("Import refused");
    answer({ data: PREVIEW });
    await flushPromises();
    expect(wrapper.get(sel("import-error")).text()).toContain("Import refused");
  });

  it("a full name chosen with a first or last name: both rows say so, Import waits, no refresh is asked", async () => {
    vi.useFakeTimers();
    const wrapper = await mountChecked();
    setControl(wrapper, "mapping-field-2", "full_name");
    await flushPromises();
    setControl(wrapper, "mapping-field-5", "first_name");
    await flushPromises();
    expect(wrapper.get(sel("mapping-name-conflict-2")).text()).toBe("leads.import.mapping.name_conflict");
    expect(wrapper.get(sel("mapping-name-conflict-5")).text()).toBe("leads.import.mapping.name_conflict");
    expect(wrapper.find(sel("mapping-name-conflicts")).exists()).toBe(true);
    expect(wrapper.find(sel("import-upload")).attributes("disabled")).toBe("true");
    await vi.advanceTimersByTimeAsync(500);
    expect(api.POST_ImportPreview).toHaveBeenCalledTimes(1);
    setControl(wrapper, "mapping-field-5", "ignore");
    await flushPromises();
    expect(wrapper.find(sel("mapping-name-conflicts")).exists()).toBe(false);
  });

  it("read-only (viewer): the fields cannot be changed", () => {
    const props = { preview: PREVIEW, fields: FIELDS, modelValue: { "Nazwa firmy": "company_name" } };
    const reader = mount(ImportMapping, { props, global: { ...global, provide: { [READONLY]: ref(true) } } });
    const writer = mount(ImportMapping, { props, global });
    expect(reader.findComponent(sel("mapping-field-0")).attributes("disabled")).toBe("true");
    expect(writer.findComponent(sel("mapping-field-0")).attributes("disabled")).toBe("false");
  });
});
