<template>
  <div class="products-tab p-300 ovy-auto h-100 fs-300">
    <div class="flex ai-ct jc-sb mb-200 flex-wrap gap-200">
      <h2 class="fs-400 fw-600">{{ $t("suppliers.tabs.products") }}</h2>
      <div class="flex ai-ct flex-wrap gap-100">
        <FilterChip
          v-for="opt in statusOptions"
          :key="opt.value"
          :label="opt.label"
          :active="statusFilter === opt.value"
          :data-testid="`products-status-${opt.value}`"
          @click="setStatus(opt.value)"
        />
        <FilterChip
          v-if="hasSuppliersPanel"
          :label="$t('suppliers.products.filters.has_unseen_changes')"
          :active="unseenOnly"
          data-testid="products-filter-unseen"
          @click="toggleUnseenOnly"
        />
      </div>
    </div>

    <div class="products-filters mb-300">
      <BasicInput
        v-model="filters.search"
        :placeholder="$t('suppliers.products.filters.search_placeholder')"
        icon="search"
        class="products-filters__search"
        data-testid="products-filter-search"
        @input="onSearchInput"
      />
      <BasicInput
        v-model="filters.ean"
        :placeholder="$t('suppliers.products.filters.ean_placeholder')"
        class="products-filters__ean"
        data-testid="products-filter-ean"
        @keyup.enter="resetAndFetch"
        @blur="resetAndFetch"
      />
      <BasicInput
        v-model="filters.costMin"
        type="number"
        :placeholder="$t('suppliers.products.filters.cost_min_placeholder')"
        class="products-filters__cost"
        data-testid="products-filter-cost-min"
        @keyup.enter="resetAndFetch"
        @blur="resetAndFetch"
      />
      <BasicInput
        v-model="filters.costMax"
        type="number"
        :placeholder="$t('suppliers.products.filters.cost_max_placeholder')"
        class="products-filters__cost"
        data-testid="products-filter-cost-max"
        @keyup.enter="resetAndFetch"
        @blur="resetAndFetch"
      />
      <Dropdown
        :values="orderingOptions"
        :selected="[filters.ordering]"
        class="products-filters__ordering"
        data-testid="products-filter-ordering"
        @onSelect="(val) => onOrderingChange(val)"
      />
      <button
        v-if="hasActiveFilters"
        class="products-filters__clear"
        data-testid="products-filter-clear"
        @click="clearFilters"
      >
        <FontAwesomeIcon icon="xmark" />
        {{ $t("suppliers.products.filters.clear") }}
      </button>
    </div>

    <BulkActionBar
      v-if="hasSuppliersPanel && selectedProducts.length"
      :count="selectedProducts.length"
      selected-label-key="suppliers.products.bulk.items_selected"
      clear-label-key="suppliers.products.bulk.clear"
      :actions="bulkActions"
      data-testid="products-bulk-bar"
      @action="handleBulkAction"
      @clear="clearSelection"
    />

    <Loader v-show="loading" />

    <DataTable
      v-show="!loading"
      :columns="columns"
      :rows="visibleProducts"
      row-key="id"
      :selectable="hasSuppliersPanel"
      :multi-select="hasSuppliersPanel"
      :empty-text="$t('suppliers.products.empty')"
      @select="onSelect"
      @row-click="onRowClick"
    >
      <template #cell-status="{ value }">
        <StatusBadge :label="value" :variant="statusVariant(value)" />
      </template>
      <template #cell-updated="{ row }">
        <StatusBadge
          v-if="isRowUpdated(row)"
          :label="$t('suppliers.products.col.updated')"
          variant="warning"
          role="button"
          :data-testid="`products-updated-${row.id}`"
          @click.stop="onUpdatedBadgeClick(row)"
        />
      </template>
      <template #cell-cost="{ row }">
        <span>{{ formatCost(row.cost, row.currency) }}</span>
      </template>
      <template #cell-last_synced_at="{ value }">
        <span class="fs-200 t-basic-600">{{ formatDate(value) }}</span>
      </template>
      <template #cell-actions="{ row }">
        <div class="flex ai-ct gap-100" @click.stop>
          <!-- etap-12 #19: per-row quick actions for new/queued SPs, complementary to the bulk bar. -->
          <button
            v-if="canApprove(row)"
            class="row-action-btn bg-support-100 t-support-400"
            :title="$t('suppliers.products.row_actions.review')"
            :data-testid="`products-review-${row.id}`"
            @click="reviewProduct(row)"
          >
            <FontAwesomeIcon icon="eye" />
          </button>
          <button
            v-if="canApprove(row)"
            class="row-action-btn bg-positive-100 t-positive-300"
            :title="$t('suppliers.products.row_actions.approve')"
            :data-testid="`products-approve-${row.id}`"
            @click="quickApprove(row)"
          >
            <FontAwesomeIcon icon="check" />
          </button>
          <button
            v-if="canApprove(row)"
            class="row-action-btn bg-negative-100 t-negative-300"
            :title="$t('suppliers.products.row_actions.reject')"
            :data-testid="`products-reject-${row.id}`"
            @click="quickReject(row)"
          >
            <FontAwesomeIcon icon="xmark" />
          </button>
          <button
            v-if="canPush(row)"
            class="row-action-btn bg-positive-100 t-positive-300"
            :title="$t('suppliers.products.push_button')"
            :data-testid="`products-push-${row.id}`"
            @click="pushProduct(row)"
          >
            <FontAwesomeIcon icon="upload" />
          </button>
          <button
            v-if="canForceRepush(row)"
            class="row-action-btn bg-warning-100 t-warning-300"
            :title="$t('suppliers.products.force_repush_button')"
            :data-testid="`products-force-repush-${row.id}`"
            @click="confirmForceRepush(row)"
          >
            <FontAwesomeIcon icon="rotate" />
          </button>
          <button
            class="row-action-btn bg-basic-200 t-basic-700"
            :title="$t('supplier_review.show_raw_data')"
            :data-testid="`products-raw-${row.id}`"
            @click="showRaw(row)"
          >
            <FontAwesomeIcon icon="eye" />
          </button>
        </div>
      </template>
    </DataTable>

    <Pagination
      v-if="!loading && totalCount > pageSize"
      :pagination="paginationState"
      class="mt-300"
      @onChangePage="onPageChange"
    />

    <RawDataModal
      :visible="rawVisible"
      :product="rawProduct"
      @close="rawVisible = false"
    />

    <GalleryModal
      :visible="galleryVisible"
      :images="galleryProduct?.image_urls || []"
      :product-name="galleryProduct?.name || ''"
      @close="galleryVisible = false"
    />

    <SideDrawer
      :visible="detailVisible"
      :title="detailProduct?.name || ''"
      width="720px"
      @close="closeDetail"
    >
      <div v-if="detailProduct" class="products-detail-wrap">
        <div class="products-detail">
          <ProductCard
            :product="detailProduct"
            @show-raw="onDetailShowRaw"
            @show-gallery="onDetailShowGallery"
          />
          <RawDataPanel :product="detailProduct" />
          <SupplierProductTimelineSection
            v-if="
              hasSuppliersPanel &&
              detailProduct.real_product_sku &&
              !isMonitoringSupplier
            "
            :sku="detailProduct.real_product_sku"
            data-testid="drawer-timeline-section"
          />
          <SupplierProductMappingSection
            v-if="hasSuppliersPanel && supplier?.idx && !isMonitoringSupplier"
            :supplier-idx="supplier.idx"
            data-testid="drawer-mapping-section"
            @open-mappings="onOpenMappingsTab"
          />
        </div>
        <div class="products-detail__actions">
          <button
            v-if="canApprove(detailProduct)"
            class="detail-btn detail-btn--approve"
            :disabled="detailBusy"
            @click="detailAction('approve')"
          >
            <FontAwesomeIcon icon="check" />
            {{ $t("supplier_review.approve_button") }}
          </button>
          <button
            v-if="canSkip(detailProduct)"
            class="detail-btn detail-btn--skip"
            :disabled="detailBusy"
            @click="detailAction('skip')"
          >
            <FontAwesomeIcon icon="rotate" />
            {{ $t("supplier_review.skip_button") }}
          </button>
          <button
            v-if="canReject(detailProduct)"
            class="detail-btn detail-btn--reject"
            :disabled="detailBusy"
            @click="detailAction('reject')"
          >
            <FontAwesomeIcon icon="xmark" />
            {{ $t("supplier_review.reject_button") }}
          </button>
          <button
            v-if="canPush(detailProduct)"
            class="detail-btn detail-btn--push"
            :disabled="detailBusy"
            @click="detailPush"
          >
            <FontAwesomeIcon icon="upload" />
            {{ $t("suppliers.products.push_button") }}
          </button>
          <button
            v-if="canForceRepush(detailProduct)"
            class="detail-btn detail-btn--repush"
            :disabled="detailBusy"
            @click="detailForceRepush"
          >
            <FontAwesomeIcon icon="rotate" />
            {{ $t("suppliers.products.force_repush_button") }}
          </button>
        </div>
      </div>
    </SideDrawer>

    <Confirmation-modal
      :visible="repushVisible"
      @accept="executeForceRepush"
      @reject="repushVisible = false"
    >
      <template #header>
        <h2>{{ $t("suppliers.products.force_repush_title") }}</h2>
      </template>
      <template #description>
        <p>
          {{ $t("suppliers.products.force_repush_body") }}
        </p>
        <div
          v-if="repushTarget?.pushed_to_channel_idxs?.length"
          class="bg-warning-100 t-warning-300 p-200 br-sm mt-200"
        >
          <p class="fs-200 fw-600 mb-100">
            {{ $t("suppliers.products.affected_channels") }}
          </p>
          <div class="flex ai-ct flex-wrap gap-100">
            <StatusBadge
              v-for="ch in repushTarget.pushed_to_channel_idxs"
              :key="ch"
              :label="ch"
              variant="warning"
            />
          </div>
        </div>
      </template>
    </Confirmation-modal>
  </div>
</template>

<script>
import RawDataModal from "../../SupplierReview/RawDataModal.vue";
import { extractApiMessage } from "@/composables/useFormErrors";
import GalleryModal from "../../SupplierReview/GalleryModal.vue";
import ProductCard from "../../SupplierReview/ProductCard.vue";
import RawDataPanel from "../../SupplierReview/RawDataPanel.vue";
import SupplierProductTimelineSection from "../components/SupplierProductTimelineSection.vue";
import SupplierProductMappingSection from "../components/SupplierProductMappingSection.vue";
import ConfirmationModal from "@/functionals/Confirmation-modal/index.vue";
import { useNotifyStore } from "@/stores/notify";
import { useMuninStore } from "@/stores/munin";
import { useSupplierBulkActions } from "@/composables/useSupplierBulkActions";
import { formatCost, formatDate } from "@/utils/format";
import {
  GET_SupplierProducts,
  POST_ApproveProduct,
  POST_RejectProduct,
  POST_QueueProduct,
  POST_PushProduct,
  POST_ForceRepushProduct,
} from "@/api/suppliers/api";

const UPDATED_STATUSES = new Set(["pushed", "pushed_pending_images"]);

const ACTION_FN = {
  approve: POST_ApproveProduct,
  reject: POST_RejectProduct,
  skip: POST_QueueProduct,
};

const STATUS_VARIANTS = {
  new: "neutral",
  queued: "informative",
  approved: "positive",
  rejected: "negative",
  pushed_pending_images: "warning",
  pushed: "positive",
};

export default {
  name: "ProductsTab",
  components: {
    RawDataModal,
    GalleryModal,
    ProductCard,
    RawDataPanel,
    SupplierProductTimelineSection,
    SupplierProductMappingSection,
    ConfirmationModal,
  },
  props: {
    supplier: { type: Object, default: null },
  },
  setup() {
    return {
      notify: useNotifyStore(),
      munin: useMuninStore(),
      bulk: useSupplierBulkActions(),
    };
  },
  data() {
    return {
      products: [],
      loading: false,
      statusFilter: "__all",
      unseenOnly: false,
      currentPage: 1,
      pageSize: 20,
      totalCount: 0,
      filters: {
        search: "",
        ean: "",
        costMin: "",
        costMax: "",
        ordering: "-data_changed_at",
      },
      searchTimer: null,
      selectedProducts: [],
      bulkBusy: false,
      rawVisible: false,
      rawProduct: null,
      galleryVisible: false,
      galleryProduct: null,
      detailVisible: false,
      detailProduct: null,
      detailBusy: false,
      repushVisible: false,
      repushTarget: null,
    };
  },
  computed: {
    statusOptions() {
      const all = [
        { value: "__all", label: this.$t("common.all") },
        { value: "new", label: this.$t("supplier_review.status.new") },
        { value: "queued", label: this.$t("supplier_review.status.queued") },
        {
          value: "approved",
          label: this.$t("supplier_review.status.approved"),
        },
        { value: "pushed", label: this.$t("supplier_review.status.pushed") },
        {
          value: "rejected",
          label: this.$t("supplier_review.status.rejected"),
        },
      ];
      if (!this.isMonitoringSupplier) return all;
      // Monitoring SPs can never reach queued/approved/pushed (those actions are blocked).
      const dead = ["queued", "approved", "pushed"];
      return all.filter((o) => !dead.includes(o.value));
    },
    orderingOptions() {
      return [
        {
          value: "-data_changed_at",
          label: this.$t("suppliers.products.filters.ordering.changed_desc"),
        },
        {
          value: "-last_synced_at",
          label: this.$t("suppliers.products.filters.ordering.synced_desc"),
        },
        {
          value: "name",
          label: this.$t("suppliers.products.filters.ordering.name_asc"),
        },
        {
          value: "-name",
          label: this.$t("suppliers.products.filters.ordering.name_desc"),
        },
        {
          value: "cost",
          label: this.$t("suppliers.products.filters.ordering.cost_asc"),
        },
        {
          value: "-cost",
          label: this.$t("suppliers.products.filters.ordering.cost_desc"),
        },
        {
          value: "-stock",
          label: this.$t("suppliers.products.filters.ordering.stock_desc"),
        },
      ];
    },
    hasActiveFilters() {
      return (
        this.filters.search ||
        this.filters.ean ||
        this.filters.costMin ||
        this.filters.costMax ||
        this.filters.ordering !== "-data_changed_at"
      );
    },
    paginationState() {
      return {
        page: this.currentPage,
        pages: Math.max(1, Math.ceil(this.totalCount / this.pageSize)),
      };
    },
    columns() {
      const base = [
        {
          key: "external_id",
          label: this.$t("supplier_review.list.col.external_id"),
          width: "90px",
        },
        {
          key: "name",
          label: this.$t("supplier_review.list.col.name"),
          width: "minmax(180px, 1fr)",
        },
        {
          key: "status",
          label: this.$t("suppliers.col.status"),
          width: "100px",
        },
      ];
      if (this.hasSuppliersPanel) {
        base.push({
          key: "updated",
          label: this.$t("suppliers.products.col.updated"),
          width: "100px",
        });
      }
      base.push(
        {
          key: "cost",
          label: this.$t("supplier_review.list.col.cost"),
          width: "100px",
        },
        {
          key: "stock",
          label: this.$t("supplier_review.list.col.stock"),
          width: "70px",
        },
        {
          key: "last_synced_at",
          label: this.$t("suppliers.products.col.last_sync"),
          width: "130px",
        },
        { key: "actions", label: "", width: "70px" }
      );
      return base;
    },
    hasSuppliersPanel() {
      return this.munin.isPanelEnabled("suppliers");
    },
    isMonitoringSupplier() {
      return this.supplier?.supplier_role === "monitoring";
    },
    visibleProducts() {
      if (!this.unseenOnly) return this.products;
      return this.products.filter((row) => this.isRowUpdated(row));
    },
    bulkActions() {
      const actions = [];
      // Force re-push is a PIM write — monitoring suppliers can't do it.
      if (!this.isMonitoringSupplier) {
        actions.push({
          key: "force_repush",
          labelKey: "suppliers.products.bulk.force_repush_selected",
          buttonClass: "bg-warning-100 t-warning-300",
        });
      }
      actions.push({
        key: "acknowledge",
        labelKey: "suppliers.products.bulk.acknowledge_selected",
        buttonClass: "bg-positive-100 t-positive-300",
      });
      return actions;
    },
  },
  watch: {
    "supplier.idx"() {
      this.currentPage = 1;
      this.fetchProducts();
    },
    statusFilter() {
      this.currentPage = 1;
      this.fetchProducts();
    },
  },
  beforeUnmount() {
    clearTimeout(this.searchTimer);
  },
  mounted() {
    this.fetchProducts();
  },
  methods: {
    formatCost,
    formatDate,
    statusVariant(value) {
      return STATUS_VARIANTS[value] || "neutral";
    },
    setStatus(val) {
      this.statusFilter = val;
    },
    toggleUnseenOnly() {
      this.unseenOnly = !this.unseenOnly;
    },
    isRowUpdated(row) {
      if (!row || !UPDATED_STATUSES.has(row.status)) return false;
      if (!row.data_changed_at || !row.pushed_at) return false;
      return (
        new Date(row.data_changed_at).getTime() >
        new Date(row.pushed_at).getTime()
      );
    },
    onSelect(selected) {
      this.selectedProducts = selected;
    },
    clearSelection() {
      this.selectedProducts = [];
    },
    onUpdatedBadgeClick(row) {
      this.detailProduct = row;
      this.detailVisible = true;
    },
    onOpenMappingsTab() {
      this.closeDetail();
      this.$router.push({
        path: this.$route.path,
        query: { ...this.$route.query, tab: "mappings" },
      });
    },
    async handleBulkAction(actionKey) {
      if (this.bulkBusy || !this.selectedProducts.length) return;
      this.bulkBusy = true;
      try {
        if (actionKey === "force_repush") {
          const { succeeded, failed, events } = await this.bulk.forceRepushSps(
            this.selectedProducts
          );
          this.reportBulkResult({
            successKey: "suppliers.products.bulk.toast.force_repush_succeeded",
            partialKey: "suppliers.products.bulk.toast.force_repush_partial",
            successCount: succeeded.length,
            failedCount: failed.length,
          });
          this._emitPushEventToasts(events);
          if (succeeded.length) {
            this.selectedProducts = [];
            await this.fetchProducts();
          }
        } else if (actionKey === "acknowledge") {
          const { succeeded, failed } = await this.bulk.acknowledgeSps(
            this.selectedProducts
          );
          this.reportBulkResult({
            successKey: "suppliers.products.bulk.toast.acknowledge_succeeded",
            partialKey: "suppliers.products.bulk.toast.acknowledge_partial",
            successCount: succeeded.length,
            failedCount: failed.length,
          });
          if (succeeded.length) {
            this.selectedProducts = [];
            await this.fetchProducts();
          }
        }
      } finally {
        this.bulkBusy = false;
      }
    },
    reportBulkResult({ successKey, partialKey, successCount, failedCount }) {
      if (failedCount === 0 && successCount > 0) {
        this.notify.spawnNotification({
          type: "positive",
          msg: this.$t(successKey, { count: successCount }),
        });
        return;
      }
      if (failedCount > 0) {
        this.notify.spawnNotification({
          type: failedCount && !successCount ? "negative" : "warning",
          msg: this.$t(partialKey, { ok: successCount, failed: failedCount }),
        });
      }
    },
    resetAndFetch() {
      this.currentPage = 1;
      this.fetchProducts();
    },
    onSearchInput() {
      clearTimeout(this.searchTimer);
      this.searchTimer = setTimeout(() => this.resetAndFetch(), 300);
    },
    onOrderingChange(val) {
      this.filters.ordering = val;
      this.resetAndFetch();
    },
    onPageChange(page) {
      this.currentPage = page;
      this.fetchProducts();
    },
    clearFilters() {
      this.filters = {
        search: "",
        ean: "",
        costMin: "",
        costMax: "",
        ordering: "-data_changed_at",
      };
      this.resetAndFetch();
    },
    async fetchProducts() {
      if (!this.supplier?.idx) return;
      this.loading = true;
      try {
        const params = {
          supplier: this.supplier.idx,
          page: this.currentPage,
          page_size: this.pageSize,
          ordering: this.filters.ordering,
        };
        if (this.statusFilter !== "__all") params.status = this.statusFilter;
        if (this.filters.search) params.search = this.filters.search;
        if (this.filters.ean) params.ean = this.filters.ean;
        if (this.filters.costMin !== "" && this.filters.costMin != null) {
          params.cost_min = this.filters.costMin;
        }
        if (this.filters.costMax !== "" && this.filters.costMax != null) {
          params.cost_max = this.filters.costMax;
        }
        const { data } = await GET_SupplierProducts(params);
        this.products = data.results || [];
        this.totalCount = data.count || 0;
      } catch (err) {
        this.notify.spawnNotification({
          type: "negative",
          msg: extractApiMessage(err, this.$t("notifications.error")),
        });
      } finally {
        this.loading = false;
      }
    },
    onRowClick(row) {
      this.detailProduct = row;
      this.detailVisible = true;
    },
    closeDetail() {
      this.detailVisible = false;
      this.detailProduct = null;
    },
    onDetailShowRaw() {
      this.rawProduct = this.detailProduct;
      this.rawVisible = true;
    },
    onDetailShowGallery() {
      this.galleryProduct = this.detailProduct;
      this.galleryVisible = true;
    },
    canApprove(p) {
      // Monitoring suppliers never push, so approve/queue is meaningless — backend refuses it too.
      return (
        !this.isMonitoringSupplier && ["new", "queued"].includes(p?.status)
      );
    },
    canSkip(p) {
      // Skip queues the SP (new → queued), which the backend refuses for monitoring.
      return !this.isMonitoringSupplier && p?.status === "new";
    },
    canReject(p) {
      return ["new", "queued", "approved"].includes(p?.status);
    },
    canPush(p) {
      return !this.isMonitoringSupplier && p?.status === "approved";
    },
    canForceRepush(p) {
      return !this.isMonitoringSupplier && p?.status === "pushed";
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
          msg: this.$t(`supplier_review.toast.${toastKey}`),
        });
        this.fetchProducts();
      } catch (err) {
        this.notify.spawnNotification({
          type: "negative",
          msg: extractApiMessage(err, this.$t("notifications.error")),
        });
      } finally {
        this.detailBusy = false;
      }
    },
    async detailPush() {
      if (!this.detailProduct || this.detailBusy) return;
      this.detailBusy = true;
      try {
        const resp = await POST_PushProduct(this.detailProduct.id);
        this.notify.spawnNotification({
          type: "positive",
          msg: this.$t("suppliers.products.toast.pushed"),
        });
        this._emitPushEventToasts(resp?.data?.events);
        this.closeDetail();
        this.fetchProducts();
      } catch (err) {
        this.notify.spawnNotification({
          type: "negative",
          msg: extractApiMessage(err, this.$t("notifications.error")),
        });
      } finally {
        this.detailBusy = false;
      }
    },
    detailForceRepush() {
      this.repushTarget = this.detailProduct;
      this.repushVisible = true;
    },
    showRaw(row) {
      this.rawProduct = row;
      this.rawVisible = true;
    },
    // etap-12 #19: per-row quick actions — fire single API call, toast, refresh.
    reviewProduct(row) {
      this.$router.push({
        path: "/suppliers/review",
        query: { sp_id: row.id },
      });
    },
    async quickApprove(row) {
      await this._quickAction("approve", row, "approved");
    },
    async quickReject(row) {
      await this._quickAction("reject", row, "rejected");
    },
    async _quickAction(action, row, toastKey) {
      try {
        await ACTION_FN[action](row.id);
        this.notify.spawnNotification({
          type: "positive",
          msg: this.$t(`supplier_review.toast.${toastKey}`),
        });
        this.fetchProducts();
      } catch (err) {
        this.notify.spawnNotification({
          type: "negative",
          msg: extractApiMessage(err, this.$t("notifications.error")),
        });
      }
    },
    async pushProduct(row) {
      try {
        const resp = await POST_PushProduct(row.id);
        this.notify.spawnNotification({
          type: "positive",
          msg: this.$t("suppliers.products.toast.pushed"),
        });
        this._emitPushEventToasts(resp?.data?.events);
        this.fetchProducts();
      } catch (err) {
        this.notify.spawnNotification({
          type: "negative",
          msg: extractApiMessage(err, this.$t("notifications.error")),
        });
      }
    },
    confirmForceRepush(row) {
      this.repushTarget = row;
      this.repushVisible = true;
    },
    async executeForceRepush() {
      if (!this.repushTarget) return;
      try {
        const resp = await POST_ForceRepushProduct(this.repushTarget.id);
        this.notify.spawnNotification({
          type: "positive",
          msg: this.$t("suppliers.products.toast.force_repushed"),
        });
        this._emitPushEventToasts(resp?.data?.events);
        this.repushVisible = false;
        this.repushTarget = null;
        this.fetchProducts();
      } catch (err) {
        this.notify.spawnNotification({
          type: "negative",
          msg: extractApiMessage(err, this.$t("notifications.error")),
        });
      }
    },
    /**
     * etap-08: dispatch per-event warning toasts surfaced by the backend push
     * response. Right now the only known event_type is `language_fallback`
     * (severity=warning); unknown event_types are ignored so backend can grow
     * the event taxonomy without breaking older CMS builds.
     */
    _emitPushEventToasts(events) {
      if (!Array.isArray(events) || events.length === 0) return;
      const fallbackChannels = new Set();
      for (const ev of events) {
        if (
          ev?.event_type === "language_fallback" &&
          ev?.severity === "warning"
        ) {
          const ch = ev?.details?.channel_idx;
          if (ch) fallbackChannels.add(ch);
        }
      }
      if (fallbackChannels.size) {
        this.notify.spawnNotification({
          type: "warning",
          msg: this.$t("suppliers.push.language_fallback_warning", {
            channels: Array.from(fallbackChannels).join(", "),
          }),
        });
      }
    },
  },
};
</script>

<style lang="scss" scoped>
.products-tab {
  display: flex;
  flex-direction: column;
}

.products-filters {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--space-200);
}
.products-filters__search {
  flex: 1 1 220px;
  min-width: 200px;
  max-width: 320px;
}
.products-filters__ean {
  flex: 0 0 160px;
}
.products-filters__cost {
  flex: 0 0 120px;
}
.products-filters__ordering {
  flex: 0 0 200px;
}
.products-filters__clear {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  background: transparent;
  border: 1px solid var(--c-basic-300);
  color: var(--c-basic-600);
  border-radius: var(--radius-sm);
  padding: 6px 12px;
  font-size: var(--fs-200);
  cursor: pointer;

  &:hover {
    background: var(--c-basic-200);
  }
}

/* Fill the drawer body so the content scrolls and the action bar pins to the bottom. */
.products-detail-wrap {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.products-detail {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: var(--space-300);
  padding-bottom: var(--space-300);
}

.products-detail__actions {
  flex-shrink: 0;
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-200);
  padding: var(--space-200) var(--space-300);
  /* Negative margins make the footer span the panel's full width and sit flush
     against its bottom edge, past the panel padding. */
  margin: 0 calc(-1 * var(--space-300)) calc(-1 * var(--space-300));
  background: var(--c-basic-100);
  border-top: 1px solid var(--c-basic-300);
  box-shadow: 0 -4px 12px rgba(0, 0, 0, 0.04);
}

.detail-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 32px;
  padding: 0 14px;
  font-size: var(--fs-200);
  font-weight: 600;
  border-radius: var(--radius-sm);
  border: 1px solid;
  cursor: pointer;
  transition: filter 0.15s ease;

  &:hover:not(:disabled) {
    filter: brightness(0.97);
  }
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
}
.detail-btn--approve {
  background: var(--c-positive-100);
  border-color: var(--c-positive-300);
  color: var(--c-positive-300);
}
.detail-btn--skip {
  background: var(--c-basic-100);
  border-color: var(--c-basic-400);
  color: var(--c-basic-700);
}
.detail-btn--reject {
  background: var(--c-negative-100);
  border-color: var(--c-negative-300);
  color: var(--c-negative-300);
}
.detail-btn--push {
  background: var(--c-support-100);
  border-color: var(--c-support-400);
  color: var(--c-support-400);
}
.detail-btn--repush {
  background: var(--c-warning-100);
  border-color: var(--c-warning-300);
  color: var(--c-warning-300);
}

.row-action-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: none;
  border-radius: var(--radius-sm);
  cursor: pointer;
}
</style>
