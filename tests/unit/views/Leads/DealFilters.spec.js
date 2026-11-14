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

  it("Archived is the status select's last option only when the backend archives deals", () => {
    const kinds = (archivable) =>
      mount(DealFilters, { props: { query: { kind: "open" }, archivable }, global: { stubs: { MobileFilterPanel, BasicSelect, BasicDatePicker: true } } })
        .findComponent('[data-testid="deals-filter-kind"]')
        .props("options")
        .map((option) => option.value);
    expect(kinds(true)).toEqual(["open", "won", "lost", "archived"]);
    expect(kinds(false)).toEqual(["open", "won", "lost"]);
  });
});
