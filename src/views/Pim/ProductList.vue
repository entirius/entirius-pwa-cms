<template>
  <div class="pim-list-layout p-500 fs-300 t-basic-800 h-100 ov-h">
    <div
      class="bg-basic-100 b-basic-300 br-50 flex-1 ovy-auto pl-500 pt-500 pb-500 pr-500"
    >
      <div class="flex ai-ct mb-400">
        <h1 class="fs-700 fw-600">{{ $t("pim.products") }}</h1>
      </div>

      <GapStatusAlert v-if="hasQualityData" compact />

      <div class="product-list__toolbar">
        <BasicInput
          v-model="search"
          :placeholder="$t('common.start_typing')"
          icon="search"
          class="product-list__search"
          @input="debouncedFetch(searchAndFetch)"
        />
        <button
          class="product-list__filter-toggle"
          @click="filtersExpanded = !filtersExpanded"
        >
          <FontAwesomeIcon icon="filter" />
          <span v-if="dropdownFilterCount" class="product-list__filter-badge">{{
            dropdownFilterCount
          }}</span>
        </button>
        <button
          v-if="hasQualityData"
          class="product-list__filter-toggle"
          :class="{ 'is-off': hideQualitySensor }"
          :title="$t('pim.quality_hide_sensor')"
          data-test="quality-toggle"
          @click="toggleQualitySensor"
        >
          <FontAwesomeIcon :icon="hideQualitySensor ? 'eye-slash' : 'eye'" />
        </button>
        <div class="flex-1" />
        <span v-if="totalCount > 0" class="fs-200 t-basic-500"
          >{{ totalCount }} {{ $t("pim.products").toLowerCase() }}</span
        >
      </div>

      <div v-show="filtersExpanded" class="product-list__filters">
        <div class="product-list__filter-chips">
          <FilterChip
            v-for="tab in filterTabs"
            :key="tab.key"
            :label="tab.label"
            :active="activeFilter === tab.key"
            @click="setFilter(tab.key)"
          />
        </div>
        <Dropdown
          :values="visibilityOptions"
          :selected="visibilityFilter ? [visibilityFilter] : []"
          :placeholder="$t('pim.all_visibilities')"
          class="product-list__filter-dropdown"
          @onSelect="onVisibilitySelect"
        />
        <Dropdown
          :values="productClassOptions"
          :selected="productClassFilter ? [productClassFilter] : []"
          :placeholder="$t('pim.all_classes')"
          class="product-list__filter-dropdown"
          @onSelect="onProductClassSelect"
        />
        <Dropdown
          :values="categoryOptions"
          :selected="categoryFilter ? [categoryFilter] : []"
          :placeholder="$t('pim.all_categories')"
          class="product-list__filter-dropdown"
          @onSelect="onCategorySelect"
        />
        <Dropdown
          v-for="feat in filterableFeatures"
          :key="feat.idx"
          :values="featureFilterOptions(feat)"
          :selected="
            attributeFilters[feat.idx] ? [attributeFilters[feat.idx]] : []
          "
          :placeholder="feat.name"
          class="product-list__filter-dropdown"
          @onSelect="(val) => onAttributeFilter(feat.idx, val)"
        />
        <template v-if="hasQualityData">
          <span class="product-list__quality-filter-label t-basic-500 fs-200">
            {{ $t("pim.quality_filter_label") }}
          </span>
          <FilterChip
            :label="$t('pim.quality_only_critical')"
            :title="$t('pim.quality_only_critical_hint')"
            :active="gapSeverityFilter === 'critical'"
            data-test="quality-only-critical"
            @click="toggleOnlyCritical"
          />
          <FilterChip
            :label="$t('pim.quality_only_source')"
            :title="$t('pim.quality_only_source_hint')"
            :active="onlySourceGaps"
            data-test="quality-only-source"
            @click="toggleOnlySource"
          />
        </template>
        <button
          v-if="dropdownFilterCount"
          class="product-list__clear-filters"
          @click="clearAllDropdownFilters"
        >
          {{ $t("pim.clear_filters") }}
        </button>
      </div>

      <BulkActionBar
        v-if="selectedProducts.length"
        :count="selectedProducts.length"
        selected-label-key="pim.products_selected"
        clear-label-key="pim.clear_selection"
        :actions="bulkActions"
        @action="handleBulkAction"
        @clear="clearSelection"
      />

      <Loader v-show="loading" />

      <DataTable
        v-show="!loading"
        :columns="columns"
        :rows="products"
        :sortable="true"
        :selectable="true"
        :multi-select="true"
        row-key="sku"
        :empty-text="$t('pim.no_products')"
        @sort="onSort"
        @select="onSelect"
        @row-click="onRowClick"
      >
        <template #cell-thumbnail="{ row }">
          <div class="product-thumb">
            <img
              v-if="row.thumbnail_url"
              :src="mediaUrl(row.thumbnail_url)"
              :alt="row.name || row.sku"
              class="product-thumb__img"
            />
            <FontAwesomeIcon
              v-else
              icon="image"
              class="product-thumb__placeholder t-basic-400"
            />
          </div>
        </template>
        <template #cell-name="{ row }">
          {{ row.name || row.sku }}
        </template>
        <template #cell-product_class_name="{ row }">
          <span
            v-if="row.product_class_name"
            class="chip"
            :class="productClassBadge(row.product_class_name)"
          >
            {{ productClassLabel(row.product_class_name) }}
          </span>
          <span v-else class="t-basic-400">---</span>
        </template>
        <template #cell-is_enabled="{ value }">
          <StatusBadge
            :label="value ? $t('pim.enabled') : $t('pim.disabled')"
            :variant="value ? 'positive' : 'negative'"
          />
        </template>
        <template #cell-supplier_status="{ row }">
          <span
            v-if="supplierStatusMap[row.sku]?.unseen_count > 0"
            class="product-list__supplier-badge"
            role="button"
            tabindex="0"
            :title="$t('pim.badge_updated_title')"
            @click.stop="onSupplierBadgeClick(row.sku)"
            @keydown.enter.stop.prevent="onSupplierBadgeClick(row.sku)"
          >
            <StatusBadge :label="$t('pim.badge_updated')" variant="warning" />
          </span>
        </template>
        <template #cell-quality="{ row }">
          <div class="product-list__quality" data-test="quality-cell">
            <button
              v-if="qualityState(row) === 'gaps' && (!qualityFilterActive || qualityFindings(row).length)"
              type="button"
              class="product-list__quality-toggle"
              :aria-expanded="qualityPopover.pk === String(row.pk)"
              :title="$t('pim.quality_show_details')"
              data-test="quality-toggle-row"
              @click.stop="toggleQualityPopover(row, $event)"
            >
              <StatusBadge
                :label="String(qualityFilterActive ? qualityFindings(row).length : row.gap_count)"
                :variant="qualityVariant(row)"
              />
              <FontAwesomeIcon
                :icon="qualityPopover.pk === String(row.pk) ? 'chevron-up' : 'chevron-down'"
                class="product-list__quality-caret fs-100 t-basic-500"
              />
            </button>
            <StatusBadge
              v-else-if="qualityState(row) === 'unevaluated'"
              :label="$t('pim.quality_unevaluated')"
              variant="neutral"
            />
            <span v-else class="t-basic-400 fs-200">{{ $t("pim.quality_ok") }}</span>
          </div>
        </template>
      </DataTable>

      <FloatingActions :actions="fabActions" />
    </div>
    <Pagination
      v-if="totalCount > pageSize"
      :pagination="paginationState"
      class="mt-200"
      @onChangePage="onPageChange"
    />

    <TranslateDialog
      :visible="showTranslateDialog"
      :channelIdx="channelIdx"
      entityType="product"
      :entityIds="translateEntityIds"
      :title="translateDialogTitle"
      @close="showTranslateDialog = false"
      @translated="showTranslateDialog = false"
    />

    <SpawnDialog
      :visible="showSpawnDialog"
      :skus="spawnSkus"
      :filter-params="spawnFilterParams"
      @close="showSpawnDialog = false"
      @spawned="onSpawned"
    />

    <!-- Quality findings bubble — floats over the table (teleported to body) so revealing
         details never reflows the row. Closed by clicking elsewhere or scrolling. -->
    <Teleport to="body">
      <div
        v-if="qualityPopover.pk"
        class="quality-popover bg-basic-100 b-basic-300 ba-100"
        :style="{ top: qualityPopover.top + 'px', left: qualityPopover.left + 'px' }"
        data-test="quality-popover"
        @click.stop
      >
        <ul class="product-list__gaps">
          <li
            v-for="(f, i) in (qualityMap[qualityPopover.pk] || [])"
            :key="i"
            class="product-list__gap"
          >
            <span class="product-list__gap-label">{{ gapLabel(f) }}</span>
            <span v-if="f.language" class="product-list__gap-lang">{{
              f.language
            }}</span>
            <span v-if="f.inherited" class="product-list__gap-inherited t-basic-500">
              {{ $t("pim.quality_fix_on", { channel: f.source_channel }) }}
            </span>
          </li>
        </ul>
      </div>
    </Teleport>
  </div>
</template>

<script>
import { useLoaderStore } from "@/stores/loader";
import { useNotifyStore } from "@/stores/notify";
import { usePimChannelStore } from "@/stores/pimChannel";
import { useMuninStore } from "@/stores/munin";
import { useSearchDebounce } from "@/composables/useSearchDebounce";
import {
  GET_Products,
  POST_BulkUpdateProducts,
  GET_Categories,
  GET_Features,
  GET_FeatureAttributes,
  GET_BulkProductGaps,
} from "@/api/pim/api";
import { GET_BulkHasChanges } from "@/api/suppliers/api";
import { getLang } from "@/i18n";
import {
  gapBadgeVariant,
  gapRowState,
  hasQualityFields,
  resolveGapLabel,
  findingsParams,
} from "./quality";
import SpawnDialog from "./components/enrichment/SpawnDialog.vue";
import GapStatusAlert from "./components/GapStatusAlert.vue";
import TranslateDialog from "./components/TranslateDialog.vue";
import { extractApiMessage } from "@/composables/useFormErrors";

const HIDE_QUALITY_KEY = "pim_hide_quality_sensor";

function readHideQualitySensor() {
  try {
    return localStorage.getItem(HIDE_QUALITY_KEY) === "1";
  } catch {
    return false;
  }
}

export default {
  name: "ProductList",
  components: { SpawnDialog, GapStatusAlert, TranslateDialog },
  setup() {
    const loader = useLoaderStore();
    const notify = useNotifyStore();
    const pimChannel = usePimChannelStore();
    const munin = useMuninStore();
    const { search, debouncedFetch } = useSearchDebounce();
    return { loader, notify, pimChannel, munin, search, debouncedFetch };
  },
  data() {
    return {
      products: [],
      totalCount: 0,
      currentPage: 1,
      pageSize: 20,
      ordering: null,
      selectedProducts: [],
      loading: false,
      activeFilter: "all",
      visibilityFilter: null,
      productClassFilter: null,
      categoryFilter: null,
      categories: [],
      filterableFeatures: [],
      attributeFilters: {},
      filtersExpanded: false,
      showTranslateDialog: false,
      translateEntityIds: null,
      translateDialogTitle: "",
      supplierStatusMap: {},
      qualityMap: {},
      qualityPopover: { pk: null, top: 0, left: 0 },
      hasQualityData: false,
      hideQualitySensor: readHideQualitySensor(),
      gapSeverityFilter: null,
      onlySourceGaps: false,
      showSpawnDialog: false,
      spawnSkus: [],
      spawnFilterParams: {},
    };
  },
  computed: {
    channelIdx() {
      return this.pimChannel.activeChannelIdx;
    },
    translatorAvailable() {
      return this.munin.isModuleInstalled("pim_translator");
    },
    hasSuppliersPanel() {
      return this.munin.isPanelEnabled("suppliers");
    },
    hasEnricherPanel() {
      return this.munin.isPanelEnabled("enricher");
    },
    showQualityColumn() {
      return this.hasQualityData && !this.hideQualitySensor;
    },
    qualityFilterActive() {
      // A findings-level filter is engaged → badge count must reflect the filtered
      // findings, not the unfiltered row rollup (gap_count).
      return !!(this.gapSeverityFilter || this.onlySourceGaps);
    },
    fabActions() {
      return [
        {
          icon: "plus",
          label: this.$t("pim.create_product"),
          handler: () => this.$router.push("/pim/products/create"),
        },
      ];
    },
    filterTabs() {
      return [
        { key: "all", label: this.$t("pim.filter_all") },
        { key: "enabled", label: this.$t("pim.filter_enabled") },
        { key: "disabled", label: this.$t("pim.filter_disabled") },
        { key: "no_media", label: this.$t("pim.filter_no_media") },
      ];
    },
    bulkActions() {
      const actions = [
        {
          key: "enable",
          labelKey: "pim.enable_all",
          buttonClass: "bg-positive-200 t-basic-100",
        },
        {
          key: "disable",
          labelKey: "pim.disable_all",
          buttonClass: "bg-negative-200 t-basic-100",
        },
        {
          key: "visibility",
          labelKey: "pim.change_visibility",
          options: [
            { label: this.$t("pim.vis_catalog_search"), value: 4 },
            { label: this.$t("pim.vis_not_visible"), value: 1 },
            { label: this.$t("pim.vis_catalog"), value: 2 },
            { label: this.$t("pim.vis_search"), value: 3 },
          ],
        },
      ];
      if (this.hasEnricherPanel) {
        actions.push({
          key: "send_to_enrichment",
          labelKey: "enrichment.spawn.send_selected",
          buttonClass: "bg-support-100 t-support-400",
        });
      }
      if (this.translatorAvailable) {
        actions.push({
          key: "translate",
          labelKey: "pim.translate",
          buttonClass: "bg-support-400 t-basic-100",
        });
      }
      return actions;
    },
    columns() {
      const cols = [
        { key: "thumbnail", label: "", sortable: false, width: "60px" },
        { key: "sku", label: "SKU", sortable: true, width: "1fr" },
        {
          key: "name",
          label: this.$t("pim.name"),
          sortable: false,
          width: "2fr",
        },
        {
          key: "product_class_name",
          label: this.$t("pim.product_class"),
          sortable: false,
          width: "120px",
        },
        {
          key: "visibility",
          label: this.$t("pim.visibility"),
          sortable: true,
          width: "1fr",
        },
        {
          key: "is_enabled",
          label: this.$t("pim.status"),
          sortable: true,
          width: "100px",
        },
      ];
      if (this.showQualityColumn) {
        cols.push({
          key: "quality",
          label: this.$t("pim.quality_column"),
          sortable: true,
          width: "220px",
        });
      }
      if (this.hasSuppliersPanel) {
        cols.push({
          key: "supplier_status",
          label: this.$t("pim.tab_supplier"),
          sortable: false,
          width: "110px",
        });
      }
      return cols;
    },
    visibilityOptions() {
      return [
        { value: null, label: this.$t("pim.all_visibilities") },
        { value: 1, label: this.$t("pim.vis_not_visible") },
        { value: 2, label: this.$t("pim.vis_catalog") },
        { value: 3, label: this.$t("pim.vis_search") },
        { value: 4, label: this.$t("pim.vis_catalog_search") },
      ];
    },
    productClassOptions() {
      return [
        { value: null, label: this.$t("pim.all_classes") },
        { value: 1, label: this.$t("pim.type_simple") },
        { value: 2, label: this.$t("pim.type_configurable") },
        { value: 3, label: this.$t("pim.type_bundle") },
      ];
    },
    categoryOptions() {
      return [
        { value: null, label: this.$t("pim.all_categories") },
        ...this.categories.map((c) => ({ value: c.idx, label: c.name })),
      ];
    },
    dropdownFilterCount() {
      let count = Object.keys(this.attributeFilters).length;
      if (this.activeFilter !== "all") count++;
      if (this.visibilityFilter) count++;
      if (this.productClassFilter) count++;
      if (this.categoryFilter) count++;
      if (this.gapSeverityFilter) count++;
      if (this.onlySourceGaps) count++;
      return count;
    },
    paginationState() {
      return {
        page: this.currentPage,
        pages: Math.ceil(this.totalCount / this.pageSize),
      };
    },
  },
  watch: {
    "pimChannel.activeChannelIdx"() {
      this.attributeFilters = {};
      this.fetchCategories();
      this.fetchFilterableFeatures();
      this.fetchProducts();
    },
    "$route.query.page"(newPage) {
      this.currentPage = parseInt(newPage) || 1;
      this.fetchProducts();
    },
  },
  mounted() {
    this.currentPage = parseInt(this.$route.query.page) || 1;
    this.fetchCategories();
    this.fetchFilterableFeatures();
    this.fetchProducts();
  },
  beforeUnmount() {
    this.closeQualityPopover();
  },
  methods: {
    async fetchProducts() {
      this.loading = true;
      try {
        const params = { page: this.currentPage, page_size: this.pageSize };
        if (this.search) params.search = this.search;
        if (this.ordering) params.ordering = this.ordering;

        if (this.activeFilter === "enabled") {
          params.is_enabled = true;
        } else if (this.activeFilter === "disabled") {
          params.is_enabled = false;
        } else if (this.activeFilter === "no_media") {
          params.has_media = false;
        }

        if (this.visibilityFilter) params.visibility = this.visibilityFilter;
        if (this.productClassFilter)
          params.product_class = this.productClassFilter;
        if (this.categoryFilter) params.category = this.categoryFilter;
        if (this.gapSeverityFilter) params.gap_severity = this.gapSeverityFilter;

        for (const [featureIdx, attrIdx] of Object.entries(
          this.attributeFilters
        )) {
          params[`attr_${featureIdx}`] = attrIdx;
        }

        const { data } = await GET_Products(this.channelIdx, params);
        this.products = data.results || [];
        this.totalCount = data.count || 0;
        this.hasQualityData = this.products.some(hasQualityFields);
        this.fetchSupplierStatuses();
        this.fetchQualityFindings();
      } catch (err) {
        this.notify.spawnNotification({
          type: "negative",
          msg: extractApiMessage(err, this.$t("notifications.error")),
        });
      } finally {
        this.loading = false;
      }
    },
    async fetchCategories() {
      try {
        const { data } = await GET_Categories(this.channelIdx, {
          page_size: 100,
        });
        this.categories = data.results || [];
      } catch {
        this.categories = [];
      }
    },
    async fetchFilterableFeatures() {
      try {
        const { data } = await GET_Features(
          { is_filterable: true, page_size: 50 },
          this.channelIdx
        );
        const selectFeatures = (data.results || []).filter(
          (f) => f.feature_type === 7 || f.feature_type === 8
        );
        const features = [];
        for (const feat of selectFeatures) {
          try {
            const { data: attrData } = await GET_FeatureAttributes(
              feat.idx,
              this.channelIdx
            );
            features.push({
              idx: feat.idx,
              name: feat.name || feat.idx,
              attributes: (attrData.results || attrData || []).map((a) => ({
                idx: a.idx,
                name: a.name || a.idx,
              })),
            });
          } catch {
            // skip features whose attributes can't be loaded
          }
        }
        this.filterableFeatures = features;
      } catch {
        this.filterableFeatures = [];
      }
    },
    featureFilterOptions(feat) {
      return [
        { label: this.$t("pim.filter_all"), value: null },
        ...feat.attributes.map((a) => ({ label: a.name, value: a.idx })),
      ];
    },
    onVisibilitySelect(val) {
      this.visibilityFilter = val;
      this.currentPage = 1;
      this.fetchProducts();
    },
    onProductClassSelect(val) {
      this.productClassFilter = val;
      this.currentPage = 1;
      this.fetchProducts();
    },
    onCategorySelect(val) {
      this.categoryFilter = val;
      this.currentPage = 1;
      this.fetchProducts();
    },
    onAttributeFilter(featureIdx, val) {
      if (val) {
        this.attributeFilters = { ...this.attributeFilters, [featureIdx]: val };
      } else {
        const { [featureIdx]: _, ...rest } = this.attributeFilters;
        this.attributeFilters = rest;
      }
      this.currentPage = 1;
      this.fetchProducts();
    },
    clearAllDropdownFilters() {
      this.activeFilter = "all";
      this.visibilityFilter = null;
      this.productClassFilter = null;
      this.categoryFilter = null;
      this.attributeFilters = {};
      this.gapSeverityFilter = null;
      this.onlySourceGaps = false;
      this.currentPage = 1;
      this.fetchProducts();
    },
    setFilter(key) {
      this.activeFilter = key;
      this.currentPage = 1;
      this.fetchProducts();
    },
    searchAndFetch() {
      this.currentPage = 1;
      this.fetchProducts();
    },
    onSort({ key, direction }) {
      if (
        !key ||
        key === "thumbnail" ||
        key === "product_class_name" ||
        key === "name"
      ) {
        this.ordering = null;
      } else if (key === "quality") {
        // List sorts on the rollup column, not the synthetic "quality" key.
        this.ordering = direction === "desc" ? "-gap_worst_severity" : "gap_worst_severity";
      } else {
        this.ordering = direction === "desc" ? `-${key}` : key;
      }
      this.fetchProducts();
    },
    onPageChange(page) {
      this.$router.push({
        path: this.$route.path,
        query: { ...this.$route.query, page: String(page) },
      });
    },
    onSelect(selected) {
      this.selectedProducts = selected;
    },
    onRowClick(row) {
      this.$router.push(`/pim/products/${row.sku}`);
    },
    async fetchSupplierStatuses() {
      if (!this.hasSuppliersPanel || !this.products.length) {
        this.supplierStatusMap = {};
        return;
      }
      const skus = this.products.map((p) => p.sku).filter(Boolean);
      if (!skus.length) return;
      try {
        const { data } = await GET_BulkHasChanges(skus);
        this.supplierStatusMap = data?.skus || {};
      } catch {
        this.supplierStatusMap = {};
      }
    },
    onSupplierBadgeClick(sku) {
      this.$router.push(`/pim/products/${sku}#supplier`);
    },
    async fetchQualityFindings() {
      if (!this.hasQualityData || !this.products.length || this.hideQualitySensor) {
        this.qualityMap = {};
        return;
      }
      const pks = this.products.map((p) => p.pk).filter((pk) => pk != null);
      if (!pks.length) {
        this.qualityMap = {};
        return;
      }
      try {
        const { data } = await GET_BulkProductGaps(
          this.channelIdx,
          pks,
          findingsParams({
            severity: this.gapSeverityFilter,
            onlySource: this.onlySourceGaps,
          })
        );
        this.qualityMap = data?.results || {};
      } catch {
        // Soft-compat: old PIM has no findings endpoint (404) → no inline labels, no error.
        this.qualityMap = {};
      }
    },
    toggleQualitySensor() {
      this.hideQualitySensor = !this.hideQualitySensor;
      try {
        localStorage.setItem(HIDE_QUALITY_KEY, this.hideQualitySensor ? "1" : "0");
      } catch {
        // storage unavailable (private mode) — toggle still works for the session
      }
      if (!this.hideQualitySensor) this.fetchQualityFindings();
    },
    toggleOnlyCritical() {
      this.gapSeverityFilter = this.gapSeverityFilter === "critical" ? null : "critical";
      this.currentPage = 1;
      this.fetchProducts();
    },
    toggleOnlySource() {
      // Affects inline labels only (no list-level backend param) — re-hydrate findings.
      this.onlySourceGaps = !this.onlySourceGaps;
      this.fetchQualityFindings();
    },
    qualityState(row) {
      return gapRowState(row);
    },
    qualityVariant(row) {
      return gapBadgeVariant(row.gap_worst_severity);
    },
    qualityFindings(row) {
      return this.qualityMap[String(row.pk)] || [];
    },
    // The cell shows only the gap-count badge; clicking it pops a bubble with the findings,
    // positioned from the badge's viewport rect (fixed, teleported) so the row never reflows.
    toggleQualityPopover(row, event) {
      const key = String(row.pk);
      if (this.qualityPopover.pk === key) {
        this.closeQualityPopover();
        return;
      }
      const rect = event.currentTarget.getBoundingClientRect();
      const left = Math.min(rect.left, window.innerWidth - 248);
      this.qualityPopover = { pk: key, top: rect.bottom + 4, left: Math.max(8, left) };
      window.addEventListener("click", this.closeQualityPopover);
      window.addEventListener("scroll", this.closeQualityPopover, true);
    },
    closeQualityPopover() {
      if (!this.qualityPopover.pk) return;
      this.qualityPopover = { pk: null, top: 0, left: 0 };
      window.removeEventListener("click", this.closeQualityPopover);
      window.removeEventListener("scroll", this.closeQualityPopover, true);
    },
    gapLabel(finding) {
      return resolveGapLabel(finding, getLang());
    },
    clearSelection() {
      this.selectedProducts = [];
    },
    openTranslateSelected() {
      this.translateEntityIds = this.selectedProducts.map((p) => p.id);
      this.translateDialogTitle = this.$t("pim.translate_selected", {
        count: this.selectedProducts.length,
      });
      this.showTranslateDialog = true;
    },
    handleBulkAction(actionKey, value) {
      if (actionKey === "translate") return this.openTranslateSelected();
      if (actionKey === "enable") return this.doBulkUpdate({ is_enabled: true });
      if (actionKey === "disable") return this.doBulkUpdate({ is_enabled: false });
      if (actionKey === "visibility") return this.doBulkUpdate({ visibility: value });
      if (actionKey === "send_to_enrichment") return this.openSpawnDialog();
    },
    // Filter snapshot mirrors fetchProducts() so the spawn dialog can offer a
    // "send all matching current filter" scope (scope_spec mode:filter).
    currentFilterParams() {
      const params = {};
      if (this.search) params.search = this.search;
      if (this.activeFilter === "enabled") params.is_enabled = true;
      else if (this.activeFilter === "disabled") params.is_enabled = false;
      else if (this.activeFilter === "no_media") params.has_media = false;
      if (this.visibilityFilter) params.visibility = this.visibilityFilter;
      if (this.productClassFilter) params.product_class = this.productClassFilter;
      if (this.categoryFilter) params.category = this.categoryFilter;
      for (const [featureIdx, attrIdx] of Object.entries(this.attributeFilters)) {
        params[`attr_${featureIdx}`] = attrIdx;
      }
      return params;
    },
    openSpawnDialog() {
      this.spawnSkus = this.selectedProducts.map((p) => p.sku);
      this.spawnFilterParams = this.currentFilterParams();
      this.showSpawnDialog = true;
    },
    onSpawned() {
      this.selectedProducts = [];
    },
    async doBulkUpdate(fields) {
      const skus = this.selectedProducts.map((p) => p.sku);
      this.loader.loaderStart();
      try {
        await POST_BulkUpdateProducts(this.channelIdx, { skus, ...fields });
        this.notify.spawnNotification({
          type: "positive",
          msg: this.$t("pim.bulk_success", { count: skus.length }),
        });
        this.selectedProducts = [];
        await this.fetchProducts();
      } catch (err) {
        this.notify.spawnNotification({
          type: "negative",
          msg: extractApiMessage(err, this.$t("notifications.error")),
        });
      } finally {
        this.loader.loaderFinish();
      }
    },
    mediaUrl(path) {
      if (!path) return "";
      if (path.startsWith("http")) return path;
      return (process.env.VUE_APP_API_URL || "") + path;
    },
    productClassLabel(name) {
      // etap-12 #24: ProductBase rows previously fell through to "Custom" via missing key.
      const map = {
        productbase: this.$t("pim.type_base"),
        productsimple: this.$t("pim.type_simple"),
        productconfigurable: this.$t("pim.type_configurable"),
        productbundle: this.$t("pim.type_bundle"),
      };
      return map[name?.toLowerCase()] || this.$t("pim.type_custom");
    },
    productClassBadge(name) {
      const map = {
        productbase: "bg-basic-200 t-basic-600",
        productsimple: "bg-support-100 t-support-400",
        productconfigurable: "bg-primary-100 t-primary-300",
        productbundle: "bg-warning-100 t-warning-300",
      };
      return map[name?.toLowerCase()] || "bg-basic-200 t-basic-600";
    },
  },
};
</script>

<style lang="scss" scoped>
.pim-list-layout {
  display: flex;
  flex-direction: column;
}
.product-list__toolbar {
  display: flex;
  align-items: center;
  gap: var(--space-200);
  margin-bottom: var(--space-400);
  flex-wrap: wrap;
}
.product-list__search {
  flex: 0 1 300px;
  min-width: 150px;
}
.product-list__filter-toggle {
  display: flex;
  align-items: center;
  gap: 6px;
  position: relative;
  padding: 0 12px;
  height: var(--elem-height);
  border: 1px solid var(--c-basic-300);
  border-radius: var(--radius-md);
  background: var(--c-basic-100);
  color: var(--c-basic-700);
  cursor: pointer;
  font-size: var(--fs-300);

  &:hover {
    background: var(--c-basic-200);
  }
}

.product-list__filter-badge {
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  border-radius: 9px;
  background: var(--c-primary-200);
  color: var(--c-basic-100);
  font-size: 11px;
  font-weight: 600;
}

.product-list__filters {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-200);
  margin-bottom: var(--space-400);
  padding: var(--space-300);
  background: var(--c-basic-200);
  border-radius: var(--radius-md);
}

.product-list__filter-chips {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-100);
  flex-basis: 100%;
}

.product-list__filter-dropdown {
  flex: 0 0 auto;
  min-width: 140px;
  max-width: 200px;
}

.product-list__clear-filters {
  display: flex;
  align-items: center;
  padding: 0 12px;
  height: var(--elem-height);
  border: none;
  border-radius: var(--radius-md);
  background: none;
  color: var(--c-negative-300);
  cursor: pointer;
  font-size: var(--fs-200);
  font-weight: 600;

  &:hover {
    background: var(--c-negative-100);
  }
}

@media only screen and (max-width: 768px) {
  .product-list__filters {
    flex-direction: column;
    max-height: 50vh;
    overflow-y: auto;
  }

  .product-list__filter-dropdown {
    max-width: none;
  }
}

.product-list__supplier-badge {
  display: inline-flex;
  cursor: pointer;
  outline: none;

  &:focus-visible {
    box-shadow: 0 0 0 2px var(--c-primary-200);
    border-radius: var(--radius-sm);
  }
}

.product-list__filter-toggle.is-off {
  color: var(--c-basic-400);
}

.product-list__quality {
  display: flex;
  flex-direction: column;
  gap: var(--space-50);
}

.product-list__quality-toggle {
  display: inline-flex;
  align-items: center;
  gap: var(--space-50);
  padding: 0;
  border: none;
  background: none;
  cursor: pointer;
  align-self: flex-start;
}

.product-list__quality-caret {
  transition: transform 0.15s ease;
}

.product-list__quality-filter-label {
  align-self: center;
  margin-left: var(--space-100);
  white-space: nowrap;
}

.quality-popover {
  position: fixed;
  z-index: 1000;
  min-width: 180px;
  max-width: 240px;
  padding: var(--space-200);
  border-radius: var(--radius-sm);
  box-shadow: var(--shadow-md);
}

.product-list__gaps {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-50);
}

.product-list__gap {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-50);
  font-size: var(--fs-200);
}

.product-list__gap-label {
  color: var(--c-basic-700);
}

.product-list__gap-lang {
  padding: 0 6px;
  border-radius: var(--radius-sm);
  background: var(--c-basic-200);
  color: var(--c-basic-600);
  font-size: 11px;
  text-transform: uppercase;
}

.product-list__gap-inherited {
  font-style: italic;
}

.product-thumb {
  width: 40px;
  height: 40px;
  border-radius: 4px;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--c-basic-200);

  &__img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  &__placeholder {
    font-size: 14px;
  }
}
</style>
