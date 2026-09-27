import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import Loader from "@/boots/Loader/index.vue";

describe("Loader boot", () => {
  it("is inline by default so a modal, side panel or button keeps its layout", () => {
    expect(mount(Loader).classes()).not.toContain("loader-element--block");
  });

  it("centres in the content area with block", () => {
    expect(mount(Loader, { props: { block: true } }).classes()).toContain("loader-element--block");
  });
});
