import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import { h } from "vue";

import DataTable from "@/boots/DataTable/index.vue";

const columns = [
  { key: "name", label: "Name" },
  { key: "value", label: "Value" },
];

const rows = [
  { uid: 1, name: "Row A", value: 10 },
  { uid: 2, name: "Row B", value: 20 },
];

const expandSlot = { expand: ({ row }) => h("div", { class: "expand-content" }, row.name) };

describe("DataTable boot — expand row (opt-in)", () => {
  it("does not render the expand toggle column or slot when expandable is unset (default)", () => {
    const wrapper = mount(DataTable, {
      props: { columns, rows },
      slots: expandSlot,
    });
    expect(wrapper.find(".data-table__expand-toggle").exists()).toBe(false);
    expect(wrapper.find(".data-table__header-cell--expand").exists()).toBe(false);
    expect(wrapper.find(".expand-content").exists()).toBe(false);
  });

  it("renders one collapsed toggle per row when expandable=true, no expand content yet", () => {
    const wrapper = mount(DataTable, {
      props: { columns, rows, expandable: true },
      slots: expandSlot,
    });
    expect(wrapper.findAll(".data-table__expand-toggle").length).toBe(rows.length);
    expect(wrapper.find(".data-table__expand-row").exists()).toBe(false);
  });

  it("toggles the #expand slot open/closed on click, emits expand-toggle, and flips aria-expanded", async () => {
    const wrapper = mount(DataTable, {
      props: { columns, rows, expandable: true },
      slots: expandSlot,
    });
    const toggles = wrapper.findAll(".data-table__expand-toggle");

    expect(toggles[0].attributes("aria-expanded")).toBe("false");

    await toggles[0].trigger("click");
    expect(wrapper.findAll(".data-table__expand-row").length).toBe(1);
    expect(wrapper.find(".expand-content").text()).toBe("Row A");
    expect(wrapper.emitted("expand-toggle")[0]).toEqual([{ row: rows[0], expanded: true }]);
    expect(toggles[0].attributes("aria-expanded")).toBe("true");

    await toggles[0].trigger("click");
    expect(wrapper.findAll(".data-table__expand-row").length).toBe(0);
    expect(wrapper.emitted("expand-toggle")[1]).toEqual([{ row: rows[0], expanded: false }]);
    expect(toggles[0].attributes("aria-expanded")).toBe("false");
  });

  it("tracks each row's expand state independently — expanding row A leaves row B collapsed, and vice versa", async () => {
    const wrapper = mount(DataTable, {
      props: { columns, rows, expandable: true },
      slots: expandSlot,
    });
    const toggles = wrapper.findAll(".data-table__expand-toggle");

    await toggles[0].trigger("click");
    expect(wrapper.findAll(".data-table__expand-row").length).toBe(1);
    expect(wrapper.find(".expand-content").text()).toBe("Row A");

    await toggles[1].trigger("click");
    expect(wrapper.findAll(".data-table__expand-row").length).toBe(2);
    expect(wrapper.findAll(".expand-content").map((el) => el.text())).toEqual(["Row A", "Row B"]);

    await toggles[0].trigger("click");
    expect(wrapper.findAll(".data-table__expand-row").length).toBe(1);
    expect(wrapper.find(".expand-content").text()).toBe("Row B");
  });

  it("expand state is keyed by rowKey — two rows sharing a key expand together", async () => {
    const collidingRows = [
      { uid: 1, name: "Row A", value: 10 },
      { uid: 1, name: "Row A duplicate key", value: 99 },
    ];
    const wrapper = mount(DataTable, {
      props: { columns, rows: collidingRows, expandable: true },
      slots: expandSlot,
    });

    await wrapper.findAll(".data-table__expand-toggle")[0].trigger("click");
    // Documents the real (unguarded) behavior: rowKey is the only identity DataTable has,
    // so a shared key expands both rows. Callers with non-unique natural keys (e.g. a
    // multi-market listing) must build a composite rowKey — see GapTable.vue's `_rowKey`.
    expect(wrapper.findAll(".data-table__expand-row").length).toBe(2);
  });

  it("keeps selectable + multiSelect working when expandable is also on, without cross-triggering", async () => {
    const wrapper = mount(DataTable, {
      props: { columns, rows, expandable: true, selectable: true, multiSelect: true },
      slots: expandSlot,
    });

    // Clicking the expand toggle must not select the row.
    await wrapper.findAll(".data-table__expand-toggle")[0].trigger("click");
    expect(wrapper.emitted("select")).toBeFalsy();
    expect(wrapper.findAll(".data-table__expand-row").length).toBe(1);

    // Clicking the checkbox must not toggle expand state.
    await wrapper.find('input[type="checkbox"][aria-label="Select row"]').trigger("click");
    expect(wrapper.emitted("select")).toBeTruthy();
    expect(wrapper.findAll(".data-table__expand-row").length).toBe(1);
  });
});
