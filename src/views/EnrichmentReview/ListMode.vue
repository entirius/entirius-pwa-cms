<template>
  <div class="list-mode">
    <!-- Bulk acts on the whole filtered set (server-side) — the API takes a filter, not row ids.
         Accept/reject target the pending set; undo (etap-09) targets the applied set. Honest to the
         backend contract. -->
    <div
      v-if="totalCount > 0 && (actionableFilter || undoableFilter)"
      class="list-mode__bulk flex ai-ct gap-200 mb-300 p-200 bg-support-100 br-50 flex-wrap"
      data-testid="enrichment-bulk-bar"
    >
      <span class="fs-200 t-support-400 fw-600">
        {{ $t("enrichment.review.bulk.matching", { count: totalCount }) }}
      </span>
      <div class="flex ai-ct gap-100 ml-auto flex-wrap">
        <button
          v-if="actionableFilter"
          class="list-mode__btn bg-positive-100 t-positive-300"
          :disabled="busy"
          data-testid="enrichment-bulk-accept"
          @click="$emit('bulk-accept')"
        >
          {{ $t("enrichment.review.bulk.accept_all") }}
        </button>
        <button
          v-if="actionableFilter"
          class="list-mode__btn bg-negative-100 t-negative-300"
          :disabled="busy"
          data-testid="enrichment-bulk-reject"
          @click="$emit('bulk-reject', '')"
        >
          {{ $t("enrichment.review.bulk.reject_all") }}
        </button>
        <button
          v-if="undoableFilter"
          class="list-mode__btn bg-basic-200 t-basic-600"
          :disabled="busy"
          :title="$t('enrichment.review.undo_hint')"
          data-testid="enrichment-undo"
          @click="$emit('bulk-undo')"
        >
          {{ $t("enrichment.review.undo") }}
        </button>
      </div>
    </div>

    <Loader v-show="loading" />

    <DataTable
      v-show="!loading"
      :columns="columns"
      :rows="rows"
      row-key="id"
      :empty-text="$t('enrichment.review.empty')"
      @row-click="$emit('row-focus', row)"
    >
      <template #cell-subject="{ row }">
        <!-- PIM subject: open the product preview drawer (stop the row → focus click). -->
        <button
          v-if="isPimRow(row)"
          type="button"
          class="list-mode__link list-mode__link--btn t-primary-300"
          :data-testid="`enrichment-subject-${row.id}`"
          @click.stop="$emit('preview-product', row)"
        >
          {{ row.subject_label || row.subject_ref }}
        </button>
        <a
          v-else-if="row.subject_url"
          :href="row.subject_url"
          target="_blank"
          rel="noopener"
          class="list-mode__link t-primary-300"
          :data-testid="`enrichment-subject-${row.id}`"
          @click.stop
          >{{ row.subject_label || row.subject_ref }}</a
        >
        <span v-else>{{ row.subject_label || row.subject_ref }}</span>
      </template>
      <template #cell-field="{ row }">
        <span class="fs-200 t-basic-600">{{ fieldLabel(row) }}</span>
      </template>
      <template #cell-change="{ row }">
        <DiffRenderer
          :target-kind="row.target_kind"
          :proposed="row.proposed_value"
          :current="row.current_snapshot"
          :proposal-id="row.id"
          :subject-label="row.subject_label || row.subject_ref"
        />
      </template>
      <template #cell-status="{ value }">
        <StatusBadge
          :label="$t(`enrichment.status.${value}`)"
          :variant="statusVariant(value)"
        />
      </template>
      <template #cell-confidence="{ value }">
        <span class="fs-200">{{ formatConfidence(value) }}</span>
      </template>
      <template #cell-age="{ row }">
        <span class="fs-200 t-basic-500">{{ formatDate(row.created_at) }}</span>
      </template>
      <template #cell-actions="{ row }">
        <div v-if="isActionable(row)" class="flex ai-ct gap-100">
          <button
            v-if="row.status === 'drifted'"
            class="list-mode__btn bg-warning-100 t-warning-300"
            :disabled="busy"
            :data-testid="`enrichment-reconfirm-${row.id}`"
            @click.stop="$emit('reconfirm', row)"
          >
            {{ $t("enrichment.review.reconfirm") }}
          </button>
          <button
            v-else
            class="list-mode__btn bg-positive-100 t-positive-300"
            :disabled="busy"
            :data-testid="`enrichment-accept-${row.id}`"
            @click.stop="$emit('accept', row)"
          >
            {{ $t("common.accept") }}
          </button>
          <button
            class="list-mode__btn bg-negative-100 t-negative-300"
            :disabled="busy"
            :data-testid="`enrichment-reject-${row.id}`"
            @click.stop="$emit('reject', { proposal: row, reason: '' })"
          >
            {{ $t("common.reject") }}
          </button>
        </div>
        <span v-else class="fs-200 t-basic-400">—</span>
      </template>
    </DataTable>

    <EmptyState
      v-if="!loading && !rows.length"
      icon="wand-magic-sparkles"
      :title="$t('enrichment.review.empty')"
      :message="$t('enrichment.review.empty_message')"
    />

    <div
      v-if="totalPages > 1"
      class="list-mode__pager flex ai-ct jc-ct gap-200 mt-300"
    >
      <button
        class="list-mode__btn bg-basic-200 t-basic-600"
        :disabled="page <= 1 || busy"
        @click="$emit('page', page - 1)"
      >
        {{ $t("enrichment.review.prev") }}
      </button>
      <span class="fs-200 t-basic-500">{{
        $t("enrichment.review.page_of", { page, total: totalPages })
      }}</span>
      <button
        class="list-mode__btn bg-basic-200 t-basic-600"
        :disabled="page >= totalPages || busy"
        @click="$emit('page', page + 1)"
      >
        {{ $t("enrichment.review.next") }}
      </button>
    </div>
  </div>
</template>

<script>
import { formatDate } from "@/utils/format";
import DiffRenderer from "./DiffRenderer.vue";

const STATUS_VARIANTS = {
  pending: "informative",
  applied: "positive",
  rejected: "negative",
  superseded: "neutral",
  drifted: "warning",
  reverted: "neutral",
};

export default {
  name: "EnrichmentListMode",
  components: { DiffRenderer },
  props: {
    rows: { type: Array, default: () => [] },
    loading: { type: Boolean, default: false },
    busy: { type: Boolean, default: false },
    page: { type: Number, default: 1 },
    pageSize: { type: Number, default: 25 },
    totalCount: { type: Number, default: 0 },
  },
  emits: [
    "accept",
    "reject",
    "bulk-accept",
    "bulk-reject",
    "bulk-undo",
    "reconfirm",
    "page",
    "row-focus",
    "preview-product",
  ],
  computed: {
    columns() {
      return [
        {
          key: "subject",
          label: this.$t("enrichment.review.col.subject"),
          width: "minmax(160px, 1fr)",
        },
        {
          key: "target_module",
          label: this.$t("enrichment.review.col.module"),
          width: "90px",
        },
        {
          key: "target_kind",
          label: this.$t("enrichment.review.col.kind"),
          width: "90px",
        },
        {
          key: "field",
          label: this.$t("enrichment.review.col.field"),
          width: "130px",
        },
        {
          key: "change",
          label: this.$t("enrichment.review.col.change"),
          width: "minmax(240px, 2fr)",
        },
        {
          key: "status",
          label: this.$t("enrichment.review.col.status"),
          width: "110px",
        },
        {
          key: "confidence",
          label: this.$t("enrichment.review.col.confidence"),
          width: "90px",
        },
        {
          key: "source",
          label: this.$t("enrichment.review.col.source"),
          width: "110px",
        },
        {
          key: "batch_id",
          label: this.$t("enrichment.review.col.batch"),
          width: "100px",
        },
        {
          key: "age",
          label: this.$t("enrichment.review.col.age"),
          width: "120px",
        },
        { key: "actions", label: "", width: "150px" },
      ];
    },
    totalPages() {
      return Math.max(1, Math.ceil(this.totalCount / this.pageSize));
    },
    // Bulk accept/reject only makes sense when the queue holds pending work.
    actionableFilter() {
      return this.rows.some((r) => r.status === "pending");
    },
    // Bulk undo (etap-09) only makes sense when the view holds applied proposals to revert.
    undoableFilter() {
      return this.rows.some((r) => r.status === "applied");
    },
  },
  methods: {
    formatDate,
    statusVariant(value) {
      return STATUS_VARIANTS[value] || "neutral";
    },
    isActionable(row) {
      return row.status === "pending" || row.status === "drifted";
    },
    formatConfidence(value) {
      if (value == null || value === "") return "—";
      return `${Math.round(Number(value) * 100)}%`;
    },
    fieldLabel(row) {
      const loc = row.target_locator || {};
      const parts = [loc.feature_idx, loc.language].filter(Boolean);
      return parts.length ? parts.join(" · ") : "—";
    },
    // PIM-targeted proposals carry a product SKU in subject_ref — those get the
    // clickable product preview; other modules fall back to subject_url / plain text.
    isPimRow(row) {
      return (row.target_module || "").includes("pim") && !!row.subject_ref;
    },
  },
};
</script>

<style lang="scss" scoped>
.list-mode__link {
  text-decoration: none;
  &:hover {
    text-decoration: underline;
  }
}
.list-mode__link--btn {
  background: none;
  border: none;
  padding: 0;
  font: inherit;
  cursor: pointer;
  text-align: left;
}
.list-mode__btn {
  height: var(--elem-height);
  padding: 0 12px;
  border: none;
  border-radius: var(--radius-sm);
  font-size: var(--fs-200);
  cursor: pointer;
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
}
</style>
