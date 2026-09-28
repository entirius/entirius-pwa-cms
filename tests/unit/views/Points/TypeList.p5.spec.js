/**
 * Plan 43 — the point-type edit dialog is a BasicModal: a row opens it with the type's values, its ActionBar is
 * Delete (danger, opens the confirm) · Cancel · Save, and closing it clears the type. A carrier row never opens it.
 */
import { describe, it, expect, vi } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";

vi.mock("@/api/deliverypoints/api", () => ({
  GET_Types: vi.fn().mockResolvedValue({ data: { results: [] } }),
  POST_Type: vi.fn(),
  PATCH_Type: vi.fn(),
  DELETE_Type: vi.fn(),
}));
vi.mock("@/stores/loader", () => ({ useLoaderStore: () => ({ loaderStart() {}, loaderFinish() {} }) }));
const notify = vi.hoisted(() => ({ spawnNotification: vi.fn() }));
vi.mock("@/stores/notify", () => ({ useNotifyStore: () => notify }));

import TypeList from "@/views/Points/TypeList.vue";

const BasicModal = {
  name: "BasicModal",
  props: ["open", "title", "actions"],
  emits: ["close"],
  template: "<div v-if='open'><slot /></div>",
};

async function mountList() {
  const wrapper = mount(TypeList, {
    global: { stubs: { BasicModal, DataTable: true, ConfirmDialog: true, BasicSwitch: true, PageHeader: true } },
  });
  await flushPromises();
  return wrapper;
}

describe("TypeList — edit dialog on BasicModal", () => {
  it("opens with the row's values and offers Delete · Cancel · Save", async () => {
    const wrapper = await mountList();
    wrapper.vm.onRowClick({ id: 3, code: "locker", name: "Locker", is_carrier: false, is_active: true, sort_order: 2 });
    await wrapper.vm.$nextTick();

    const modal = wrapper.findComponent({ name: "BasicModal" });
    expect(modal.props("open")).toBe(true);
    expect(modal.props("title")).toBe("Locker");
    expect(wrapper.vm.editForm).toMatchObject({ code: "locker", sort_order: 2 });
    const [remove, cancel, save] = modal.props("actions");
    expect([remove.key, remove.variant, cancel.key, save.role]).toEqual(["delete", "danger", "cancel", "primary"]);

    remove.onClick();
    expect(wrapper.vm.showDeleteConfirm).toBe(true);
    await modal.vm.$emit("close");
    expect(modal.props("open")).toBe(false);
  });

  it("keeps a carrier type closed and says why", async () => {
    const wrapper = await mountList();
    wrapper.vm.onRowClick({ id: 1, code: "inpost", name: "InPost", is_carrier: true });
    await wrapper.vm.$nextTick();

    expect(wrapper.findComponent({ name: "BasicModal" }).props("open")).toBe(false);
    expect(notify.spawnNotification).toHaveBeenCalledWith(expect.objectContaining({ msg: "dp.carrier_read_only" }));
  });
});
