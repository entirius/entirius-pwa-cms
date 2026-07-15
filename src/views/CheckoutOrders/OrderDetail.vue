<template>
  <div class="order-detail p-500 fs-300 t-basic-800 h-100 ov-h">
    <Teleport to="#checkout-orders-toolbar-left" defer>
      <BasicButton text="" icon="arrow-left" class="bg-basic-200 t-basic-600" @click="goBack" />
      <span class="fw-600">{{ order.pretty_id || $t("checkout_orders.order_detail") }}</span>
    </Teleport>

    <div v-if="loading" class="flex jc-ct p-500"><Loader /></div>

    <div v-else-if="order.order_id" class="bg-basic-100 b-basic-300 br-50 h-100 ovy-auto p-500">
      <!-- Header: status + total + dates in one compact row -->
      <div class="order-detail__header mb-400">
        <div class="order-detail__header-left">
          <StatusBadge :label="statusLabel(order.status)" :variant="statusVariant(order.status)" />
          <span class="fw-600 fs-500">{{ body.total || "0.00" }} {{ body.currency_code || "" }}</span>
        </div>
        <div class="order-detail__header-right t-basic-500 fs-200">
          <span>{{ formatDate(order.created) }}</span>
          <span v-if="order.billing_email" class="t-basic-600">{{ order.billing_email }}</span>
        </div>
      </div>

      <!-- Order meta: inline key-value pairs, aligned with table below -->
      <div class="order-detail__meta mb-300">
        <div class="order-detail__meta-item">
          <span class="order-detail__meta-label">{{ $t('checkout_orders.order_id') }}</span>
          <span class="order-detail__meta-value">{{ order.pretty_id }}</span>
        </div>
        <div class="order-detail__meta-item">
          <span class="order-detail__meta-label">{{ $t('checkout_orders.customer') }}</span>
          <span class="order-detail__meta-value">{{ order.customer_uid || "Guest" }}</span>
        </div>
      </div>

      <!-- Items table -->
      <div v-if="items.length" class="mb-400">
        <div class="section-label mb-200">{{ $t("checkout_orders.items") }} ({{ items.length }})</div>
        <DataTable :columns="itemColumns" :rows="items">
          <template #status="{ row }">
            <StatusBadge :label="row.status" :variant="row.status === 'valid' ? 'positive' : 'negative'" />
          </template>
          <template #tax_rate="{ row }">{{ formatTax(row.tax_rate) }}</template>
        </DataTable>
      </div>

      <!-- Delivery: shipping + payment side by side -->
      <div class="order-detail__delivery mb-400">
        <div v-if="body.shipping_method" class="order-detail__card">
          <div class="section-label mb-100">{{ $t("checkout_orders.shipping_method") }}</div>
          <p class="fw-600 t-basic-700">{{ body.shipping_method.name || body.shipping_method.code }}</p>
          <p class="t-basic-500 fs-200">{{ body.shipping_method.code }}</p>
          <p v-if="shippingPrice" class="t-basic-600 mt-100">{{ shippingPrice }}</p>
        </div>
        <div v-if="body.payment_method" class="order-detail__card">
          <div class="section-label mb-100">{{ $t("checkout_orders.payment_method") }}</div>
          <p class="fw-600 t-basic-700">{{ body.payment_method.name || body.payment_method.code }}</p>
          <p class="t-basic-500 fs-200">{{ body.payment_method.code }}</p>
        </div>
      </div>

      <!-- Addresses: billing + shipping side by side -->
      <div v-if="body.addresses" class="order-detail__delivery mb-400">
        <div v-if="billing" class="order-detail__card">
          <div class="section-label mb-100">{{ $t("checkout_orders.billing_address") }}</div>
          <p class="fw-600 t-basic-700">{{ billing.firstname }} {{ billing.lastname }}</p>
          <p class="t-basic-600 fs-200">{{ billing.street }}</p>
          <p class="t-basic-600 fs-200">{{ billing.postcode }} {{ billing.city }}, {{ billing.country_code }}</p>
          <p v-if="billing.email" class="t-basic-500 fs-200 mt-100">{{ billing.email }}</p>
          <p v-if="billing.telephone" class="t-basic-500 fs-200">{{ billing.dialling_code }} {{ billing.telephone }}</p>
          <p v-if="billing.company" class="t-basic-500 fs-200 mt-100">{{ billing.company }}</p>
        </div>
        <div class="order-detail__card">
          <div class="section-label mb-100">{{ $t("checkout_orders.shipping_address") }}</div>
          <template v-if="shipping">
            <p class="fw-600 t-basic-700">{{ shipping.firstname }} {{ shipping.lastname }}</p>
            <p class="t-basic-600 fs-200">{{ shipping.street }}</p>
            <p class="t-basic-600 fs-200">{{ shipping.postcode }} {{ shipping.city }}, {{ shipping.country_code }}</p>
          </template>
          <p v-else class="t-basic-400 fs-200">{{ $t("checkout_orders.same_as_billing") }}</p>
        </div>
      </div>

      <!-- Payment History (only if exists) -->
      <div v-if="order.payment_intents && order.payment_intents.length" class="mb-400">
        <div class="section-label mb-200">{{ $t("checkout_orders.payment_intents") }}</div>
        <DataTable :columns="paymentIntentColumns" :rows="order.payment_intents" />
      </div>

      <!-- Attachments (only if exists) -->
      <div v-if="order.attachments && order.attachments.length" class="mb-300">
        <div class="section-label mb-200">{{ $t("checkout_orders.attachments") }}</div>
        <div v-for="att in order.attachments" :key="att.file_id" class="flex ai-ct gap-100 mb-100 t-basic-600 fs-200">
          <span>{{ att.name || `File #${att.file_id}` }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { GET_Order } from "@/api/orders/api";
import { useNotifyStore } from "@/stores/notify";
import { extractApiMessage } from "@/composables/useFormErrors";

const STATUS_VARIANTS = {
  UNPAID: "warning", NEW: "warning", CONFIRMED: "positive", HOLDED: "informative",
  IN_PROGRESS: "informative", COMPLETED: "positive", RETURNED: "neutral", CANCELED: "negative",
};

export default {
  name: "OrderDetail",
  setup() {
    const notify = useNotifyStore();
    return { notify };
  },
  data() {
    return {
      order: {},
      loading: false,
      itemColumns: [
        { key: "sku", label: "SKU", width: "180px" },
        { key: "quantity", label: "Qty", width: "60px" },
        { key: "status", label: "Status", width: "90px" },
        { key: "base_unit_price", label: "Unit Price", width: "110px" },
        { key: "total_price", label: "Total", width: "110px" },
        { key: "tax_rate", label: "Tax", width: "80px" },
      ],
      paymentIntentColumns: [
        { key: "code", label: "Method", width: "140px" },
        { key: "status", label: "Status", width: "120px" },
        { key: "external_order_id", label: "External ID", width: "1fr" },
      ],
    };
  },
  computed: {
    channel() { return this.$route.query.channel || process.env.VUE_APP_CHANNEL || "default-local"; },
    body() { return this.order.order_body || {}; },
    items() { return this.body.cart?.items || []; },
    billing() { return this.body.addresses?.billing_address || null; },
    shipping() { return this.body.addresses?.shipping_address || null; },
    shippingPrice() {
      const sm = this.body.shipping_method;
      if (!sm) return null;
      const price = sm.unit_price || sm.total_price || sm.base_unit_price;
      return price ? `${price} ${this.body.currency_code || ""}` : null;
    },
  },
  mounted() { this.fetchOrder(); },
  methods: {
    async fetchOrder() {
      this.loading = true;
      try {
        const { data } = await GET_Order(this.channel, this.$route.params.uid);
        this.order = data;
      } catch (err) {
        this.notify.spawnNotification({ type: "negative", msg: extractApiMessage(err, this.$t("notifications.error")) });
        this.$router.push({ name: "OrderList" });
      } finally { this.loading = false; }
    },
    goBack() { this.$router.push({ name: "OrderList" }); },
    statusVariant(status) { return STATUS_VARIANTS[(status || "").toUpperCase()] || "neutral"; },
    statusLabel(status) {
      const key = `checkout_orders.statuses.${(status || "").toUpperCase()}`;
      const t = this.$t(key);
      return t !== key ? t : status;
    },
    formatDate(dateStr) {
      if (!dateStr) return "-";
      return new Date(dateStr).toLocaleDateString("pl-PL", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
    },
    formatTax(rate) {
      if (!rate) return "-";
      const n = parseFloat(rate);
      return n < 1 ? `${(n * 100).toFixed(0)}%` : `${n}%`;
    },
  },
};
</script>

<style lang="scss" scoped>
.order-detail__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-bottom: var(--space-300);
  margin-bottom: var(--space-300);
  border-bottom: 1px solid var(--c-basic-300);
}

.order-detail__header-left {
  display: flex;
  align-items: center;
  gap: var(--space-200);
}

.order-detail__header-right {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 2px;
}

.order-detail__meta {
  display: flex;
  gap: var(--space-500);
  padding-bottom: var(--space-200);
}

.order-detail__meta-item {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.order-detail__meta-label {
  font-size: var(--fs-200);
  font-weight: 600;
  text-transform: uppercase;
  color: var(--c-basic-500);
  letter-spacing: 0.04em;
}

.order-detail__meta-value {
  font-size: var(--fs-400);
  font-weight: 600;
  color: var(--c-basic-800);
}

.order-detail__delivery {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-200);
}

.order-detail__card {
  padding: 16px var(--space-200);
  background: var(--c-basic-200);
  border-radius: var(--radius-md);

  p {
    line-height: 1.5;
  }
}

@media only screen and (max-width: 768px) {
  .order-detail__delivery {
    grid-template-columns: 1fr;
  }
  .order-detail__meta {
    flex-direction: column;
    gap: var(--space-200);
  }
  .order-detail__header {
    flex-direction: column;
    align-items: flex-start;
    gap: var(--space-100);
  }
  .order-detail__header-right {
    align-items: flex-start;
  }
}
</style>
