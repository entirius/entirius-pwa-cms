<template>
  <div data-testid="order-mails">
    <div class="section-label mb-5">{{ $t("checkout_orders.mails.title") }}</div>
    <DataTable
      :columns="columns"
      :rows="mails"
      row-key="kind"
      :empty-text="$t('checkout_orders.mails.empty')"
      :row-attrs="(row) => ({ 'data-testid': `order-mail-${row.kind}` })"
    >
      <template #cell-kind="{ row }">
        <p class="t-body">{{ kindLabel(row.kind) }}</p>
        <p v-if="sharedWith(row)" class="t-muted fs-200" data-testid="order-mail-shared">
          {{ $t("checkout_orders.mails.shared_with", { numbers: sharedWith(row) }) }}
        </p>
        <p v-if="row.status === 'failed' && row.last_error" class="t-negative fs-200" data-testid="order-mail-error">
          {{ row.last_error }}
        </p>
      </template>
      <template #cell-status="{ row }">
        <StatusBadge :label="statusLabel(row.status)" :tone="STATUS_TONES[row.status] || 'neutral'" />
      </template>
      <template #cell-sent_at="{ row }">{{ row.sent_at ? formatDate(row.sent_at) : "—" }}</template>
      <template #cell-actions="{ row }">
        <BasicTooltip v-if="!hasAddress" :text="$t('checkout_orders.mails.no_address')">
          <BasicButton mutates size="sm" :disabled="true" data-testid="order-mail-resend">
            {{ $t("checkout_orders.mails.send_again") }}
          </BasicButton>
        </BasicTooltip>
        <BasicButton v-else mutates size="sm" data-testid="order-mail-resend" @click="$emit('resend', row)">
          {{ $t("checkout_orders.mails.send_again") }}
        </BasicButton>
      </template>
    </DataTable>
  </div>
</template>

<script setup>
import { computed } from "vue";
import { t } from "@/i18n";
import { formatDate } from "@/utils/format";

// The order's e-mail log (django-checkout `OrderMail`): one row per kind. A confirmation of a split purchase is shared
// by every part, so it names the other orders it covers.
const props = defineProps({
  mails: { type: Array, default: () => [] },
  orderNumber: { type: String, default: "" },
  hasAddress: { type: Boolean, default: true },
});
defineEmits(["resend"]);

const STATUS_TONES = { pending: "neutral", sent: "positive", failed: "negative", skipped: "warning" };

const columns = computed(() => [
  { key: "kind", label: t("checkout_orders.mails.kind"), width: "1fr" },
  { key: "status", label: t("checkout_orders.mails.status"), width: "max-content" },
  { key: "recipient", label: t("checkout_orders.mails.recipient"), width: "200px", priority: 2 },
  { key: "language", label: t("checkout_orders.mails.language"), width: "80px", priority: 2 },
  { key: "attempts", label: t("checkout_orders.mails.attempts"), width: "80px", numeric: true, priority: 3 },
  { key: "sent_at", label: t("checkout_orders.mails.sent_at"), width: "150px", priority: 2 },
  { key: "actions", label: "", actions: true },
]);

const kindLabel = (kind) => translated(`checkout_orders.mails.kinds.${kind}`, kind);
const statusLabel = (status) => translated(`checkout_orders.mails.statuses.${status}`, status);

function translated(key, fallback) {
  const label = t(key);
  return label === key ? fallback : label;
}

function sharedWith(row) {
  const others = (row.order_numbers || []).filter((number) => number !== props.orderNumber);
  return others.join(", ");
}
</script>
