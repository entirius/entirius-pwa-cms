import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";

import ConfirmationModal from "@/functionals/Confirmation-modal/index.vue";
import BasicButton from "@/boots/BasicButton/index.vue";

const confirmOf = (props) =>
  mount(ConfirmationModal, { props: { visible: true, ...props }, global: { components: { BasicButton } } }).find(
    ".modal-btn--delete"
  );

describe("Confirmation-modal", () => {
  it("confirms with the primary button by default", () => {
    const confirm = confirmOf({});
    expect(confirm.classes()).toContain("btn-primary");
    expect(confirm.classes()).not.toContain("btn-danger-fill");
  });

  it("a destructive confirm (delete, remove) opts in to the filled danger button", () => {
    expect(confirmOf({ destructive: true }).classes()).toContain("btn-danger-fill");
  });
});
