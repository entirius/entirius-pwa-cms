import { describe, it, expect, afterEach } from "vitest";
import { nextTick } from "vue";
import { mount } from "@vue/test-utils";

import ConfirmationModal from "@/functionals/Confirmation-modal/index.vue";
import UnsavedChangesModal from "@/functionals/Unsaved-changes-modal/index.vue";
import BasicButton from "@/boots/BasicButton/index.vue";

// The transition wrappers keep their old API on ConfirmDialog until the sweeps (p3-overlays codemod) move the call
// sites; the codemod's prop/event map is the one these tests pin.
// BasicButton is passed as a stub of itself: `stubs: { BasicButton: false }` renders nothing under an options-API root.
const global = { stubs: { BasicButton }, components: { BasicButton } };
const byTestId = (id) => document.querySelector(`[data-testid="${id}"]`);

describe("Confirmation-modal / Unsaved-changes-modal wrappers", () => {
  const wrappers = [];
  const mountWrapper = (component, props = {}, slots = {}) => {
    const wrapper = mount(component, { props: { visible: true, ...props }, slots, attachTo: document.body, global });
    wrappers.push(wrapper);
    return wrapper;
  };

  afterEach(() => {
    wrappers.splice(0).forEach((wrapper) => wrapper.unmount());
    document.body.innerHTML = "";
  });

  it("confirms with the primary button by default; destructive opts in to danger-solid", async () => {
    mountWrapper(ConfirmationModal);
    await nextTick();
    expect(byTestId("confirm-dialog-confirm").classList).toContain("button-basic--primary");
    wrappers.splice(0).forEach((wrapper) => wrapper.unmount());
    mountWrapper(ConfirmationModal, { destructive: true });
    await nextTick();
    expect(byTestId("confirm-dialog-confirm").classList).toContain("button-basic--danger-solid");
  });

  it("visible → open, confirm → accept, cancel → reject; header is the title, description the body", async () => {
    const wrapper = mountWrapper(ConfirmationModal, {}, {
      header: "<h2>Usunąć?</h2>",
      description: "<p class='desc'>Na pewno?</p>",
    });
    await nextTick();
    const dialog = document.querySelector('[role="dialog"]');
    expect(document.getElementById(dialog.getAttribute("aria-labelledby")).textContent.trim()).toBe("Usunąć?");
    expect(dialog.querySelector(".desc").textContent).toBe("Na pewno?");
    byTestId("confirm-dialog-confirm").click();
    byTestId("confirm-dialog-cancel").click();
    expect(wrapper.emitted("accept")).toHaveLength(1);
    expect(wrapper.emitted("reject")).toHaveLength(1);
  });

  it("a custom footer makes it a plain BasicModal with that footer", async () => {
    const wrapper = mountWrapper(ConfirmationModal, {}, { footer: "<span class='own'>x</span>" });
    await nextTick();
    expect(byTestId("confirm-dialog-confirm")).toBeNull();
    expect(document.querySelector(".basic-modal__footer .own")).not.toBeNull();
    document.querySelector('[data-testid="basic-modal-close"]').click();
    expect(wrapper.emitted("reject")).toHaveLength(1);
  });

  it("unsaved changes: save and leave → save, discard → discard, cancel → stay", async () => {
    const wrapper = mountWrapper(UnsavedChangesModal);
    await nextTick();
    expect(document.querySelector('[role="dialog"] h2').textContent).toBe("unsaved.title");
    byTestId("confirm-dialog-confirm").click();
    byTestId("confirm-dialog-discard").click();
    byTestId("confirm-dialog-cancel").click();
    expect(Object.keys(wrapper.emitted())).toEqual(expect.arrayContaining(["save", "discard", "stay"]));
    expect(byTestId("confirm-dialog-confirm").textContent.trim()).toBe("unsaved.save_and_leave");
  });
});
