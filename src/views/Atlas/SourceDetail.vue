<template>
  <div class="supplier-detail h-100 ovy-auto">
    <!-- Toolbar buttons teleported into parent index.vue toolbar anchors -->
    <Teleport to="#suppliers-toolbar-left" defer>
      <button
        class="suppliers-toolbar-btn"
        data-testid="suppliers-detail-back"
        @click="goBack"
      >
        <FontAwesomeIcon icon="arrow-left" />
        <span class="ml-100">{{ $t("common.back") }}</span>
      </button>
      <span class="t-basic-700 fw-600 fs-400">{{ headerLabel }}</span>
    </Teleport>

    <Loader v-if="loading" />
    <div v-else-if="!supplier" class="p-500 t-basic-500">
      {{ $t("atlas.detail_not_found") }}
    </div>
    <div v-else class="supplier-detail__body">
      <div class="supplier-detail__tabs p-300 b-basic-300 bb-100">
        <SegmentedControl
          v-model="activeTab"
          :options="tabOptions"
          data-testid="suppliers-detail-tabs"
        />
      </div>
      <component :is="activeTabComponent" :supplier="supplier" />
    </div>
  </div>
</template>

<script>
import OverviewTab from "./tabs/OverviewTab.vue";
import { extractApiMessage } from "@/composables/useFormErrors";
import FeedsTab from "./tabs/FeedsTab.vue";
import MappingsTab from "./tabs/MappingsTab.vue";
import ProductsTab from "./tabs/ProductsTab.vue";
import LinkedTab from "./tabs/LinkedTab.vue";
import LogsTab from "./tabs/LogsTab.vue";
import { useNotifyStore } from "@/stores/notify";
// GET_Source, not the supplier facade — the list shows every kind, and a
// monitoring/enrichment source opened from it would 404 on /suppliers/{idx}/.
import { GET_Source } from "@/api/atlas/api";

const TABS = ["overview", "feeds", "mappings", "products", "linked", "logs"];

export default {
  name: "SourceDetail",
  components: {
    OverviewTab,
    FeedsTab,
    MappingsTab,
    ProductsTab,
    LinkedTab,
    LogsTab,
  },
  setup() {
    return { notify: useNotifyStore() };
  },
  data() {
    return {
      supplier: null,
      loading: false,
      activeTab:
        this.$route.query.tab && TABS.includes(this.$route.query.tab)
          ? this.$route.query.tab
          : "overview",
    };
  },
  computed: {
    supplierIdx() {
      return this.$route.params.idx;
    },
    headerLabel() {
      if (!this.supplier) return this.supplierIdx;
      return `${this.supplier.name} (${this.supplier.idx})`;
    },
    isMonitoringSupplier() {
      return this.supplier?.kind === "monitoring";
    },
    tabOptions() {
      // Mappings only run at push time — monitoring suppliers never push, so the tab is dead.
      const tabs = this.isMonitoringSupplier
        ? TABS.filter((key) => key !== "mappings")
        : TABS;
      return tabs.map((key) => ({
        value: key,
        label: this.$t(`atlas.tabs.${key}`),
        testid: `suppliers-tab-${key}`,
      }));
    },
    activeTabComponent() {
      const map = {
        overview: "OverviewTab",
        feeds: "FeedsTab",
        mappings: "MappingsTab",
        products: "ProductsTab",
        linked: "LinkedTab",
        logs: "LogsTab",
      };
      // Guard deep-links to a tab hidden for this role (e.g. ?tab=mappings on monitoring).
      const available = this.tabOptions.map((t) => t.value);
      if (!available.includes(this.activeTab)) return "OverviewTab";
      return map[this.activeTab] || "OverviewTab";
    },
  },
  watch: {
    "$route.params.idx": {
      handler(newIdx) {
        if (newIdx) this.fetchSupplier();
      },
      immediate: false,
    },
    "$route.query.tab"(val) {
      if (val && TABS.includes(val) && val !== this.activeTab) {
        this.activeTab = val;
      }
    },
    activeTab(newTab) {
      if (this.$route.query.tab !== newTab) {
        this.$router.replace({
          path: this.$route.path,
          query: { ...this.$route.query, tab: newTab },
        });
      }
    },
  },
  mounted() {
    this.fetchSupplier();
  },
  methods: {
    async fetchSupplier() {
      this.loading = true;
      try {
        const { data } = await GET_Source(this.supplierIdx);
        this.supplier = data;
      } catch (err) {
        this.supplier = null;
        this.notify.spawnNotification({
          type: "negative",
          msg: extractApiMessage(err, this.$t("notifications.error")),
        });
      } finally {
        this.loading = false;
      }
    },
    goBack() {
      this.$router.push("/suppliers/list");
    },
  },
};
</script>

<style lang="scss" scoped>
.supplier-detail {
  display: flex;
  flex-direction: column;
}
.supplier-detail__body {
  display: flex;
  flex-direction: column;
}
.supplier-detail__tabs {
  display: flex;
  align-items: center;
  gap: var(--space-200);
}
.suppliers-toolbar-btn {
  display: inline-flex;
  align-items: center;
  background: transparent;
  border: 1px solid var(--c-basic-300);
  color: var(--c-basic-700);
  border-radius: var(--radius-sm);
  padding: 4px 10px;
  cursor: pointer;
  transition: background 0.15s ease;
}
.suppliers-toolbar-btn:hover {
  background: var(--c-basic-200);
}
</style>
