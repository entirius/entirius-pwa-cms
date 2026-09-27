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
});
