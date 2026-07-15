<template>
  <div class="enrichment-review h-100 ovy-auto">
    <div
      class="enrichment-review__toolbar p-300 b-basic-300 bb-100 bg-basic-100"
    >
      <div class="flex ai-ct gap-300 flex-wrap">
        <h1 class="fs-500 fw-600 m-0">{{ $t("enrichment.review.title") }}</h1>
        <SegmentedControl
          v-model="mode"
          :options="modeOptions"
          data-testid="enrichment-mode-switch"
        />
        <div class="flex ai-ct gap-200 ml-auto">
          <button
            class="enrichment-review__filters-toggle"
            :class="{ 'is-active': filtersOpen }"
            data-testid="enrichment-filters-toggle"
            :aria-expanded="filtersOpen"
            @click="filtersOpen = !filtersOpen"
          >
            <FontAwesomeIcon icon="filter" />
            {{ $t("enrichment.review.filters") }}
            <span
              v-if="activeFilterCount > 0"
              class="enrichment-review__filters-badge"
              data-testid="enrichment-filters-count"
              >{{ activeFilterCount }}</span
            >
          </button>
          <button
            class="enrichment-review__import bg-support-400 t-basic-100"
            data-testid="enrichment-import-open"
            @click="importVisible = true"
          >
            <FontAwesomeIcon icon="file-csv" />
            {{ $t("enrichment.import.open") }}
          </button>
        </div>
      </div>
      <div class="flex ai-ct flex-wrap gap-100 mt-200">
        <FilterChip
          v-for="opt in statusOptions"
          :key="opt.value"
          :label="opt.label"
          :active="filters.status === opt.value"
          :data-testid="`enrichment-status-${opt.value}`"
          @click="onFilterChange('status', opt.value)"
        />
        <span
          class="enrichment-review__count fs-200 t-basic-500 ml-auto"
          data-testid="enrichment-count"
        >
          {{ $t("enrichment.review.matching", { count: totalCount }) }}
        </span>
      </div>

      <Transition name="enrichment-filters">
        <div
          v-if="filtersOpen"
          class="enrichment-review__filters flex ai-ct flex-wrap gap-200 mt-200"
          data-testid="enrichment-filters-row"
        >
          <BasicInput
            v-model="filters.search"
            :placeholder="$t('enrichment.review.search_placeholder')"
            icon="search"
            class="enrichment-review__search"
            data-testid="enrichment-search-input"
            @input="onSearchChange"
          />
          <Dropdown
            :values="moduleOptions"
            :selected="[filters.target_module]"
            :placeholder="$t('enrichment.review.col.module')"
            data-testid="enrichment-module-filter"
            @onSelect="(v) => onFilterChange('target_module', v)"
          />
          <Dropdown
            :values="kindOptions"
            :selected="[filters.target_kind]"
            :placeholder="$t('enrichment.review.col.kind')"
            data-testid="enrichment-kind-filter"
            @onSelect="(v) => onFilterChange('target_kind', v)"
          />
          <Dropdown
            :values="sourceOptions"
            :selected="[filters.source]"
            :placeholder="$t('enrichment.review.col.source')"
            data-testid="enrichment-source-filter"
            @onSelect="(v) => onFilterChange('source', v)"
          />
          <BasicInput
            v-model="filters.batch_id"
            :placeholder="$t('enrichment.review.col.batch')"
            class="enrichment-review__batch"
            data-testid="enrichment-batch-filter"
            @input="onSearchChange"
          />
          <BasicInput
            v-model="filters.confidence_min"
            type="number"
            :placeholder="$t('enrichment.review.confidence_min')"
            class="enrichment-review__confidence"
            data-testid="enrichment-confidence-filter"
            @input="onSearchChange"
          />
        </div>
      </Transition>
    </div>

    <div class="enrichment-review__body p-300">
      <ListMode
        v-if="mode === 'list'"
        :rows="rows"
        :loading="loading"
        :page="page"
        :page-size="pageSize"
        :total-count="totalCount"
        :busy="busy"
        @accept="acceptOne"
        @reject="rejectOne"
        @bulk-accept="bulkAccept"
        @bulk-reject="bulkReject"
        @bulk-undo="bulkUndo"
        @reconfirm="openDrift"
        @page="onPage"
        @row-focus="onRowFocus"
        @preview-product="openProductPreview"
      />
      <FocusMode
        v-else
        :rows="rows"
        :loading="loading"
        :page="page"
        :page-size="pageSize"
        :total-count="totalCount"
        :initial-index="focusIndex"
        @need-more="loadNextPage"
        @exit="exitFocus"
      />
    </div>

    <DriftModal
      :visible="driftVisible"
      :proposal="driftProposal"
      :busy="busy"
      @confirm="confirmDrift"
      @reject="rejectDrift"
      @close="closeDrift"
    />

    <ImportCsvDialog
      :visible="importVisible"
      @imported="onImported"
      @close="importVisible = false"
    />

    <ProductPreviewDrawer
      :visible="previewVisible"
      :sku="previewSku"
      :channel-idx="pimChannel.activeChannelIdx"
      @close="closeProductPreview"
    />
  </div>
</template>

<script>
import { defineAsyncComponent } from "vue";
import { useNotifyStore } from "@/stores/notify";
import { usePimChannelStore } from "@/stores/pimChannel";
import { extractApiMessage } from "@/composables/useFormErrors";
import ListMode from "./ListMode.vue";
import DriftModal from "./DriftModal.vue";
import ImportCsvDialog from "./ImportCsvDialog.vue";
import ProductPreviewDrawer from "./ProductPreviewDrawer.vue";
import {
  GET_Proposals,
  POST_AcceptProposal,
  POST_RejectProposal,
  POST_BulkAcceptProposals,
  POST_BulkRejectProposals,
  POST_BulkUndoProposals,
} from "@/api/enrichment/api";

const FocusMode = defineAsyncComponent(() => import("./FocusMode.vue"));

const STATUS_VALUES = [
  "pending",
  "drifted",
  "applied",
  "rejected",
  "superseded",
  "reverted",
];

export default {
  name: "EnrichmentReview",
  components: { ListMode, FocusMode, DriftModal, ImportCsvDialog, ProductPreviewDrawer },
  setup() {
    return { notify: useNotifyStore(), pimChannel: usePimChannelStore() };
  },
  data() {
    return {
      mode: this.$route.query.mode === "focus" ? "focus" : "list",
      filters: {
        status: this.$route.query.status || "pending",
        target_module: "__all",
        target_kind: "__all",
        source: "__all",
        batch_id: "",
        confidence_min: "",
        search: "",
      },
      rows: [],
      page: 1,
      pageSize: 25,
      totalCount: 0,
      loading: false,
      busy: false,
      searchTimer: null,
      driftVisible: false,
      driftProposal: null,
      importVisible: false,
      filtersOpen: false,
      focusIndex: 0,
      previewSku: null,
      previewVisible: false,
    };
  },
  computed: {
    // Count of active collapsible filters (status lives in its own always-visible
    // chip row, so it's excluded) — surfaced as a badge on the Filters toggle.
    activeFilterCount() {
      let n = 0;
      if (this.filters.target_module !== "__all") n += 1;
      if (this.filters.target_kind !== "__all") n += 1;
      if (this.filters.source !== "__all") n += 1;
      if (this.filters.batch_id) n += 1;
      if (this.filters.confidence_min !== "" && this.filters.confidence_min != null)
        n += 1;
      if (this.filters.search) n += 1;
      return n;
    },
    modeOptions() {
      return [
        {
          value: "list",
          label: this.$t("enrichment.review.modes.list"),
          testid: "enrichment-mode-list",
        },
        {
          value: "focus",
          label: this.$t("enrichment.review.modes.focus"),
          testid: "enrichment-mode-focus",
        },
      ];
    },
    statusOptions() {
      return [
        { value: "__all", label: this.$t("common.all") },
        ...STATUS_VALUES.map((s) => ({
          value: s,
          label: this.$t(`enrichment.status.${s}`),
        })),
      ];
    },
    moduleOptions() {
      return this.distinctOptions("target_module");
    },
    kindOptions() {
      return this.distinctOptions("target_kind");
    },
    sourceOptions() {
      return this.distinctOptions("source");
    },
  },
  watch: {
    mode(val) {
      this.$router.replace({
        path: this.$route.path,
        query: { ...this.$route.query, mode: val },
      });
    },
  },
  mounted() {
    this.fetchRows();
    // The import dialog needs the channel/language list; load it once (no-op if already cached).
    if (!this.pimChannel.channels.length) this.pimChannel.fetchChannels();
  },
  methods: {
    onImported() {
      // New tasks aren't proposals, so the review list won't change — but refresh so any freshly
      // resolved proposals show up, and keep the view live after the operator imports.
      this.fetchRows();
    },
    // Filter dropdown values are derived from the values actually present in the
    // loaded page plus an "All" sentinel — generic across modules, no hardcoding.
    distinctOptions(field) {
      const seen = new Set();
      for (const r of this.rows) {
        if (r[field]) seen.add(r[field]);
      }
      return [
        { value: "__all", label: this.$t("common.all") },
        ...Array.from(seen).map((v) => ({ value: v, label: v })),
      ];
    },
    buildParams() {
      const params = {
        page: this.page,
        page_size: this.pageSize,
        ordering: "-created_at",
      };
      if (this.filters.status && this.filters.status !== "__all")
        params.status = this.filters.status;
      if (this.filters.target_module !== "__all")
        params.target_module = this.filters.target_module;
      if (this.filters.target_kind !== "__all")
        params.target_kind = this.filters.target_kind;
      if (this.filters.source !== "__all") params.source = this.filters.source;
      if (this.filters.batch_id) params.batch_id = this.filters.batch_id;
      if (
        this.filters.confidence_min !== "" &&
        this.filters.confidence_min != null
      ) {
        params.confidence_min = this.filters.confidence_min;
      }
      if (this.filters.search) params.search = this.filters.search;
      return params;
    },
    // Server-side filter payload (no pagination) reused by bulk accept/reject.
    bulkFilters() {
      const f = {};
      if (this.filters.target_module !== "__all")
        f.target_module = this.filters.target_module;
      if (this.filters.target_kind !== "__all")
        f.target_kind = this.filters.target_kind;
      if (this.filters.source !== "__all") f.source = this.filters.source;
      if (this.filters.batch_id) f.batch_id = this.filters.batch_id;
      if (
        this.filters.confidence_min !== "" &&
        this.filters.confidence_min != null
      ) {
        f.confidence_min = this.filters.confidence_min;
      }
      if (this.filters.search) f.search = this.filters.search;
      return f;
    },
    async fetchRows() {
      this.loading = true;
      try {
        const { data } = await GET_Proposals(this.buildParams());
        this.rows = data.results || [];
        this.totalCount = data.count || 0;
      } catch (err) {
        this.notify.spawnNotification({
          type: "negative",
          msg: extractApiMessage(err, this.$t("notifications.error")),
        });
        this.rows = [];
        this.totalCount = 0;
      } finally {
        this.loading = false;
      }
    },
    onFilterChange(field, value) {
      this.filters[field] = value;
      this.page = 1;
      if (field === "status") {
        this.$router.replace({
          path: this.$route.path,
          query: { ...this.$route.query, status: value },
        });
      }
      this.fetchRows();
    },
    onSearchChange() {
      clearTimeout(this.searchTimer);
      this.searchTimer = setTimeout(() => {
        this.page = 1;
        this.fetchRows();
      }, 300);
    },
    onPage(page) {
      this.page = page;
      this.fetchRows();
    },
    async loadNextPage() {
      // Focus mode reached the end of the loaded page — pull the next one.
      if (this.page * this.pageSize >= this.totalCount) return;
      this.page += 1;
      await this.fetchRows();
    },
    exitFocus() {
      // Focus walked the whole filtered set — drop back to List with fresh data.
      this.mode = "list";
      this.page = 1;
      this.notify.spawnNotification({
        type: "informative",
        msg: this.$t("enrichment.review.focus_done"),
      });
      this.fetchRows();
    },
    onRowFocus(row) {
      // List row click → open Focus on that exact proposal (same loaded page,
      // so the list index maps straight to FocusMode's localIndex).
      const idx = this.rows.indexOf(row);
      this.focusIndex = idx >= 0 ? idx : 0;
      this.mode = "focus";
    },
    openProductPreview(row) {
      this.previewSku = row.subject_ref;
      this.previewVisible = true;
    },
    closeProductPreview() {
      this.previewVisible = false;
    },
    async acceptOne(proposal) {
      if (this.busy) return;
      this.busy = true;
      try {
        const { data } = await POST_AcceptProposal(proposal.id);
        if (data.status === "drifted") {
          // Live value changed since the proposal — force a conscious re-confirm (D2).
          this.driftProposal = data;
          this.driftVisible = true;
          this.patchRow(data);
          return;
        }
        this.notify.spawnNotification({
          type: "positive",
          msg: this.$t("enrichment.review.toast.accepted"),
        });
        await this.fetchRows();
      } catch (err) {
        this.notify.spawnNotification({
          type: "negative",
          msg: extractApiMessage(err, this.$t("notifications.error")),
        });
      } finally {
        this.busy = false;
      }
    },
    async rejectOne({ proposal, reason }) {
      if (this.busy) return;
      this.busy = true;
      try {
        await POST_RejectProposal(proposal.id, reason ? { reason } : {});
        this.notify.spawnNotification({
          type: "positive",
          msg: this.$t("enrichment.review.toast.rejected"),
        });
        await this.fetchRows();
      } catch (err) {
        this.notify.spawnNotification({
          type: "negative",
          msg: extractApiMessage(err, this.$t("notifications.error")),
        });
      } finally {
        this.busy = false;
      }
    },
    async bulkAccept() {
      if (this.busy) return;
      this.busy = true;
      try {
        const { data } = await POST_BulkAcceptProposals(this.bulkFilters());
        // etap-09: sync returns the `applied` list inline, async returns `enqueued`.
        const count = data.enqueued ?? (data.applied ? data.applied.length : 0);
        this.notify.spawnNotification({
          type: "positive",
          msg: this.$t("enrichment.review.toast.bulk_accepted", { count }),
        });
        await this.fetchRows();
      } catch (err) {
        this.notify.spawnNotification({
          type: "negative",
          msg: extractApiMessage(err, this.$t("notifications.error")),
        });
      } finally {
        this.busy = false;
      }
    },
    async bulkUndo() {
      if (this.busy) return;
      this.busy = true;
      try {
        const { data } = await POST_BulkUndoProposals(this.bulkFilters());
        // sync returns `reverted`/`blocked` lists inline, async returns `enqueued`.
        const count =
          data.enqueued ?? (data.reverted ? data.reverted.length : 0);
        this.notify.spawnNotification({
          type: "positive",
          msg: this.$t("enrichment.review.toast.bulk_undone", { count }),
        });
        // Drift-blocked items stayed applied (someone edited them after apply) — surface separately.
        const blocked = data.blocked ? data.blocked.length : 0;
        if (blocked > 0) {
          this.notify.spawnNotification({
            type: "warning",
            msg: this.$t("enrichment.review.toast.bulk_undo_blocked", {
              count: blocked,
            }),
          });
        }
        await this.fetchRows();
      } catch (err) {
        this.notify.spawnNotification({
          type: "negative",
          msg: extractApiMessage(err, this.$t("notifications.error")),
        });
      } finally {
        this.busy = false;
      }
    },
    async bulkReject(reason) {
      if (this.busy) return;
      this.busy = true;
      try {
        const payload = this.bulkFilters();
        if (reason) payload.reason = reason;
        const { data } = await POST_BulkRejectProposals(payload);
        this.notify.spawnNotification({
          type: "positive",
          msg: this.$t("enrichment.review.toast.bulk_rejected", {
            count: data.rejected ?? 0,
          }),
        });
        await this.fetchRows();
      } catch (err) {
        this.notify.spawnNotification({
          type: "negative",
          msg: extractApiMessage(err, this.$t("notifications.error")),
        });
      } finally {
        this.busy = false;
      }
    },
    openDrift(proposal) {
      this.driftProposal = proposal;
      this.driftVisible = true;
    },
    closeDrift() {
      this.driftVisible = false;
      this.driftProposal = null;
    },
    async confirmDrift(proposal) {
      // Operator re-confirmed: a second accept on a `drifted` proposal writes through.
      if (this.busy) return;
      this.busy = true;
      try {
        await POST_AcceptProposal(proposal.id);
        this.notify.spawnNotification({
          type: "positive",
          msg: this.$t("enrichment.review.toast.accepted"),
        });
        this.closeDrift();
        await this.fetchRows();
      } catch (err) {
        this.notify.spawnNotification({
          type: "negative",
          msg: extractApiMessage(err, this.$t("notifications.error")),
        });
      } finally {
        this.busy = false;
      }
    },
    async rejectDrift({ proposal, reason }) {
      this.closeDrift();
      await this.rejectOne({ proposal, reason });
    },
    patchRow(updated) {
      const i = this.rows.findIndex((r) => r.id === updated.id);
      if (i > -1) this.rows.splice(i, 1, updated);
    },
  },
};
</script>

<style lang="scss" scoped>
.enrichment-review {
  display: flex;
  flex-direction: column;
}
.enrichment-review__toolbar {
  flex-shrink: 0;
}
.enrichment-review__body {
  flex: 1;
  overflow: auto;
}
.enrichment-review__search {
  min-width: 180px;
  max-width: 260px;
}
.enrichment-review__batch,
.enrichment-review__confidence {
  max-width: 140px;
}
.enrichment-review__import {
  display: inline-flex;
  align-items: center;
  gap: var(--space-50);
  height: var(--elem-height);
  padding: 0 18px;
  border: none;
  border-radius: var(--radius-sm);
  font-size: var(--fs-200);
  white-space: nowrap;
  flex-shrink: 0;
  cursor: pointer;
}
.enrichment-review__filters-toggle {
  display: inline-flex;
  align-items: center;
  gap: var(--space-50);
  height: var(--elem-height);
  padding: 0 14px;
  border: 1px solid var(--c-basic-400);
  border-radius: var(--radius-sm);
  background-color: var(--c-basic-100);
  color: var(--c-basic-600);
  font-size: var(--fs-200);
  white-space: nowrap;
  flex-shrink: 0;
  cursor: pointer;
  transition: background-color 0.15s ease, border-color 0.15s ease,
    color 0.15s ease;
}
.enrichment-review__filters-toggle:hover,
.enrichment-review__filters-toggle.is-active {
  background-color: var(--c-basic-200);
  border-color: var(--c-basic-500);
  color: var(--c-basic-800);
}
.enrichment-review__filters-badge {
  min-width: 16px;
  height: 16px;
  padding: 0 5px;
  font-size: 10px;
  font-weight: 600;
  line-height: 16px;
  text-align: center;
  border-radius: 50px;
  background-color: var(--c-support-400);
  color: var(--c-basic-100);
}
.enrichment-filters-enter-active,
.enrichment-filters-leave-active {
  transition: opacity 0.15s ease;
}
.enrichment-filters-enter-from,
.enrichment-filters-leave-to {
  opacity: 0;
}
</style>
