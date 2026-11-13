import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import DataTable from "@/boots/DataTable/index.vue";

const COLUMNS = [{ key: "name", label: "Name" }];

// Plan 55: a row carries the attributes a page object finds it by (`scheduled-row` + `data-message`).
describe("DataTable rowAttrs", () => {
  it("binds the attributes of each row from its data", () => {
    const rows = [{ uid: 1, name: "A" }, { uid: 2, name: "B" }];
    const wrapper = mount(DataTable, {
      props: { columns: COLUMNS, rows, rowAttrs: (row) => ({ "data-testid": "row", "data-id": row.uid }) },
    });
    const found = wrapper.findAll('[data-testid="row"]');
    expect(found.map((row) => row.attributes("data-id"))).toEqual(["1", "2"]);
    expect(found[0].classes()).toContain("data-table__row");
  });

  it("without rowAttrs a row has no extra attributes", () => {
    const wrapper = mount(DataTable, { props: { columns: COLUMNS, rows: [{ uid: 1, name: "A" }] } });
    expect(wrapper.get(".data-table__row").attributes("data-testid")).toBeUndefined();
  });
});

// Acceptance CM4 (plan 22): a `max-content` column fits its longest value; truncated it shrank to its header.
describe("DataTable truncation", () => {
  it("truncates a plain cell, never a max-content one unless asked", () => {
    const columns = [
      { key: "name", label: "Name", width: "1fr" },
      { key: "kind", label: "Kind", width: "max-content" },
      { key: "note", label: "Note", width: "max-content", truncate: true },
    ];
    const wrapper = mount(DataTable, { props: { columns, rows: [{ uid: 1, name: "A", kind: "Domain", note: "x" }] } });
    const cells = wrapper.findAll(".data-table__row .data-table__cell");
    expect(cells.map((cell) => cell.classes().includes("data-table__cell--truncate"))).toEqual([true, false, true]);
  });
});
