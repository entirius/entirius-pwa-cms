<template>
  <div class="p-500 fs-300 t-basic-800 h-100 ov-h">
    <div
      class="bg-basic-100 b-basic-300 br-50 h-100 ovy-auto pl-500 pt-500 pb-500 pr-500"
    >
      <!-- Segment switcher: Discounts / Vouchers -->
      <div class="promo-list__tabs mb-400">
        <SegmentedControl v-model="activeTab" :options="tabOptions" />
      </div>

      <!-- DISCOUNTS tab -->
      <template v-if="activeTab === 'discounts'">
        <!-- Bulk action bar (visible only when selection exists) -->
        <div v-if="hasSelection" class="promo-list__bulk-bar mb-300">
          <span class="promo-list__bulk-count t-basic-700 fw-600">
            {{ $t("promo.bulk_selected", { n: selectionCount }) }}
          </span>
          <div class="promo-list__bulk-actions">
            <BasicButton
              :text="$t('promo.bulk_activate')"
              class="bg-positive-200 t-basic-100"
              @click="startBulk('activate')"
            />
            <BasicButton
              :text="$t('promo.bulk_deactivate')"
              class="bg-basic-200 t-basic-600"
              @click="startBulk('deactivate')"
            />
            <BasicButton
              :text="$t('promo.bulk_delete')"
              icon="trash-can"
              class="bg-negative-100 t-negative-300"
              @click="startBulk('delete')"
            />
            <BasicButton
              :text="$t('promo.bulk_clear')"
              class="bg-basic-200 t-basic-600"
              @click="clearSelection"
            />
          </div>
        </div>

        <!-- Filters toolbar (always visible) -->
        <div class="promo-list__toolbar">
          <BasicInput
            v-model="search"
            :placeholder="$t('common.start_typing')"
            icon="search"
            class="promo-list__search"
            @input="debouncedFetch(searchAndFetch)"
          />
          <MobileFilterPanel
            :active-count="activeFilterCount"
            :trigger-label="$t('builder.filters')"
          >
            <p class="fs-200 t-basic-600">{{ $t("builder.filters") }}</p>
            <FilterChip
              v-for="tab in statusTabs"
              :key="tab.key"
              :label="tab.label"
              :active="statusFilter === tab.key"
              @click="setStatusFilter(tab.key)"
            />
            <Dropdown
              :values="modifierOptions"
              :selected="modifierFilter ? [modifierFilter] : []"
              :placeholder="$t('promo.all_modifiers')"
              class="promo-list__modifier-filter"
              @onSelect="onModifierFilter"
            />
          </MobileFilterPanel>
        </div>

        <!-- Select-all-matching banner -->
        <div
          v-if="pageFullySelected && totalCount > rules.length && !selectAllMatching"
          class="promo-list__select-banner bg-support-100 t-support-400 fs-200 ph-200 pv-100 br-50 mb-300"
        >
          {{ $t("promo.bulk_select_all_page", { n: rules.length }) }}
          <button
            class="promo-list__select-banner-link t-support-400 fw-600"
            @click="selectAllMatching = true"
          >
            {{ $t("promo.bulk_select_all_matching", { total: totalCount }) }}
          </button>
        </div>
        <div
          v-else-if="selectAllMatching"
          class="promo-list__select-banner bg-support-100 t-support-400 fs-200 ph-200 pv-100 br-50 mb-300"
        >
          {{ $t("promo.bulk_all_selected", { total: totalCount }) }}
          <button
            class="promo-list__select-banner-link t-support-400 fw-600"
            @click="clearSelection"
          >
            {{ $t("promo.bulk_clear_selection") }}
          </button>
        </div>

        <Loader v-show="loading" />

        <DataTable
          v-show="!loading"
          :key="tableKey"
          :columns="columns"
          :rows="rules"
          row-key="id"
          :empty-text="$t('promo.no_rules')"
          :sortable="true"
          :selectable="true"
          :multi-select="true"
          @sort="onSort"
          @row-click="onRowClick"
          @select="onSelect"
        >
          <template #cell-name="{ row }">
            <span class="promo-rule-name">{{ row.name }}</span>
          </template>
          <template #cell-modifier="{ row }">
            <span
              class="promo-modifier-badge bg-support-100 t-support-400"
              :title="modifierLabel(row.modifier)"
            >{{ modifierShortLabel(row.modifier) }}</span>
          </template>
          <template #cell-target="{ row }">
            <span class="bg-basic-200 t-basic-600 fs-200 ph-100 br-50 fw-600">{{
              row.target
            }}</span>
          </template>
          <template #cell-code_count="{ row }">
            <span class="bg-basic-200 t-basic-600 fs-200 ph-100 br-50 fw-600">{{
              row.code_count
            }}</span>
          </template>
          <template #cell-is_active="{ row }">
            <StatusBadge
              :label="row.is_active ? $t('promo.active') : $t('promo.inactive')"
              :variant="row.is_active ? 'positive' : 'negative'"
            />
          </template>
          <template #cell-automatic_applications="{ row }">
            <StatusBadge
              v-if="row.automatic_applications"
              :label="$t('promo.automatic')"
              variant="neutral"
            />
            <span v-else class="t-basic-400">—</span>
          </template>
          <template #cell-priority="{ row }">
            <span class="t-basic-600">{{ row.priority }}</span>
          </template>
        </DataTable>

        <Pagination
          v-if="totalCount > pageSize"
          :pagination="paginationState"
          @onChangePage="onPageChange"
        />

        <FloatingActions :actions="fabActions" />

        <!-- Bulk delete confirmation modal -->
        <Confirmation-modal
          :visible="pendingBulkAction === 'delete'"
          @accept="onBulkDeleteAccept"
          @reject="pendingBulkAction = null"
        >
          <template #header>
            <h2>{{ $t("promo.bulk_confirm_delete_title") }}</h2>
          </template>
          <template #description>
            <p>{{ $t("promo.bulk_confirm_delete", { n: selectionCount }) }}</p>
          </template>
        </Confirmation-modal>
      </template>

      <!-- VOUCHERS tab (gated on the checkout_voucher module) -->
      <template v-else-if="activeTab === 'vouchers'">
        <VouchersSection v-if="vouchersEnabled" />
        <div v-else class="promo-vouchers-disabled">
          <EmptyState
            icon="lock"
            :title="$t('promo.vouchers_unavailable_title')"
            :message="$t('promo.vouchers_unavailable')"
          />
        </div>
      </template>
    </div>
  </div>
</template>

<script>
import { useLoaderStore } from "@/stores/loader";
import { useNotifyStore } from "@/stores/notify";
import { useMuninStore } from "@/stores/munin";
import { useCheckoutChannelStore } from "@/stores/checkoutChannel";
import { modifierShortLabel } from "./promo-modifiers";
import { useSearchDebounce } from "@/composables/useSearchDebounce";
import { GET_DiscountRules, GET_DiscountMeta, POST_BulkRules } from "@/api/promo/api";
import ConfirmationModal from "@/functionals/Confirmation-modal/index.vue";
import VouchersSection from "./VouchersSection.vue";
import { extractApiMessage } from "@/composables/useFormErrors";

export default {
  name: "PromoList",
  components: { VouchersSection, ConfirmationModal },
  setup() {
    const loader = useLoaderStore();
    const notify = useNotifyStore();
    const munin = useMuninStore();
    const checkoutChannel = useCheckoutChannelStore();
    const { search, debouncedFetch } = useSearchDebounce();
    return { loader, notify, munin, checkoutChannel, search, debouncedFetch };
  },
  data() {
    return {
      activeTab:
        this.$route.query.tab === "vouchers" ? "vouchers" : "discounts",
      rules: [],
      totalCount: 0,
      currentPage: 1,
      pageSize: 20,
      ordering: null,
      loading: false,
      statusFilter: "all",
      modifierFilter: null,
      modifiers: [],
      targets: [],
      selectedRows: [],
      selectAllMatching: false,
      tableKey: 0,
      pendingBulkAction: null,
    };
  },
  computed: {
    channel() {
      return (
        this.checkoutChannel.activeChannelIdx ||
        process.env.VUE_APP_CHANNEL ||
        "default-local"
      );
    },
    vouchersEnabled() {
      return this.munin.isModuleEnabled("checkout_voucher");
    },
    tabOptions() {
      return [
        { value: "discounts", label: this.$t("promo.tab_discounts") },
        { value: "vouchers", label: this.$t("promo.tab_vouchers") },
      ];
    },
    statusTabs() {
      return [
        { key: "all", label: this.$t("promo.filter_all") },
        { key: "active", label: this.$t("promo.filter_active") },
        { key: "inactive", label: this.$t("promo.filter_inactive") },
      ];
    },
    modifierOptions() {
      const opts = [{ label: this.$t("promo.all_modifiers"), value: null }];
      for (const m of this.modifiers) {
        opts.push({ label: modifierShortLabel(m.value, m.label), value: m.value });
      }
      return opts;
    },
    activeFilterCount() {
      let count = 0;
      if (this.statusFilter !== "all") count++;
      if (this.modifierFilter) count++;
      return count;
    },
    columns() {
      return [
        {
          key: "name",
          label: this.$t("promo.col_name"),
          sortable: true,
          width: "1fr",
        },
        {
          key: "modifier",
          label: this.$t("promo.col_modifier"),
          sortable: false,
          width: "160px",
        },
        {
          key: "target",
          label: this.$t("promo.col_target"),
          sortable: false,
          width: "100px",
        },
        {
          key: "code_count",
          label: this.$t("promo.col_codes"),
          sortable: false,
          width: "80px",
        },
        {
          key: "is_active",
          label: this.$t("promo.col_status"),
          sortable: true,
          width: "100px",
        },
        {
          key: "automatic_applications",
          label: this.$t("promo.col_automatic"),
          sortable: false,
          width: "100px",
        },
        {
          key: "priority",
          label: this.$t("promo.col_priority"),
          sortable: true,
          width: "80px",
        },
      ];
    },
    fabActions() {
      return [
        {
          icon: "plus",
          label: this.$t("promo.create_rule"),
          handler: () => this.$router.push("/promo/create"),
        },
      ];
    },
    paginationState() {
      return {
        page: this.currentPage,
        pages: Math.ceil(this.totalCount / this.pageSize),
      };
    },
    selectedIds() {
      return this.selectedRows.map((r) => r.id);
    },
    selectionCount() {
      return this.selectAllMatching ? this.totalCount : this.selectedIds.length;
    },
    hasSelection() {
      return this.selectionCount > 0;
    },
    pageFullySelected() {
      return this.rules.length > 0 && this.selectedRows.length === this.rules.length;
    },
  },
  watch: {
    "$route.query.page"(newPage) {
      this.currentPage = parseInt(newPage) || 1;
      this.fetchRules();
    },
    activeTab(tab) {
      this.$router
        .replace({ query: { ...this.$route.query, tab } })
        .catch(() => {});
    },
    "checkoutChannel.activeChannelIdx"() {
      this.currentPage = 1;
      this.fetchMeta();
      this.fetchRules();
    },
  },
  mounted() {
    this.currentPage = parseInt(this.$route.query.page) || 1;
    this.fetchMeta();
    this.fetchRules();
  },
  methods: {
    modifierLabel(value) {
      const found = this.modifiers.find((m) => m.value === value);
      return found ? found.label : value;
    },
    modifierShortLabel(value) {
      return modifierShortLabel(value, this.modifierLabel(value));
    },
    async fetchMeta() {
      try {
        const { data } = await GET_DiscountMeta(this.channel);
        this.modifiers = data.modifiers || [];
        this.targets = data.targets || [];
      } catch {
        // Non-critical — modifiers may not label if meta fails
      }
    },
    async fetchRules() {
      this.loading = true;
      try {
        const params = { page: this.currentPage, page_size: this.pageSize };
        if (this.search) params.search = this.search;
        if (this.ordering) params.ordering = this.ordering;
        if (this.statusFilter === "active") params.is_active = true;
        if (this.statusFilter === "inactive") params.is_active = false;
        if (this.modifierFilter) params.modifier = this.modifierFilter;

        const { data } = await GET_DiscountRules(this.channel, params);
        this.rules = data.results || [];
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
    listFilters() {
      const filters = {};
      if (this.search) filters.search = this.search;
      if (this.statusFilter === "active") filters.is_active = true;
      if (this.statusFilter === "inactive") filters.is_active = false;
      if (this.modifierFilter) filters.modifier = this.modifierFilter;
      return filters;
    },
    searchAndFetch() {
      this.currentPage = 1;
      this.fetchRules();
    },
    setStatusFilter(key) {
      this.statusFilter = key;
      this.currentPage = 1;
      this.fetchRules();
    },
    onModifierFilter(val) {
      this.modifierFilter = val;
      this.currentPage = 1;
      this.fetchRules();
    },
    onSort({ key, direction }) {
      const sortable = ["name", "is_active", "priority", "created_at"];
      if (!key || !sortable.includes(key)) {
        this.ordering = null;
      } else {
        this.ordering = direction === "desc" ? `-${key}` : key;
      }
      this.fetchRules();
    },
    onPageChange(page) {
      this.$router.push({
        path: this.$route.path,
        query: { ...this.$route.query, page: String(page) },
      });
    },
    onRowClick(row) {
      this.$router.push(`/promo/${row.id}`);
    },
    onSelect(rows) {
      this.selectedRows = rows;
      if (!this.pageFullySelected) {
        this.selectAllMatching = false;
      }
    },
    clearSelection() {
      this.selectedRows = [];
      this.selectAllMatching = false;
      this.tableKey++;
    },
    startBulk(action) {
      if (action === "delete") {
        this.pendingBulkAction = "delete";
      } else {
        this.performBulk(action);
      }
    },
    onBulkDeleteAccept() {
      this.pendingBulkAction = null;
      this.performBulk("delete");
    },
    async performBulk(action) {
      const body = this.selectAllMatching
        ? { action, all_matching: true, filters: this.listFilters() }
        : { action, ids: this.selectedIds };

      this.loader.loaderStart();
      try {
        const { data } = await POST_BulkRules(this.channel, body);
        const affected = data.affected ?? 0;
        const msgKey = action === "delete" ? "promo.bulk_deleted" : "promo.bulk_done";
        this.notify.spawnNotification({
          type: "positive",
          msg: this.$t(msgKey, { n: affected }),
        });
        this.clearSelection();
        this.currentPage = 1;
        await this.fetchRules();
      } catch (err) {
        this.notify.spawnNotification({
          type: "negative",
          msg: extractApiMessage(err, this.$t("notifications.error")),
        });
      } finally {
        this.loader.loaderFinish();
      }
    },
  },
};
</script>

<style lang="scss" scoped>
.promo-list__tabs {
  display: flex;
  align-items: center;
}

.promo-list__toolbar {
  display: flex;
  align-items: center;
  gap: var(--space-200);
  margin-bottom: var(--space-400);
  flex-wrap: wrap;
}

.promo-list__search {
  flex: 1;
  min-width: 150px;
  max-width: 400px;
}

.promo-list__modifier-filter {
  min-width: 150px;
  max-width: 220px;
  flex-shrink: 0;
}

.promo-list__bulk-bar {
  display: flex;
  align-items: center;
  gap: var(--space-200);
  flex-wrap: wrap;
  padding: var(--space-200);
  background-color: var(--c-basic-200);
  border-radius: var(--radius-sm);
  border: 1px solid var(--c-basic-300);
}

.promo-list__bulk-count {
  font-size: var(--fs-200);
  white-space: nowrap;
}

.promo-list__bulk-actions {
  display: flex;
  gap: var(--space-100);
  flex-wrap: wrap;
}

.promo-list__select-banner {
  display: flex;
  align-items: center;
  gap: var(--space-100);
  flex-wrap: wrap;
}

.promo-list__select-banner-link {
  background: none;
  border: none;
  cursor: pointer;
  padding: 0;
  font-family: inherit;
  font-size: inherit;
  text-decoration: underline;

  &:focus-visible {
    outline: 2px solid var(--c-support-400);
  }
}

.promo-rule-name {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.promo-modifier-badge {
  display: inline-block;
  max-width: 100%;
  padding: 2px 8px;
  border-radius: var(--radius-sm);
  font-size: var(--fs-200);
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  vertical-align: middle;
  cursor: default;
}

.promo-vouchers-disabled {
  opacity: 0.6;
  pointer-events: none;
}
</style>
