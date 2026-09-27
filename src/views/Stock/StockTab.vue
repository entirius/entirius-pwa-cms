<template>
  <div class="stock-tab" :class="{ 'stock-tab--embedded': embedded }">
    <div v-if="loading" class="flex-center pv-12">
      <Loader />
    </div>

    <div v-else-if="rows.length === 0" class="pv-12">
      <EmptyState :title="$t('stock.no_warehouses')" icon="warehouse" />
    </div>

    <template v-else>
      <div v-if="dirtyCount > 0" class="stock-tab__actions flex ai-ct jc-fe gap-5 mb-5">
        <span class="bg-warning-subtle t-warning fs-200 ph-2 rounded">
          {{ $t("stock.unsaved") }}: {{ dirtyCount }}
        </span>
        <BasicButton
          variant="primary"
          @click="saveAll"
        >
          {{ $t('stock.save_all') }}
        </BasicButton>
      </div>

      <table class="table-basic stock-tab__table">
        <thead>
          <tr>
            <th>{{ $t("stock.warehouse") }}</th>
            <th class="stock-tab__col-type">{{ $t("stock.source_manual") }}</th>
            <th class="stock-tab__col-qty">{{ $t("stock.quantity") }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in rows" :key="row.warehouse_code">
            <td class="fw-500">{{ row.warehouse_name }}</td>
            <td class="stock-tab__col-type">
              <StatusBadge
                :label="row.source_type === 'manual' ? $t('stock.source_manual') : $t('stock.source_integration')"
                :variant="row.source_type === 'manual' ? 'positive' : 'neutral'"
              />
            </td>
            <td class="stock-tab__col-qty">
              <NumberInput
                v-if="row.source_type === 'manual'"
                :modelValue="getDisplayQty(row)"
                :min="0"
                @update:modelValue="(val) => onQtyChange(row.warehouse_code, val)"
              />
              <span v-else class="t-muted">{{ row.quantity }}</span>
            </td>
          </tr>
        </tbody>
      </table>

    </template>
  </div>
</template>

<script>
import { useLoaderStore } from "@/stores/loader"
import { useNotifyStore } from "@/stores/notify"
import { GET_StockBySku, PATCH_StockBySku } from "@/api/stock/api"
import { extractApiMessage } from "@/composables/useFormErrors"

export default {
  name: "StockTab",
  props: {
    sku: { type: String, required: true },
    embedded: { type: Boolean, default: true },
  },
  setup() {
    const loader = useLoaderStore()
    const notify = useNotifyStore()
    return { loader, notify }
  },
  data() {
    return {
      rows: [],
      loading: false,
      dirtyItems: {},
    }
  },
  computed: {
    dirtyCount() {
      return Object.keys(this.dirtyItems).length
    },
  },
  watch: {
    sku: {
      handler(val) {
        if (val) this.fetchStock()
      },
      immediate: true,
    },
  },
  methods: {
    async fetchStock() {
      if (!this.sku) return
      this.loading = true
      this.dirtyItems = {}
      try {
        const { data } = await GET_StockBySku(this.sku)
        this.rows = data || []
      } catch (err) {
        this.notify.spawnNotification({
          type: "negative",
          msg: extractApiMessage(err, this.$t("notifications.error")),
        })
      } finally {
        this.loading = false
      }
    },
    getDisplayQty(row) {
      return row.warehouse_code in this.dirtyItems
        ? this.dirtyItems[row.warehouse_code]
        : row.quantity
    },
    onQtyChange(warehouseCode, value) {
      const original = this.rows.find((r) => r.warehouse_code === warehouseCode)
      if (original && original.quantity === value) {
        delete this.dirtyItems[warehouseCode]
      } else {
        this.dirtyItems[warehouseCode] = value
      }
      this.dirtyItems = { ...this.dirtyItems }
    },
    async saveAll() {
      if (this.dirtyCount === 0) return
      this.loader.loaderStart()
      try {
        const items = Object.entries(this.dirtyItems).map(([warehouse_code, quantity]) => ({
          warehouse_code,
          quantity,
        }))
        await PATCH_StockBySku(this.sku, { items })
        this.dirtyItems = {}
        this.notify.spawnNotification({ type: "positive", msg: this.$t("stock.saved") })
        this.fetchStock()
      } catch (err) {
        this.notify.spawnNotification({
          type: "negative",
          msg: extractApiMessage(err, this.$t("notifications.save_error")),
        })
      } finally {
        this.loader.loaderFinish()
      }
    },
  },
}
</script>

<style lang="scss" scoped>
.stock-tab--embedded {
  padding: var(--space-8);
}

.stock-tab__table tr:hover td {
  background: var(--surface-raised);
}

.stock-tab__col-type {
  width: 120px;
}

.stock-tab__col-qty {
  width: 140px;
}

.stock-tab__actions {
  padding-bottom: var(--space-5);
  border-bottom: 1px solid var(--border-subtle);
}

.flex-center {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
