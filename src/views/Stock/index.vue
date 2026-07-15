<template>
  <div class="stock-panel h-100">
    <div class="stock-panel__toolbar flex ai-ct jc-sb bg-basic-200 fs-300">
      <div class="flex ai-ct gap-200">
        <Dropdown
          :values="warehouseOptions"
          :selected="activeWarehouse ? [activeWarehouse.code] : []"
          :placeholder="$t('stock.select_warehouse')"
          class="stock-panel__dropdown"
          @onSelect="onWarehouseSelect"
        />
        <StatusBadge
          v-if="activeWarehouse"
          :label="activeWarehouse.source_type === 'manual' ? $t('stock.source_manual') : $t('stock.source_integration')"
          :variant="activeWarehouse.source_type === 'manual' ? 'positive' : 'neutral'"
        />
        <span
          v-if="activeWarehouse && activeWarehouse.source_type === 'integration' && activeWarehouse.last_synced_at"
          class="fs-200 t-basic-500"
        >
          {{ $t('stock.last_synced') }}: {{ formatRelativeTime(activeWarehouse.last_synced_at) }}
        </span>
      </div>
      <div id="stock-toolbar-right" class="flex ai-ct gap-200"></div>
    </div>

    <div v-if="!activeWarehouse && !loading" class="flex-center h-100">
      <EmptyState
        :title="warehouses.length ? $t('stock.select_warehouse') : $t('stock.no_warehouses')"
        icon="boxes-stacked"
      />
    </div>

    <router-view v-else-if="activeWarehouse" />
  </div>
</template>

<script>
import { useLoaderStore } from "@/stores/loader"
import { useNotifyStore } from "@/stores/notify"
import { GET_Warehouses } from "@/api/stock/api"
import { extractApiMessage } from "@/composables/useFormErrors"

export default {
  name: "StockPanel",
  setup() {
    const loader = useLoaderStore()
    const notify = useNotifyStore()
    return { loader, notify }
  },
  provide() {
    return {
      activeWarehouse: () => this.activeWarehouse,
    }
  },
  data() {
    return {
      warehouses: [],
      activeWarehouse: null,
      loading: false,
    }
  },
  computed: {
    sortedWarehouses() {
      return [...this.warehouses].sort((a, b) => {
        if (a.source_type === b.source_type) return a.name.localeCompare(b.name)
        return a.source_type === "manual" ? -1 : 1
      })
    },
    warehouseOptions() {
      return this.sortedWarehouses.map((wh) => ({
        label: wh.name,
        value: wh.code,
      }))
    },
  },
  mounted() {
    this.fetchWarehouses()
  },
  methods: {
    async fetchWarehouses() {
      this.loading = true
      try {
        const { data } = await GET_Warehouses({ is_active: true })
        this.warehouses = data || []
        if (this.warehouses.length && !this.activeWarehouse) {
          this.activeWarehouse = this.sortedWarehouses[0]
        }
      } catch (err) {
        this.notify.spawnNotification({
          type: "negative",
          msg: extractApiMessage(err, this.$t("notifications.error")),
        })
      } finally {
        this.loading = false
      }
    },
    onWarehouseSelect(selected) {
      const code = Array.isArray(selected) ? selected[0] : selected
      this.activeWarehouse = this.warehouses.find((wh) => wh.code === code) || null
    },
    formatRelativeTime(dateStr) {
      if (!dateStr) return ""
      const diff = Date.now() - new Date(dateStr).getTime()
      const minutes = Math.floor(diff / 60000)
      if (minutes < 60) return `${minutes}m ago`
      const hours = Math.floor(minutes / 60)
      if (hours < 24) return `${hours}h ago`
      const days = Math.floor(hours / 24)
      return `${days}d ago`
    },
  },
}
</script>

<style lang="scss" scoped>
.stock-panel {
  display: flex;
  flex-direction: column;
}

.stock-panel__toolbar {
  padding: 8px 20px;
  border-bottom: 1px solid var(--c-basic-300);
  flex-shrink: 0;
}

.stock-panel__dropdown {
  min-width: 200px;
  max-width: 300px;
}

.flex-center {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
