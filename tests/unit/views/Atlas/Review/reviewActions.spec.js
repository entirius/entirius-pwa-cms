import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";

const mockGetSupplierProducts = vi.fn();
const mockApprove = vi.fn();
const mockReject = vi.fn();
const mockQueue = vi.fn();

vi.mock("@/api/atlas/api", () => ({
  GET_SupplierProducts: (...args) => mockGetSupplierProducts(...args),
  POST_ApproveProduct: (...args) => mockApprove(...args),
  POST_RejectProduct: (...args) => mockReject(...args),
  POST_QueueProduct: (...args) => mockQueue(...args),
  POST_BulkApproveProducts: vi.fn(),
  POST_BulkRejectProducts: vi.fn(),
  POST_BulkRequeueProducts: vi.fn(),
  POST_BulkPush: vi.fn(),
}));

vi.mock("@/stores/notify", () => ({
  useNotifyStore: () => ({ spawnNotification: vi.fn() }),
}));

import ListMode from "@/views/Atlas/Review/ListMode.vue";
import SwipeMode from "@/views/Atlas/Review/SwipeMode.vue";
import GalleryModal from "@/views/Atlas/Review/GalleryModal.vue";

const filters = { supplier: "__all", status: "__all", search: "" };
const stubs = {
  DataTable: true,
  ConfirmDialog: true,
  SideDrawer: true,
  ActionBar: true,
  BasicCheckbox: true,
  ProductCard: true,
  RawDataPanel: true,
  RawDataModal: true,
  GalleryModal: true,
  BasicButton: { props: ["variant", "disabled"], template: "<button :data-variant='variant'><slot /></button>" },
};

const row = (id, status, kind = "procurement") => ({ id, status, kind, name: `P${id}` });

function mountList(rows, props = {}) {
  mockGetSupplierProducts.mockResolvedValue({ data: { results: rows } });
  return mount(ListMode, { props: { filters, ...props }, global: { stubs } });
}

const byKey = (actions) => Object.fromEntries(actions.map((action) => [action.key, action]));

beforeEach(() => {
  vi.clearAllMocks();
  mockApprove.mockResolvedValue({ data: null });
});

describe("ListMode bulk actions", () => {
  it("are all disabled without a selection; reject is the danger one", async () => {
    const wrapper = mountList([row(1, "queued")]);
    await flushPromises();
    const actions = byKey(wrapper.vm.bulkActions);
    expect(Object.keys(actions)).toEqual(["approve", "reject", "requeue", "push"]);
    expect(Object.values(actions).every((action) => action.disabled)).toBe(true);
    expect(actions.reject.variant).toBe("danger");
    expect(actions.approve.variant).toBe("secondary");
  });

  it("enable by the selected statuses and lock approve and push for a monitoring row", async () => {
    const wrapper = mountList([row(1, "rejected"), row(2, "approved"), row(3, "queued", "monitoring")]);
    await flushPromises();
    wrapper.vm.toggleSelect(1);
    wrapper.vm.toggleSelect(2);
    let actions = byKey(wrapper.vm.bulkActions);
    expect(actions.requeue.disabled).toBe(false);
    expect(actions.push.disabled).toBe(false);
    expect(actions.approve.title).toBe("");

    wrapper.vm.toggleSelect(3);
    actions = byKey(wrapper.vm.bulkActions);
    expect(actions.approve.disabled).toBe(true);
    expect(actions.push.disabled).toBe(true);
    expect(actions.push.title).toBe("atlas.products.monitoring_tooltip");
  });

  it("have no approve or push on a monitoring review", async () => {
    const wrapper = mountList([], { kind: "monitoring" });
    await flushPromises();
    expect(wrapper.vm.bulkActions.map((action) => action.key)).toEqual(["reject", "requeue"]);
  });
});

describe("ListMode detail drawer actions", () => {
  it("follow the product status, approve being the one primary", async () => {
    const wrapper = mountList([]);
    await flushPromises();
    wrapper.vm.openDetail(row(1, "new"));
    expect(wrapper.vm.detailActions.map((a) => [a.key, a.role])).toEqual([
      ["approve", "primary"],
      ["skip", "secondary"],
      ["reject", "danger"],
    ]);
    wrapper.vm.openDetail(row(2, "queued"));
    expect(wrapper.vm.detailActions.map((a) => a.key)).toEqual(["approve", "reject"]);
    expect(wrapper.vm.detailActions[0].testid).toBe("list-detail-approve");
    wrapper.vm.openDetail(row(3, "pushed"));
    expect(wrapper.vm.detailActions).toEqual([]);
  });

  it("run the product action", async () => {
    const wrapper = mountList([]);
    await flushPromises();
    wrapper.vm.openDetail(row(7, "queued"));
    wrapper.vm.detailActions[0].onClick();
    await flushPromises();
    expect(mockApprove).toHaveBeenCalledWith(7);
  });
});

describe("SwipeMode decision bar", () => {
  async function mountSwipe(product) {
    mockGetSupplierProducts.mockResolvedValue({ data: { results: [product] } });
    const wrapper = mount(SwipeMode, { props: { filters }, global: { stubs } });
    await flushPromises();
    return wrapper.find("[data-testid='swipe-actions-bar']").findAll("button");
  }

  it("orders Skip · Reject · Approve (primary rightmost)", async () => {
    const buttons = await mountSwipe(row(1, "queued"));
    expect(buttons.map((b) => b.attributes("data-variant"))).toEqual(["secondary", "danger", "primary"]);
  });

  it("offers only Reject for a monitoring product", async () => {
    const buttons = await mountSwipe(row(1, "queued", "monitoring"));
    expect(buttons.map((b) => b.attributes("data-variant"))).toEqual(["danger"]);
  });
});

describe("GalleryModal", () => {
  const images = ["a.jpg", "b.jpg", "c.jpg"];
  const mountGallery = () =>
    mount(GalleryModal, { props: { visible: false, images }, global: { stubs: { BasicModal: true, IconButton: true } } });

  it("moves between images with the arrow keys while open", async () => {
    const wrapper = mountGallery();
    await wrapper.setProps({ visible: true });
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowLeft" }));
    expect(wrapper.vm.activeImage).toBe("c.jpg");
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight" }));
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight" }));
    expect(wrapper.vm.activeImage).toBe("b.jpg");

    await wrapper.setProps({ visible: false });
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight" }));
    expect(wrapper.vm.activeIndex).toBe(1);
    wrapper.unmount();
  });
});
