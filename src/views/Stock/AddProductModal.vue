<template>
  <Confirmation-modal :visible="true" @reject="$emit('close')">
    <template #description>
      <h3 class="fs-500 fw-600 mb-300">{{ $t("stock.add_products_title") }}</h3>

      <div class="add-product__toolbar flex ai-ct gap-200 mb-200">
        <BasicInput
          v-model="search"
          :placeholder="$t('stock.search_sku')"
          icon="magnifying-glass"
          class="add-product__search"
          @input="debouncedSearch"
        />
        <FilterChip
          :label="$t('stock.filter_without_stock')"
          :active="onlyMissing"
          @click="onlyMissing = !onlyMissing; fetchProducts()"
        />
      </div>

      <div v-if="loading" class="flex-center pv-300">
        <Loader />
      </div>

      <div v-else-if="products.length === 0" class="pv-300 fs-300 t-basic-500">
        {{ $t("stock.no_products_found") }}
      </div>

      <div v-else class="add-product__list">
        <div
          v-for="p in products"
          :key="p.sku"
          class="add-product__row flex ai-ct jc-sb"
          :class="{ 'add-product__row--selected': selectedSkus.has(p.sku) }"
          @click="toggleSku(p.sku)"
        >
          <div class="flex ai-ct gap-200">
            <FontAwesomeIcon
              :icon="selectedSkus.has(p.sku) ? 'check-square' : 'square'"
              :class="selectedSkus.has(p.sku) ? 't-support-400' : 't-basic-400'"
            />
            <span class="fw-500">{{ p.sku }}</span>
          </div>
          <StatusBadge
            v-if="p.has_stock"
            :label="String(p.quantity)"
            variant="neutral"
          />
          <span v-else class="fs-200 t-basic-500">{{ $t("stock.no_stock_yet") }}</span>
        </div>
      </div>

      <div v-if="totalCount > pageSize" class="mt-200">
        <Pagination
          :current="currentPage"
          :total="totalCount"
          :perPage="pageSize"
          @change="onPageChange"
        />
      </div>
    </template>

    <template #footer>
      <button class="modal-btn modal-btn--secondary" @click="$emit('close')">
        Cancel
      </button>
      <button
        class="modal-btn modal-btn--confirm"
        :disabled="selectedSkus.size === 0"
        @click="addSelected"
      >
        {{ $t("stock.add_selected") }} ({{ selectedSkus.size }})
      </button>
    </template>
  </Confirmation-modal>
</template>

<script>
import { GET_WarehouseProducts } from "@/api/stock/api"

export default {
  name: "AddProductModal",
  props: {
    warehouseCode: { type: String, required: true },
  },
  emits: ["close", "add"],
  data() {
    return {
      products: [],
      totalCount: 0,
      currentPage: 1,
      pageSize: 20,
      search: "",
      onlyMissing: true,
      loading: false,
      selectedSkus: new Set(),
      _debounceTimer: null,
    }
  },
  mounted() {
    this.fetchProducts()
  },
  methods: {
    async fetchProducts() {
      this.loading = true
      try {
        const params = { page: this.currentPage, page_size: this.pageSize }
        if (this.search) params.search = this.search
        if (this.onlyMissing) params.has_stock = "false"
        const { data } = await GET_WarehouseProducts(this.warehouseCode, params)
        this.products = data.results || []
        this.totalCount = data.count || 0
      } catch {
        this.products = []
      } finally {
        this.loading = false
      }
    },
    debouncedSearch() {
      clearTimeout(this._debounceTimer)
      this._debounceTimer = setTimeout(() => {
        this.currentPage = 1
        this.fetchProducts()
      }, 300)
    },
    toggleSku(sku) {
      const next = new Set(this.selectedSkus)
      if (next.has(sku)) {
        next.delete(sku)
      } else {
        next.add(sku)
      }
      this.selectedSkus = next
    },
    onPageChange(page) {
      this.currentPage = page
      this.fetchProducts()
    },
    addSelected() {
      this.$emit("add", [...this.selectedSkus])
      this.$emit("close")
    },
  },
}
</script>

<style lang="scss" scoped>
.add-product__search {
  flex: 1;
  min-width: 150px;
}

.add-product__list {
  max-height: 350px;
  overflow-y: auto;
  border: 1px solid var(--c-basic-300);
  border-radius: var(--radius-md);
}

.add-product__row {
  padding: 10px var(--space-200);
  border-bottom: 1px solid var(--c-basic-300);
  cursor: pointer;

  &:last-child {
    border-bottom: none;
  }

  &:hover {
    background: var(--c-basic-200);
  }

  &--selected {
    background: var(--c-support-100);
  }
}

.flex-center {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
