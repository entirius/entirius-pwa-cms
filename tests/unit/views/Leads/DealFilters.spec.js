import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import DealFilters from "@/views/Leads/DealFilters.vue";

const MobileFilterPanel = { name: "MobileFilterPanel", props: ["activeCount", "triggerLabel"], template: "<div><slot /></div>" };
const BasicSelect = { name: "BasicSelect", props: ["options", "modelValue"], template: "<div />" };
const mountFilters = (query) => mount(DealFilters, { props: { query }, global: { stubs: { MobileFilterPanel, BasicDatePicker: true } } });
const count = (query) => mountFilters(query).findComponent(MobileFilterPanel).props("activeCount");

// m11 (acceptance walk 3): the filter badge counts what the person set, not the default status.
describe("DealFilters", () => {
  it("the default status counts nothing; another status, a stage and a close date count", () => {
    expect(count({ owner: "all", kind: "open" })).toBe(0);
    expect(count({ owner: "me", kind: "all" })).toBe(0);
    expect(count({ owner: "me", kind: "won", stage: "demo", close_from: "2026-11-01" })).toBe(3);
  });

  it("the status select offers Open, Won and Lost; the archived list has none", () => {
    const select = (archived) =>
      mount(DealFilters, { props: { query: { kind: "open" }, archived }, global: { stubs: { MobileFilterPanel, BasicSelect, BasicDatePicker: true } } })
        .findComponent('[data-testid="deals-filter-kind"]');
    expect(select(false).props("options").map((option) => option.value)).toEqual(["open", "won", "lost"]);
    expect(select(true).exists()).toBe(false);
  });
});
