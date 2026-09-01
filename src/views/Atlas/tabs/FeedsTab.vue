<template>
  <div class="feeds-tab p-300 ovy-auto h-100">
    <div class="flex ai-ct jc-sb mb-300">
      <h2 class="fs-400 fw-600">{{ $t("atlas.tabs.feeds") }}</h2>
      <p class="fs-200 t-basic-500 m-0">
        {{ $t("atlas.feeds.readonly_hint") }}
      </p>
    </div>

    <Loader v-show="loading" />

    <DataTable
      v-show="!loading"
      :columns="columns"
      :rows="feeds"
      row-key="idx"
      :empty-text="$t('atlas.feeds.empty')"
      @row-click="openDetail"
    >
      <template #cell-connector_kind="{ value }">
        <StatusBadge :label="value" variant="informative" />
      </template>
      <template #cell-status_combined="{ row }">
        <div class="flex ai-ct gap-100 flex-wrap">
          <StatusBadge
            :label="row.is_active ? $t('common.active') : $t('common.inactive')"
            :variant="row.is_active ? 'positive' : 'negative'"
          />
          <StatusBadge
            v-if="row.last_sync_status"
            :label="row.last_sync_status"
            :variant="syncStatusVariant(row.last_sync_status)"
          />
        </div>
      </template>
      <template #cell-last_sync_at="{ value }">
        <span v-if="value">{{ formatDate(value) }}</span>
        <span v-else class="t-basic-400">{{ dash }}</span>
      </template>
      <template #cell-actions="{ row }">
        <div class="flex ai-ct gap-100" @click.stop>
          <button
            class="row-action-btn bg-positive-100 t-positive-300"
            :title="$t('atlas.feeds.trigger_button')"
            :data-testid="`feeds-trigger-${row.idx}`"
            @click="triggerFeed(row)"
          >
            <FontAwesomeIcon icon="play" />
          </button>
        </div>
      </template>
    </DataTable>

    <FeedDetailDrawer
      :visible="detailVisible"
      :feed="detailFeed"
      :supplier-idx="supplier?.idx || ''"
      @close="closeDetail"
    />

    <Confirmation-modal
      :visible="triggerVisible"
      @accept="executeTrigger"
      @reject="triggerVisible = false"
    >
      <template #header>
        <h2>{{ $t("atlas.feeds.trigger_title") }}</h2>
      </template>
      <template #description>
        <p>
          {{
            $t("atlas.feeds.trigger_body", {
              idx: triggerTarget?.idx || "",
            })
          }}
        </p>
      </template>
    </Confirmation-modal>
  </div>
</template>

<script>
import FeedDetailDrawer from "../components/FeedDetailDrawer.vue";
import { extractApiMessage } from "@/composables/useFormErrors";
import ConfirmationModal from "@/functionals/Confirmation-modal/index.vue";
import { useNotifyStore } from "@/stores/notify";
import { GET_Feeds, POST_FeedTrigger } from "@/api/atlas/api";

const SYNC_STATUS_VARIANTS = {
  success: "positive",
  partial: "warning",
  failed: "negative",
  running: "informative",
};

export default {
  name: "FeedsTab",
  components: { FeedDetailDrawer, ConfirmationModal },
  props: {
    supplier: { type: Object, default: null },
  },
  setup() {
    return { notify: useNotifyStore() };
  },
  data() {
    return {
      feeds: [],
      loading: false,
      detailVisible: false,
      detailFeed: null,
      triggerVisible: false,
      triggerTarget: null,
      dash: "—",
    };
  },
  computed: {
    columns() {
      return [
        { key: "idx", label: this.$t("atlas.col.idx"), width: "1fr" },
        {
          key: "connector_kind",
          label: this.$t("atlas.feeds.col.connector"),
          width: "140px",
        },
        {
          key: "last_sync_at",
          label: this.$t("atlas.feeds.col.last_sync"),
          width: "1.5fr",
        },
        {
          key: "status_combined",
          label: this.$t("atlas.col.status"),
          width: "180px",
        },
        { key: "actions", label: "", width: "60px" },
      ];
    },
  },
  watch: {
    "supplier.idx"() {
      this.fetchFeeds();
    },
  },
  mounted() {
    this.fetchFeeds();
  },
  methods: {
    syncStatusVariant(value) {
      return SYNC_STATUS_VARIANTS[value] || "neutral";
    },
    formatDate(iso) {
      if (!iso) return this.dash;
      try {
        return new Date(iso).toLocaleString();
      } catch {
        return iso;
      }
    },
    async fetchFeeds() {
      if (!this.supplier?.idx) return;
      this.loading = true;
      try {
        const { data } = await GET_Feeds(this.supplier.idx, { page_size: 100 });
        this.feeds = data.results || [];
      } catch (err) {
        this.notify.spawnNotification({
          type: "negative",
          msg: extractApiMessage(err, this.$t("notifications.error")),
        });
      } finally {
        this.loading = false;
      }
    },
    openDetail(row) {
      this.detailFeed = row;
      this.detailVisible = true;
    },
    closeDetail() {
      this.detailVisible = false;
      this.detailFeed = null;
    },
    triggerFeed(row) {
      this.triggerTarget = row;
      this.triggerVisible = true;
    },
    async executeTrigger() {
      if (!this.triggerTarget) return;
      try {
        const { data } = await POST_FeedTrigger(
          this.supplier.idx,
          this.triggerTarget.idx
        );
        this.notify.spawnNotification({
          type: "positive",
          msg: this.$t("atlas.feeds.toast.triggered", {
            run_id: data.run_id || "—",
          }),
        });
        this.triggerVisible = false;
        this.triggerTarget = null;
        this.fetchFeeds();
      } catch (err) {
        this.notify.spawnNotification({
          type: "negative",
          msg: extractApiMessage(err, this.$t("notifications.error")),
        });
      }
    },
  },
};
</script>

<style lang="scss" scoped>
.feeds-tab {
  display: flex;
  flex-direction: column;
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
  transition: opacity 0.15s ease;
}

.row-action-btn:hover {
  opacity: 0.85;
}
</style>
