<template>
  <div class="page-pad fs-300 t-body h-100 ov-h">
    <Teleport to="#stock-toolbar-right" defer>
      <span
        v-if="dirtyCount > 0 && isManual"
        class="bg-warning-subtle t-warning fs-200 ph-2 rounded"
      >
        {{ $t("stock.unsaved") }}: {{ dirtyCount }}
      </span>
      <BasicButton
        v-if="isManual"
        :text="$t('stock.import_csv')"
        class="btn-outline"
        @click="showImportModal = true"
      />
      <BasicButton
        v-if="isManual"
        :text="$t('stock.save_all')"
        class="btn-primary"
        :disabled="dirtyCount === 0"
        @click="saveAll"
      />
    </Teleport>

    <!-- Integration warning -->
    <div
      v-if="!isManual"
      class="flex ai-ct gap-5 mb-8 p-8 bg-accent-subtle rounded t-strong fs-200"
    >
      <FontAwesomeIcon :icon="$icons.lock" />
      <span>{{ $t("stock.integration_readonly") }}</span>
    </div>

    <div class="page-card h-100 ovy-auto">
      <!-- Toolbar: search + filter chips -->
      <div class="stock-table__toolbar">
        <BasicInput
          v-model="search"
          :placeholder="$t('stock.search_sku')"
          icon="search"
          class="stock-table__search"
          @input="onSearch"
        />
        <FilterChip
          :label="$t('stock.filter_all')"
          :active="activeFilter === 'all'"
          @click="setFilter('all')"
        />
        <FilterChip
          :label="$t('stock.filter_with_stock')"
          :active="activeFilter === 'with_stock'"
          @click="setFilter('with_stock')"
        />
        <FilterChip
          :label="$t('stock.filter_no_stock')"
          :active="activeFilter === 'no_stock'"
          @click="setFilter('no_stock')"
        />
      </div>

      <!-- Table -->
      <div v-if="loading" class="flex-center pv-12">
        <Loader />
      </div>

      <div v-else-if="rows.length === 0" class="pv-12">
        <EmptyState :title="$t('stock.no_stock')" icon="boxes-stacked" />
      </div>

      <div v-else class="table-scroll">
        <table class="table-basic stock-table">
          <thead>
            <tr>
              <th class="stock-table__col-sku">{{ $t("stock.sku") }}</th>
              <th class="stock-table__col-qty">{{ $t("stock.quantity") }}</th>
              <th class="stock-table__col-dispatch">{{ $t("stock.dispatch_time") }}</th>
              <th class="stock-table__col-status">{{ $t("stock.status") }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in rows" :key="item.sku">
              <td class="stock-table__col-sku" :class="{ 't-negative': item.has_stock && item.quantity === 0 }">
                {{ item.sku }}
              </td>
              <td class="stock-table__col-qty">
                <NumberInput
                  v-if="isManual"
                  :modelValue="getDisplayQty(item)"
                  :min="0"
                  @update:modelValue="(val) => onQtyChange(item.sku, val, item)"
                />
                <span v-else>{{ item.has_stock ? item.quantity : '—' }}</span>
              </td>
              <td class="stock-table__col-dispatch">
                <span v-if="item.dispatch_resolved != null">
                  {{ $t("stock.dispatch_hours", { hours: item.dispatch_resolved }) }}
                </span>
                <span v-else class="t-muted fs-200">—</span>
              </td>
              <td class="stock-table__col-status">
                <StatusBadge v-if="isDirty(item.sku)" :label="$t('stock.unsaved')" variant="warning" />
                <StatusBadge v-else-if="!item.has_stock" :label="$t('stock.no_stock_label')" variant="neutral" />
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Pagination -->
      <div v-if="totalCount > pageSize" class="mt-8">
        <Pagination
          :current="currentPage"
          :total="totalCount"
          :perPage="pageSize"
          @change="onPageChange"
        />
      </div>
    </div>

    <!-- CSV Import Modal -->
    <ImportCSVModal
      v-if="showImportModal"
      :warehouseCode="warehouse?.code"
      @close="showImportModal = false"
      @imported="onCsvImported"
    />
  </div>
</template>

<script>
import { useLoaderStore } from "@/stores/loader"
import { useNotifyStore } from "@/stores/notify"
import { useFormErrors, extractApiMessage } from "@/composables/useFormErrors"
import { GET_WarehouseProducts, PATCH_WarehouseStock } from "@/api/stock/api"
import ImportCSVModal from "./ImportCSVModal.vue"

export default {
  name: "WarehouseStockTable",
  components: { ImportCSVModal },
  inject: ["activeWarehouse"],
  setup() {
    const loader = useLoaderStore()
    const notify = useNotifyStore()
    const formErrors = useFormErrors()
    return { loader, notify, formErrors }
  },
  data() {
    return {
      products: [],
      totalCount: 0,
      currentPage: 1,
      pageSize: 50,
      loading: false,
      dirtyItems: {},
      activeFilter: "all",
      search: "",
      showImportModal: false,
      _debounceTimer: null,
    }
  },
  computed: {
    warehouse() {
      return this.activeWarehouse()
    },
    isManual() {
      return this.warehouse?.source_type === "manual"
    },
    dirtyCount() {
      return Object.keys(this.dirtyItems).length
    },
    rows() {
      return this.products
    },
  },
  watch: {
    warehouse: {
      handler(newVal) {
        if (newVal) {
          this.dirtyItems = {}
          this.currentPage = 1
          this.activeFilter = "all"
          this.fetchProducts()
        }
      },
      immediate: true,
    },
  },
  methods: {
    async fetchProducts() {
      if (!this.warehouse) return
      this.loading = true
      try {
        const params = { page: this.currentPage, page_size: this.pageSize }
        if (this.search) params.search = this.search
        if (this.activeFilter === "with_stock") params.has_stock = "true"
        if (this.activeFilter === "no_stock") params.has_stock = "false"

        const { data } = await GET_WarehouseProducts(this.warehouse.code, params)
        this.products = data.results || []
        this.totalCount = data.count || 0
      } catch (err) {
        this.notify.spawnNotification({
          type: "negative",
          msg: extractApiMessage(err, this.$t("notifications.error")),
        })
      } finally {
        this.loading = false
      }
    },
    getDisplayQty(item) {
      if (item.sku in this.dirtyItems) return this.dirtyItems[item.sku]
      return item.has_stock ? item.quantity : 0
    },
    isDirty(sku) {
      return sku in this.dirtyItems
    },
    onQtyChange(sku, value, item) {
      const originalQty = item.has_stock ? item.quantity : null
      if (originalQty === value) {
        delete this.dirtyItems[sku]
      } else {
        this.dirtyItems[sku] = value
      }
      this.dirtyItems = { ...this.dirtyItems }
    },
    setFilter(filter) {
      this.activeFilter = filter
      this.currentPage = 1
      this.dirtyItems = {}
      this.fetchProducts()
    },
    onSearch() {
      clearTimeout(this._debounceTimer)
      this._debounceTimer = setTimeout(() => {
        this.currentPage = 1
        this.fetchProducts()
      }, 300)
    },
    async saveAll() {
      if (this.dirtyCount === 0) return
      this.loader.loaderStart()
      try {
        const items = Object.entries(this.dirtyItems).map(([sku, quantity]) => ({
          sku,
          quantity,
        }))
        await PATCH_WarehouseStock(this.warehouse.code, { items })
        this.dirtyItems = {}
        this.notify.spawnNotification({ type: "positive", msg: this.$t("stock.saved") })
        this.fetchProducts()
      } catch (err) {
        this.formErrors.handleApiError(err)
        this.notify.spawnNotification({
          type: "negative",
          msg: extractApiMessage(err, this.$t("notifications.save_error")),
        })
      } finally {
        this.loader.loaderFinish()
      }
    },
    onPageChange(page) {
      this.currentPage = page
      this.dirtyItems = {}
      this.fetchProducts()
    },
    onCsvImported() {
      this.showImportModal = false
      this.fetchProducts()
    },
  },
}
</script>

<style lang="scss" scoped>
.stock-table__toolbar {
  display: flex;
  align-items: center;
  gap: var(--space-5);
  margin-bottom: var(--space-8);
  flex-wrap: wrap;
}

.stock-table__search {
  flex: 1;
  min-width: 150px;
  max-width: 400px;
}

.stock-table tr:hover td {
  background: var(--surface-raised);
}

.stock-table__col-sku {
  width: auto;
}

.stock-table__col-qty {
  width: 140px;
}

.stock-table__col-status {
  width: 120px;
  text-align: right;
}

.flex-center {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
