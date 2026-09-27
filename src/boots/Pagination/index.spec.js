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
