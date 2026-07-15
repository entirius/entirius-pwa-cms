import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount } from "@vue/test-utils";

vi.mock("@/api/enrichment/api", () => ({
  POST_ImportCsv: vi.fn(() => Promise.resolve({ data: { staged_file: "ref.csv", task_count: 2, tasks: [] } })),
}));
vi.mock("@/stores/pimChannel", () => ({
  usePimChannelStore: () => ({
    channels: [{ idx: "c1", name: "Channel 1" }, { idx: "c2", name: "Channel 2" }],
    activeChannelIdx: "c1",
    activeChannelLanguages: ["en", "pl"],
    allLanguages: ["en", "pl"],
  }),
}));
vi.mock("@/stores/notify", () => ({
  useNotifyStore: () => ({ spawnNotification: vi.fn() }),
}));
vi.mock("@/composables/useFormErrors", () => ({
  extractApiMessage: (err, fallback) => err?.response?.data?.message || fallback,
}));

import ImportCsvDialog from "@/views/EnrichmentReview/ImportCsvDialog.vue";
import { POST_ImportCsv } from "@/api/enrichment/api";

const stubs = { Teleport: true, FormField: true, Dropdown: true, FontAwesomeIcon: true };

function build(props = {}) {
  return mount(ImportCsvDialog, { props: { visible: true, ...props }, global: { stubs } });
}

function csvFile(name = "fields.csv") {
  return new File(["sku,field,type\nA,b,fix\n"], name, { type: "text/csv" });
}

describe("ImportCsvDialog", () => {
  beforeEach(() => POST_ImportCsv.mockClear());

  it("blocks submit until a file, channel and language are set", async () => {
    const w = build();
    w.vm.channel = "c1";
    w.vm.language = "pl";
    expect(w.vm.canSubmit).toBe(false); // no file yet
    w.vm.setFile(csvFile());
    expect(w.vm.canSubmit).toBe(true);
  });

  it("rejects a non-csv file inline without selecting it", () => {
    const w = build();
    w.vm.setFile(new File(["x"], "data.txt", { type: "text/plain" }));
    expect(w.vm.file).toBe(null);
    expect(w.vm.error).toBeTruthy();
  });

  it("posts FormData with file + channel + language and emits imported", async () => {
    const w = build();
    w.vm.setFile(csvFile());
    w.vm.channel = "c2";
    w.vm.language = "en";
    await w.vm.submit();

    expect(POST_ImportCsv).toHaveBeenCalledTimes(1);
    const [form] = POST_ImportCsv.mock.calls[0];
    expect(form).toBeInstanceOf(FormData);
    expect(form.get("channel")).toBe("c2");
    expect(form.get("language")).toBe("en");
    expect(form.get("file")).toBeInstanceOf(File);
    expect(w.emitted().imported?.[0]).toEqual([2]);
    expect(w.emitted().close).toBeTruthy();
  });

  it("downloads a sample CSV that matches the backend's locked sku,field,type schema", async () => {
    const blobs = [];
    const origCreate = URL.createObjectURL;
    const origRevoke = URL.revokeObjectURL;
    URL.createObjectURL = vi.fn((blob) => {
      blobs.push(blob);
      return "blob:sample";
    });
    URL.revokeObjectURL = vi.fn();
    const clickSpy = vi
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementation(() => {});

    try {
      const w = build();
      // downloadSample (wired to the UI trigger) produces a downloadable Blob.
      w.vm.downloadSample();
      expect(URL.createObjectURL).toHaveBeenCalledTimes(1);
      expect(clickSpy).toHaveBeenCalledTimes(1);

      const text = await blobs[0].text();
      const lines = text.trim().split("\n");
      // Header must be byte-identical to django_enrichment EXPECTED_HEADER or the import 400s.
      expect(lines[0]).toBe("sku,field,type");
      const rows = lines.slice(1);
      expect(rows.length).toBeGreaterThan(0);
      for (const row of rows) {
        const cols = row.split(",");
        expect(cols).toHaveLength(3);
        expect(cols.every((c) => c.trim().length > 0)).toBe(true);
      }
      // Distinct `type` values → one task each (the live round-trip created 3 tasks).
      expect(new Set(rows.map((r) => r.split(",")[2])).size).toBe(3);
    } finally {
      URL.createObjectURL = origCreate;
      URL.revokeObjectURL = origRevoke;
      clickSpy.mockRestore();
    }
  });

  it("surfaces the v2 envelope's field description inline and does not emit imported", async () => {
    // The enrichment client rejects with the UNWRAPPED v2 envelope (not an axios error); the
    // actionable reason is in details[].description, not the generic message.
    POST_ImportCsv.mockRejectedValueOnce({
      error: "VALIDATION_ERROR",
      message: "Request validation failed.",
      details: [{ description: "CSV header must be exactly ['sku', 'field', 'type']" }],
    });
    const w = build();
    w.vm.setFile(csvFile());
    w.vm.channel = "c1";
    w.vm.language = "pl";
    await w.vm.submit();

    expect(w.vm.error).toContain("header must be exactly");
    expect(w.emitted().imported).toBeFalsy();
  });
});
