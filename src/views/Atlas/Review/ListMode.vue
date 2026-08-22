<template>
  <div class="list-mode">
    <div
      class="flex ai-ct gap-200 mb-300 flex-wrap"
      data-testid="list-bulk-toolbar"
    >
      <span
        class="t-basic-600 fs-200"
        data-testid="list-selected-count"
        :data-selected-count="selected.length"
      >
        {{
          $t("atlas.review.list.selected_count", { count: selected.length })
        }}
      </span>
      <button
        v-if="kind === 'procurement'"
        class="bulk-btn bulk-btn--approve"
        :disabled="!selected.length || busy || hasMonitoringSelected"
        :title="
          hasMonitoringSelected
            ? $t('atlas.products.monitoring_tooltip')
            : ''
        "
        data-testid="list-bulk-approve"
        @click="bulkConfirm('approve')"
      >
        <FontAwesomeIcon icon="check" />
        {{ $t("atlas.review.list.bulk_approve") }}
      </button>
      <button
        class="bulk-btn bulk-btn--reject"
        :disabled="!selected.length || busy"
        data-testid="list-bulk-reject"
        @click="bulkConfirm('reject')"
      >
        <FontAwesomeIcon icon="xmark" />
        {{ $t("atlas.review.list.bulk_reject") }}
      </button>
      <button
        class="bulk-btn bulk-btn--requeue"
        :disabled="!hasRejectedSelected || busy"
        data-testid="list-bulk-requeue"
        @click="bulkConfirm('requeue')"
      >
        <FontAwesomeIcon icon="rotate" />
        {{ $t("atlas.review.list.bulk_requeue") }}
      </button>
      <button
        v-if="kind === 'procurement'"
        class="bulk-btn bulk-btn--push"
        :disabled="!hasApprovedSelected || busy || hasMonitoringSelected"
        :title="
          hasMonitoringSelected
            ? $t('atlas.products.monitoring_tooltip')
            : ''
        "
        data-testid="list-bulk-push"
        @click="bulkPush"
      >
        <FontAwesomeIcon icon="upload" />
        {{ $t("atlas.review.list.push_approved") }}
      </button>
    </div>

    <Loader v-show="loading" />
    <DataTable
      v-show="!loading"
      :columns="columns"
      :rows="rows"
      :sortable="true"
      row-key="id"
      :empty-text="$t('atlas.review.empty_state_title')"
      @row-click="openDetail"
    >
      <template #cell-_select="{ row }">
        <input
          type="checkbox"
          :checked="selected.includes(row.id)"
          :data-testid="`list-row-checkbox-${row.id}`"
          @click.stop="toggleSelect(row.id)"
        />
      </template>
      <template #cell-status="{ value }">
        <StatusBadge :label="value" :variant="statusVariant(value)" />
      </template>
      <template #cell-cost="{ row }">
        <span class="t-basic-700 fw-600">
          {{ formatCost(row.cost, row.currency) }}
        </span>
      </template>
    </DataTable>

    <Confirmation-modal
      :visible="confirmVisible"
      @accept="bulkExecute"
      @reject="confirmVisible = false"
    >
      <template #header>
        <h2>{{ $t("atlas.review.list.confirm_title") }}</h2>
      </template>
      <template #description>
        <p>
          {{
            $t(`atlas.review.list.confirm_${pendingAction}`, {
              count: selected.length,
            })
          }}
        </p>
      </template>
    </Confirmation-modal>

    <SideDrawer
      :visible="detailVisible"
      :title="detailProduct?.name || ''"
      width="720px"
      @close="closeDetail"
    >
      <div v-if="detailProduct" class="list-detail-wrap">
        <div class="list-detail">
          <ProductCard
            :product="detailProduct"
            @show-raw="onDetailShowRaw"
            @show-gallery="onDetailShowGallery"
          />
          <RawDataPanel :product="detailProduct" />
        </div>
        <div class="list-detail__actions">
          <button
            v-if="canApprove(detailProduct)"
            class="bulk-btn bulk-btn--approve"
            :disabled="detailBusy"
            data-testid="list-detail-approve"
            @click="detailAction('approve')"
          >
            <FontAwesomeIcon icon="check" />
            {{ $t("atlas.review.approve_button") }}
          </button>
          <button
            v-if="canSkip(detailProduct)"
            class="bulk-btn bulk-btn--requeue"
            :disabled="detailBusy"
            data-testid="list-detail-skip"
            @click="detailAction('skip')"
          >
            <FontAwesomeIcon icon="rotate" />
            {{ $t("atlas.review.skip_button") }}
          </button>
          <button
            v-if="canReject(detailProduct)"
            class="bulk-btn bulk-btn--reject"
            :disabled="detailBusy"
            data-testid="list-detail-reject"
            @click="detailAction('reject')"
          >
            <FontAwesomeIcon icon="xmark" />
            {{ $t("atlas.review.reject_button") }}
          </button>
        </div>
      </div>
    </SideDrawer>

    <RawDataModal
      :visible="rawVisible"
      :product="detailProduct"
      @close="rawVisible = false"
    />
    <GalleryModal
      :visible="galleryVisible"
      :images="detailProduct?.image_urls || []"
      :product-name="detailProduct?.name || ''"
      @close="galleryVisible = false"
    />
  </div>
</template>

<script>
import ConfirmationModal from "@/functionals/Confirmation-modal/index.vue";
import ProductCard from "./ProductCard.vue";
import RawDataPanel from "./RawDataPanel.vue";
import RawDataModal from "./RawDataModal.vue";
import GalleryModal from "./GalleryModal.vue";
import { extractApiMessage } from "@/composables/useFormErrors";
import { useNotifyStore } from "@/stores/notify";
import { formatCost } from "@/utils/format";
import {
  GET_SupplierProducts,
  POST_BulkApproveProducts,
  POST_BulkRejectProducts,
  POST_BulkRequeueProducts,
  POST_BulkPush,
  POST_ApproveProduct,
  POST_RejectProduct,
  POST_QueueProduct,
} from "@/api/atlas/api";

const STATUS_VARIANTS = {
  new: "neutral",
  queued: "informative",
  approved: "positive",
  rejected: "negative",
  pushed_pending_images: "warning",
  pushed: "positive",
};

const BULK_FN = {
  approve: POST_BulkApproveProducts,
  reject: POST_BulkRejectProducts,
  requeue: POST_BulkRequeueProducts,
};

// Single-product review actions (skip = queue for later).
const ACTION_FN = {
  approve: POST_ApproveProduct,
  reject: POST_RejectProduct,
  skip: POST_QueueProduct,
};

export default {
  name: "ListMode",
  components: {
    ConfirmationModal,
    ProductCard,
    RawDataPanel,
    RawDataModal,
    GalleryModal,
  },
  props: {
    filters: { type: Object, required: true },
    kind: { type: String, default: "procurement" },
  },
  setup() {
    return { notify: useNotifyStore() };
  },
  data() {
    return {
      rows: [],
      selected: [],
      loading: false,
      busy: false,
      confirmVisible: false,
      pendingAction: null,
      detailVisible: false,
      detailProduct: null,
      detailBusy: false,
      rawVisible: false,
      galleryVisible: false,
    };
  },
  computed: {
    columns() {
      return [
        { key: "_select", label: "", width: "40px", sortable: false },
        {
          key: "external_id",
          label: this.$t("atlas.review.list.col.external_id"),
          width: "1fr",
          sortable: true,
        },
        {
          key: "source_idx",
          label: this.$t("atlas.review.list.col.supplier"),
          width: "120px",
          sortable: false,
        },
        {
          key: "name",
          label: this.$t("atlas.review.list.col.name"),
          width: "2fr",
          sortable: true,
        },
        {
          key: "status",
          label: this.$t("atlas.col.status"),
          width: "100px",
          sortable: true,
        },
        {
          key: "cost",
          label: this.$t("atlas.review.list.col.cost"),
          width: "120px",
          sortable: true,
        },
        {
          key: "stock",
          label: this.$t("atlas.review.list.col.stock"),
          width: "80px",
          sortable: true,
        },
      ];
    },
    selectedRows() {
      return this.rows.filter((r) => this.selected.includes(r.id));
    },
    hasRejectedSelected() {
      return this.selectedRows.some((r) => r.status === "rejected");
    },
    hasApprovedSelected() {
      return this.selectedRows.some((r) => r.status === "approved");
    },
    hasMonitoringSelected() {
      // Approve/push are PIM-bound; the backend refuses them for monitoring atlas.
      return this.selectedRows.some((r) => r.kind === "monitoring");
    },
  },
  watch: {
    filters: {
      handler() {
        this.fetchRows();
      },
      deep: true,
    },
  },
  mounted() {
    this.fetchRows();
  },
  methods: {
    formatCost,
    statusVariant(value) {
      return STATUS_VARIANTS[value] || "neutral";
    },
    async fetchRows() {
      this.loading = true;
      this.selected = [];
      try {
        const params = { page_size: 50 };
        if (this.filters.supplier && this.filters.supplier !== "__all") {
          params.source = this.filters.supplier;
        }
        if (this.filters.status && this.filters.status !== "__all") {
          params.status = this.filters.status;
        }
        if (this.filters.search) params.search = this.filters.search;
        const { data } = await GET_SupplierProducts(params);
        this.rows = data.results || [];
      } catch (err) {
        this.notify.spawnNotification({
          type: "negative",
          msg: extractApiMessage(err, this.$t("notifications.error")),
        });
      } finally {
        this.loading = false;
      }
    },
    toggleSelect(id) {
      const i = this.selected.indexOf(id);
      if (i >= 0) this.selected.splice(i, 1);
      else this.selected.push(id);
    },
    bulkConfirm(action) {
      this.pendingAction = action;
      this.confirmVisible = true;
    },
    async bulkExecute() {
      const fn = BULK_FN[this.pendingAction];
      if (!fn) return;
      this.busy = true;
      try {
        const ids =
          this.pendingAction === "requeue"
            ? this.selectedRows
                .filter((r) => r.status === "rejected")
                .map((r) => r.id)
            : this.selected;
        const { data } = await fn({ ids });
        this.notify.spawnNotification({
          type: "positive",
          msg: this.$t("atlas.review.list.toast.bulk_success", {
            count: data.affected_count ?? ids.length,
          }),
        });
        this.confirmVisible = false;
        this.fetchRows();
      } catch (err) {
        this.notify.spawnNotification({
          type: "negative",
          msg: extractApiMessage(err, this.$t("notifications.error")),
        });
      } finally {
        this.busy = false;
      }
    },
    async bulkPush() {
      this.busy = true;
      try {
        const ids = this.selectedRows
          .filter((r) => r.status === "approved")
          .map((r) => r.id);
        await POST_BulkPush({ ids });
        this.notify.spawnNotification({
          type: "positive",
          msg: this.$t("atlas.review.list.toast.push_dispatched"),
        });
        this.fetchRows();
      } catch (err) {
        this.notify.spawnNotification({
          type: "negative",
          msg: extractApiMessage(err, this.$t("notifications.error")),
        });
      } finally {
        this.busy = false;
      }
    },
    openDetail(row) {
      this.detailProduct = row;
      this.detailVisible = true;
    },
    closeDetail() {
      this.detailVisible = false;
      this.detailProduct = null;
    },
    onDetailShowRaw() {
      this.rawVisible = true;
    },
    onDetailShowGallery() {
      this.galleryVisible = true;
    },
    isDetailMonitoring(p) {
      // approve + skip(=queue) are PIM-bound and backend-refused for monitoring.
      return p?.kind === "monitoring";
    },
    canApprove(p) {
      return (
        this.kind === "procurement" &&
        !this.isDetailMonitoring(p) &&
        ["new", "queued"].includes(p?.status)
      );
    },
    canSkip(p) {
      return !this.isDetailMonitoring(p) && p?.status === "new";
    },
    canReject(p) {
      return ["new", "queued", "approved"].includes(p?.status);
    },
    async detailAction(action) {
      if (!this.detailProduct || this.detailBusy) return;
      const toastKey = {
        approve: "approved",
        reject: "rejected",
        skip: "skipped",
      }[action];
      this.detailBusy = true;
      try {
        const { data } = await ACTION_FN[action](this.detailProduct.id);
        if (data) this.detailProduct = { ...this.detailProduct, ...data };
        this.notify.spawnNotification({
          type: "positive",
          msg: this.$t(`atlas.review.toast.${toastKey}`),
        });
        this.fetchRows();
      } catch (err) {
        this.notify.spawnNotification({
          type: "negative",
          msg: extractApiMessage(err, this.$t("notifications.error")),
        });
      } finally {
        this.detailBusy = false;
      }
    },
  },
};
</script>

<style lang="scss" scoped>
.list-mode {
  display: flex;
  flex-direction: column;
}
.bulk-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 32px;
  padding: 0 12px;
  font-size: var(--fs-200);
  font-weight: 600;
  border-radius: var(--radius-sm);
  border: 1px solid;
  cursor: pointer;
}
.bulk-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.bulk-btn--approve {
  background: var(--c-positive-100);
  border-color: var(--c-positive-300);
  color: var(--c-positive-300);
}
.bulk-btn--reject {
  background: var(--c-negative-100);
  border-color: var(--c-negative-300);
  color: var(--c-negative-300);
}
.bulk-btn--requeue {
  background: var(--c-warning-100);
  border-color: var(--c-warning-300);
  color: var(--c-warning-300);
}
.bulk-btn--push {
  background: var(--c-support-100);
  border-color: var(--c-support-400);
  color: var(--c-support-400);
}

/* Detail drawer: fill the body so content scrolls and the action bar pins to the bottom. */
.list-detail-wrap {
  display: flex;
  flex-direction: column;
  height: 100%;
}
.list-detail {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: var(--space-300);
  padding-bottom: var(--space-300);
}
.list-detail__actions {
  flex-shrink: 0;
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-200);
  padding: var(--space-200) var(--space-300);
  margin: 0 calc(-1 * var(--space-300)) calc(-1 * var(--space-300));
  background: var(--c-basic-100);
  border-top: 1px solid var(--c-basic-300);
  box-shadow: 0 -4px 12px rgba(0, 0, 0, 0.04);
}
</style>
