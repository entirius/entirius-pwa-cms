import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import { ref } from "vue";
import { READONLY } from "@/composables/useReadonly";

// The order's e-mail log on the order page (order e-mail plan 03): one row per kind, "Send again" behind a
// confirmation, a header action for an order without a confirmation, and the pickup point of the delivery.
const mockGetOrder = vi.fn();
const mockResend = vi.fn();
const mockNotify = vi.fn();
vi.mock("@/api/orders/api", () => ({
  GET_Order: (...a) => mockGetOrder(...a),
  POST_OrderMailResend: (...a) => mockResend(...a),
}));
vi.mock("@/stores/notify", () => ({ useNotifyStore: () => ({ spawnNotification: mockNotify }) }));

import OrderDetail from "@/views/CheckoutOrders/OrderDetail.vue";
import OrderMails from "@/views/CheckoutOrders/components/OrderMails.vue";
import BasicButton from "@/boots/BasicButton/index.vue";
import DataTable from "@/boots/DataTable/index.vue";

const row = (kind, status, extra = {}) => ({
  kind, status, recipient: "jan@example.com", language: "pl", attempts: 1, last_error: "", sent_at: null,
  created: "2026-11-10T10:00:00Z", order_numbers: ["0100"], ...extra,
});

const BadgeStub = { name: "StatusBadge", props: ["label", "tone"], template: "<span>{{ label }}</span>" };
const DialogStub = {
  name: "ConfirmDialog",
  props: ["open", "message", "loading"],
  emits: ["confirm", "cancel"],
  template: "<div v-if='open' data-testid='dialog'>{{ message }}</div>",
};

function mountMails(props, provide = {}) {
  return mount(OrderMails, {
    props: { orderNumber: "0100", ...props },
    global: { provide, stubs: { StatusBadge: BadgeStub, BasicButton: false, BasicTooltip: { template: "<span class='tooltip'><slot /></span>" } }, components: { BasicButton, DataTable } },
  });
}

describe("OrderMails", () => {
  it.each([
    ["pending", "neutral"],
    ["sent", "positive"],
    ["failed", "negative"],
    ["skipped", "warning"],
  ])("a %s row shows a %s badge", (status, tone) => {
    const badge = mountMails({ mails: [row("confirmation", status)] }).findComponent(BadgeStub);
    expect(badge.props("tone")).toBe(tone);
  });

  it("labels both kinds and puts the last error under a failed row", () => {
    const wrapper = mountMails({ mails: [row("confirmation", "sent"), row("canceled", "failed", { last_error: "SMTPError: refused" })] });
    expect(wrapper.text()).toContain("Order confirmation");
    expect(wrapper.text()).toContain("Order canceled");
    expect(wrapper.findAll('[data-testid="order-mail-error"]').map((el) => el.text())).toEqual(["SMTPError: refused"]);
  });

  it("names the other orders of a shared confirmation", () => {
    const wrapper = mountMails({ mails: [row("confirmation", "sent", { order_numbers: ["0100", "0101", "0102"] })] });
    expect(wrapper.find('[data-testid="order-mail-shared"]').text()).toBe(
      'checkout_orders.mails.shared_with::{"numbers":"0101, 0102"}'
    );
  });

  it("an order without e-mails shows the empty state", () => {
    const wrapper = mount(OrderMails, { props: { mails: [] }, global: { stubs: { DataTable: { props: ["emptyText"], template: "<p>{{ emptyText }}</p>" } } } });
    expect(wrapper.text()).toContain("checkout_orders.mails.empty");
  });

  it("Send again emits the row", async () => {
    const mail = row("canceled", "sent");
    const wrapper = mountMails({ mails: [mail] });
    await wrapper.find('[data-testid="order-mail-resend"]').trigger("click");
    expect(wrapper.emitted("resend")).toEqual([[mail]]);
  });

  it("Send again is hidden on a read-only page", () => {
    const wrapper = mountMails({ mails: [row("confirmation", "sent")] }, { [READONLY]: ref(true) });
    expect(wrapper.find('[data-testid="order-mail-resend"]').exists()).toBe(false);
  });

  it("Send again is disabled with the reason when the order has no address", () => {
    const wrapper = mountMails({ mails: [row("confirmation", "skipped")], hasAddress: false });
    const button = wrapper.find('.tooltip [data-testid="order-mail-resend"]');
    expect(button.attributes("disabled")).toBeDefined();
  });
});

const ORDER = {
  order_id: "uuid-1",
  pretty_id: "0100",
  status: "confirmed",
  billing_email: "jan@example.com",
  order_body: { shipping_method: { code: "inpost", name: "InPost" } },
  mails: [row("confirmation", "sent")],
};

function mountDetail(order = ORDER) {
  mockGetOrder.mockResolvedValue({ data: order });
  return mount(OrderDetail, {
    global: {
      mocks: { $route: { params: { uid: "uuid-1" }, query: {} }, $router: { push: vi.fn() } },
      stubs: { PageHeader: true, DataTable: true, ConfirmDialog: DialogStub, OrderMails: { name: "OrderMails", props: ["mails", "hasAddress"], emits: ["resend"], template: "<div />" } },
    },
  });
}

describe("OrderDetail e-mails", () => {
  beforeEach(() => {
    mockGetOrder.mockReset();
    mockResend.mockReset().mockResolvedValue({ data: row("confirmation", "pending") });
    mockNotify.mockReset();
  });

  it("Send again asks first, names the kind and recipient, then posts the row's kind and reloads", async () => {
    const wrapper = mountDetail();
    await flushPromises();
    wrapper.findComponent({ name: "OrderMails" }).vm.$emit("resend", row("canceled", "sent", { recipient: "ola@example.com" }));
    await flushPromises();
    expect(wrapper.find('[data-testid="dialog"]').text()).toContain('"recipient":"ola@example.com"');
    expect(wrapper.find('[data-testid="dialog"]').text()).toContain("checkout_orders.mails.kinds.canceled");
    expect(mockResend).not.toHaveBeenCalled();

    wrapper.findComponent(DialogStub).vm.$emit("confirm");
    await flushPromises();
    expect(mockResend).toHaveBeenCalledWith(expect.any(String), "uuid-1", "canceled");
    expect(mockNotify).toHaveBeenCalledWith({ type: "positive", msg: "checkout_orders.mails.queued" });
    expect(mockGetOrder).toHaveBeenCalledTimes(2);
    expect(wrapper.find('[data-testid="dialog"]').exists()).toBe(false);
  });

  it("a throttled resend says to try later", async () => {
    mockResend.mockReset().mockRejectedValue({ detail: "Request was throttled.", httpStatus: 429 });
    const wrapper = mountDetail();
    await flushPromises();
    wrapper.findComponent({ name: "OrderMails" }).vm.$emit("resend", row("confirmation", "sent"));
    await flushPromises();
    wrapper.findComponent(DialogStub).vm.$emit("confirm");
    await flushPromises();
    expect(mockNotify).toHaveBeenCalledWith({ type: "negative", msg: "checkout_orders.mails.too_many" });
  });

  // The header action goes through ActionBar, which hides a `mutates` action on a read-only page (no write on
  // checkout.orders, or the page forced read-only): its own spec covers that.
  it("offers Send confirmation only without a confirmation row, as a write action", async () => {
    const withRow = mountDetail();
    await flushPromises();
    expect(withRow.vm.headerActions).toEqual([]);

    const without = mountDetail({ ...ORDER, mails: [] });
    await flushPromises();
    const [action] = without.vm.headerActions;
    expect(action).toMatchObject({ key: "send-confirmation", mutates: true, disabled: false, testid: "order-send-confirmation" });
    action.onClick();
    await flushPromises();
    without.findComponent(DialogStub).vm.$emit("confirm");
    await flushPromises();
    expect(mockResend).toHaveBeenCalledWith(expect.any(String), "uuid-1", "confirmation");
  });

  it("without an address Send confirmation is disabled and the rows know it", async () => {
    const wrapper = mountDetail({ ...ORDER, billing_email: null, mails: [] });
    await flushPromises();
    expect(wrapper.vm.headerActions[0].disabled).toBe(true);
    expect(wrapper.findComponent({ name: "OrderMails" }).props("hasAddress")).toBe(false);
  });

  it("shows the pickup point only when the delivery has one", async () => {
    const plain = mountDetail();
    await flushPromises();
    expect(plain.find('[data-testid="order-pickup-point"]').exists()).toBe(false);

    const point = { code: "WAW01M", name: "WAW01M Paczkomat", address: "Prosta 1", postcode: "00-001", city: "Warszawa" };
    const body = { shipping_method: { code: "inpost", name: "InPost", delivery_point: point } };
    const withPoint = mountDetail({ ...ORDER, order_body: body });
    await flushPromises();
    const text = withPoint.find('[data-testid="order-pickup-point"]').text();
    expect(text).toContain("WAW01M Paczkomat");
    expect(text).toContain("Prosta 1");
    expect(text).toContain("00-001 Warszawa");
  });
});
