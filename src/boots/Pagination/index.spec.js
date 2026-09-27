import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";

import Pagination from "@/boots/Pagination/index.vue";

describe("Pagination boot", () => {
  it("renders nothing for a single page", () => {
    const wrapper = mount(Pagination, { props: { pagination: { page: 1, pages: 1 } } });
    expect(wrapper.find("nav.pagination").exists()).toBe(false);
  });

  it("renders the page cells from two pages on", () => {
    const wrapper = mount(Pagination, { props: { pagination: { page: 1, pages: 2 } } });
    expect(wrapper.find("nav.pagination").exists()).toBe(true);
    expect(wrapper.find('[aria-current="page"]').text()).toBe("1");
  });

  it("derives the pages from current / total / perPage and hides only for one page", () => {
    const one = mount(Pagination, { props: { current: 1, total: 50, perPage: 50 } });
    expect(one.find("nav.pagination").exists()).toBe(false);

    const three = mount(Pagination, { props: { current: 2, total: 120, perPage: 50 } });
    expect(three.find("nav.pagination").exists()).toBe(true);
    expect(three.find('[aria-current="page"]').text()).toBe("2");
    expect(three.findAll("button.page-cell").map((b) => b.text())).toEqual(["", "1", "2", "3", ""]);
  });

  it("emits the new page as onChangePage and change in both prop styles", async () => {
    const legacy = mount(Pagination, { props: { pagination: { page: 1, pages: 2 } } });
    await legacy.find('[aria-label="next page"]').trigger("click");
    expect(legacy.emitted("onChangePage")).toEqual([[2]]);

    const derived = mount(Pagination, { props: { current: 2, total: 120, perPage: 50 } });
    await derived.find('[aria-label="previous page"]').trigger("click");
    expect(derived.emitted("change")).toEqual([[1]]);
    expect(derived.emitted("onChangePage")).toEqual([[1]]);
  });
});

describe("Pagination v-model:page", () => {
  it("renders page / pages and emits update:page next to the transition events", async () => {
    const wrapper = mount(Pagination, { props: { page: 3, pages: 5 } });
    expect(wrapper.find('[aria-current="page"]').text()).toBe("3");
    await wrapper.find('[aria-label="next page"]').trigger("click");
    expect(wrapper.emitted("update:page")).toEqual([[4]]);
    expect(wrapper.emitted("onChangePage")).toEqual([[4]]);
  });

  it("disables the arrows at the ends and folds many pages into an ellipsis", () => {
    const first = mount(Pagination, { props: { page: 1, pages: 40 } });
    expect(first.find('[aria-label="previous page"]').attributes("disabled")).toBeDefined();
    expect(first.findAll(".page-cell--gap")).toHaveLength(1);
    const middle = mount(Pagination, { props: { page: 20, pages: 40 } });
    expect(middle.findAll(".page-cell--gap")).toHaveLength(2);
    const last = mount(Pagination, { props: { page: 40, pages: 40 } });
    expect(last.find('[aria-label="next page"]').attributes("disabled")).toBeDefined();
  });

  it("keeps the pagination object working without pages", async () => {
    const wrapper = mount(Pagination, { props: { pagination: { page: 2, pages: 3 } } });
    expect(wrapper.find('[aria-current="page"]').text()).toBe("2");
    await wrapper.find('[aria-label="previous page"]').trigger("click");
    expect(wrapper.emitted("update:page")).toEqual([[1]]);
  });
});
