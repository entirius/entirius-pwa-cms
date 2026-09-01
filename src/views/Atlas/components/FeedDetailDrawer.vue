<template>
  <SideDrawer
    :visible="visible"
    :title="title"
    width="640px"
    @close="$emit('close')"
  >
    <div v-if="feed" class="feed-detail">
      <!-- Identity + status header -->
      <section class="feed-detail__section">
        <div class="flex ai-ct gap-200 flex-wrap mb-200">
          <span class="fs-300 fw-600 t-basic-700">{{ feed.idx }}</span>
          <StatusBadge :label="feed.connector_kind" variant="informative" />
          <StatusBadge :label="feed.sync_mode" variant="neutral" />
          <StatusBadge
            :label="
              feed.is_active ? $t('common.active') : $t('common.inactive')
            "
            :variant="feed.is_active ? 'positive' : 'negative'"
          />
          <StatusBadge
            v-if="feed.last_sync_status"
            :label="feed.last_sync_status"
            :variant="syncStatusVariant(feed.last_sync_status)"
          />
        </div>
      </section>

      <!-- Schedule + sync metadata -->
      <section class="feed-detail__section">
        <h3 class="feed-detail__heading">
          {{ $t("atlas.feeds.detail.sync_section") }}
        </h3>
        <dl class="feed-detail__grid">
          <dt>{{ $t("atlas.feeds.col.schedule") }}</dt>
          <dd>{{ feed.schedule_cron || dash }}</dd>
          <dt>{{ $t("atlas.feeds.col.last_sync") }}</dt>
          <dd>{{ formatDate(feed.last_sync_at) }}</dd>
          <dt>{{ $t("atlas.feeds.detail.last_run_id") }}</dt>
          <dd class="feed-detail__mono">{{ feed.last_run_id || dash }}</dd>
          <dt>{{ $t("atlas.feeds.detail.created_at") }}</dt>
          <dd>{{ formatDate(feed.created_at) }}</dd>
          <dt>{{ $t("atlas.feeds.detail.modified_at") }}</dt>
          <dd>{{ formatDate(feed.modified_at) }}</dd>
        </dl>
      </section>

      <!-- Overrides -->
      <section
        v-if="feed.feature_set_idx || feed.language_id || feed.currency_id"
        class="feed-detail__section"
      >
        <h3 class="feed-detail__heading">
          {{ $t("atlas.feeds.detail.overrides_section") }}
        </h3>
        <dl class="feed-detail__grid">
          <template v-if="feed.feature_set_idx">
            <dt>{{ $t("atlas.feeds.detail.feature_set_idx") }}</dt>
            <dd>{{ feed.feature_set_idx }}</dd>
          </template>
          <template v-if="feed.language_id != null">
            <dt>{{ $t("atlas.feeds.detail.language_id") }}</dt>
            <dd>{{ feed.language_id }}</dd>
          </template>
          <template v-if="feed.currency_id != null">
            <dt>{{ $t("atlas.feeds.detail.currency_id") }}</dt>
            <dd>{{ feed.currency_id }}</dd>
          </template>
        </dl>
      </section>

      <!-- Feed config (read-only JSON) -->
      <section class="feed-detail__section">
        <h3 class="feed-detail__heading">
          {{ $t("atlas.feeds.detail.config_section") }}
        </h3>
        <p class="fs-200 t-basic-500 mb-200">
          {{ $t("atlas.feeds.detail.config_hint") }}
        </p>
        <pre class="feed-detail__json">{{ feedConfigPretty }}</pre>
      </section>

      <!-- Sample preview (calls /test/?limit=3) -->
      <section class="feed-detail__section">
        <div class="flex ai-ct jc-sb mb-200">
          <h3 class="feed-detail__heading m-0">
            {{ $t("atlas.feeds.detail.preview_section") }}
          </h3>
          <button
            class="feed-detail__refresh-btn"
            :disabled="previewBusy"
            :title="$t('atlas.feeds.detail.preview_refresh')"
            @click="loadPreview"
          >
            <FontAwesomeIcon icon="rotate" :spin="previewBusy" />
          </button>
        </div>
        <p v-if="previewBusy" class="fs-200 t-basic-500">
          {{ $t("atlas.feeds.detail.preview_loading") }}
        </p>
        <p v-else-if="previewError" class="fs-200 t-negative-300">
          {{ previewError }}
        </p>
        <p v-else-if="previewProducts.length === 0" class="fs-200 t-basic-500">
          {{ $t("atlas.feeds.detail.preview_empty") }}
        </p>
        <div v-else class="feed-detail__preview">
          <div
            v-for="p in previewProducts"
            :key="p.external_id"
            class="feed-detail__preview-row"
          >
            <div class="flex ai-ct gap-200 flex-wrap mb-100">
              <strong class="fs-200">{{ p.external_id }}</strong>
              <span class="fs-300 t-basic-700">{{ p.name }}</span>
            </div>
            <div class="flex ai-ct gap-300 flex-wrap fs-200 t-basic-500">
              <span v-if="p.cost">{{ formatCost(p.cost, p.currency) }}</span>
              <span>stock: {{ p.stock ?? 0 }}</span>
              <span v-if="p.ean">EAN: {{ p.ean }}</span>
              <a
                v-if="p.url"
                :href="p.url"
                target="_blank"
                rel="noopener"
                class="t-support-400"
              >
                {{ $t("atlas.feeds.detail.preview_open_source") }}
              </a>
            </div>
          </div>
        </div>
      </section>
    </div>
  </SideDrawer>
</template>

<script>
import { POST_FeedTest } from "@/api/atlas/api";
import { formatCost } from "@/utils/format";
import { extractApiMessage } from "@/composables/useFormErrors";

const SYNC_STATUS_VARIANTS = {
  success: "positive",
  partial: "warning",
  failed: "negative",
  running: "informative",
};

export default {
  name: "FeedDetailDrawer",
  props: {
    visible: { type: Boolean, default: false },
    feed: { type: Object, default: null },
    supplierIdx: { type: String, default: "" },
  },
  emits: ["close"],
  data() {
    return {
      previewBusy: false,
      previewError: "",
      previewProducts: [],
      dash: "—",
    };
  },
  computed: {
    title() {
      return this.$t("atlas.feeds.detail.title", {
        idx: this.feed?.idx || "",
      });
    },
    feedConfigPretty() {
      if (!this.feed?.feed_config) return "{}";
      try {
        return JSON.stringify(this.feed.feed_config, null, 2);
      } catch {
        return String(this.feed.feed_config);
      }
    },
  },
  watch: {
    visible(open) {
      if (open && this.feed) {
        this.loadPreview();
      }
    },
    "feed.idx"(newIdx, oldIdx) {
      if (newIdx && newIdx !== oldIdx && this.visible) {
        this.loadPreview();
      }
    },
  },
  methods: {
    formatCost,
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
    async loadPreview() {
      if (!this.supplierIdx || !this.feed?.idx) return;
      this.previewBusy = true;
      this.previewError = "";
      this.previewProducts = [];
      try {
        const { data } = await POST_FeedTest(this.supplierIdx, this.feed.idx, {
          limit: 3,
        });
        this.previewProducts = data?.raw_products || [];
      } catch (err) {
        this.previewError = extractApiMessage(err, this.$t("notifications.error"));
      } finally {
        this.previewBusy = false;
      }
    },
  },
};
</script>

<style lang="scss" scoped>
.feed-detail {
  padding: var(--space-300);
  display: flex;
  flex-direction: column;
  gap: var(--space-400);
}

.feed-detail__section {
  display: flex;
  flex-direction: column;
}

.feed-detail__heading {
  font-size: var(--fs-200);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  color: var(--c-basic-500);
  margin: 0 0 8px;
}

.feed-detail__grid {
  display: grid;
  grid-template-columns: max-content 1fr;
  gap: 4px 16px;
  margin: 0;

  dt {
    font-size: var(--fs-200);
    color: var(--c-basic-500);
    text-transform: uppercase;
    letter-spacing: 0.03em;
  }

  dd {
    margin: 0;
    font-size: var(--fs-300);
    color: var(--c-basic-700);
    word-break: break-all;
  }
}

.feed-detail__mono {
  font-family: var(--ff-mono, monospace);
  font-size: var(--fs-200);
}

.feed-detail__json {
  background: var(--c-basic-200);
  color: var(--c-basic-800);
  border: 1px solid var(--c-basic-300);
  border-radius: var(--radius-sm);
  padding: 12px;
  font-family: var(--ff-mono, monospace);
  font-size: var(--fs-200);
  margin: 0;
  max-height: 240px;
  overflow: auto;
  white-space: pre;
}

.feed-detail__preview {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.feed-detail__preview-row {
  border: 1px solid var(--c-basic-300);
  border-radius: var(--radius-sm);
  padding: 8px 12px;
}

.feed-detail__refresh-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: 1px solid var(--c-basic-300);
  background: transparent;
  color: var(--c-basic-700);
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: background 0.15s ease;

  &:hover:not(:disabled) {
    background: var(--c-basic-200);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
}
</style>
