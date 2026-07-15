<template>
  <div class="focus-mode">
    <Loader v-show="loading" />

    <EmptyState
      v-if="!loading && !current"
      icon="wand-magic-sparkles"
      :title="$t('enrichment.review.empty')"
      :message="$t('enrichment.review.empty_message')"
    />

    <div
      v-else-if="current"
      class="focus-mode__card bg-basic-100 b-basic-300 br-50"
    >
      <div class="focus-mode__head flex ai-ct jc-sb flex-wrap gap-200">
        <div>
          <a
            v-if="current.subject_url"
            :href="current.subject_url"
            target="_blank"
            rel="noopener"
            class="focus-mode__subject fs-400 fw-600 t-primary-300"
            >{{ current.subject_label || current.subject_ref }}</a
          >
          <span v-else class="focus-mode__subject fs-400 fw-600">{{
            current.subject_label || current.subject_ref
          }}</span>
          <div class="fs-200 t-basic-500 mt-100">{{ metaLine }}</div>
        </div>
        <span
          class="fs-200 t-basic-600"
          data-testid="enrichment-focus-progress"
        >
          {{
            $t("enrichment.review.progress", {
              index: globalIndex + 1,
              total: totalCount,
            })
          }}
        </span>
      </div>

      <div
        v-if="driftMode"
        class="focus-mode__drift bg-warning-100 t-warning-300 br-50"
        data-testid="enrichment-focus-drift"
      >
        <FontAwesomeIcon icon="triangle-exclamation" />
        {{ $t("enrichment.drift.intro") }}
      </div>

      <div class="focus-mode__diff">
        <DiffRenderer
          :target-kind="current.target_kind"
          :proposed="current.proposed_value"
          :current="current.current_snapshot"
          :proposal-id="current.id"
          :subject-label="current.subject_label || current.subject_ref"
        />
      </div>

      <textarea
        v-model="reason"
        class="focus-mode__reason"
        rows="2"
        :placeholder="$t('enrichment.review.reject_reason_placeholder')"
        data-testid="enrichment-focus-reason"
      />

      <div class="focus-mode__actions flex ai-ct gap-100 flex-wrap">
        <button
          class="focus-mode__btn bg-positive-200 t-basic-100"
          :disabled="acting"
          data-testid="enrichment-focus-accept"
          @click="accept"
        >
          {{ driftMode ? $t("enrichment.drift.confirm") : $t("common.accept") }}
          <kbd>a</kbd>
        </button>
        <button
          class="focus-mode__btn bg-negative-100 t-negative-300"
          :disabled="acting"
          data-testid="enrichment-focus-reject"
          @click="reject"
        >
          {{ $t("common.reject") }} <kbd>r</kbd>
        </button>
        <button
          class="focus-mode__btn bg-basic-200 t-basic-600"
          :disabled="acting"
          data-testid="enrichment-focus-skip"
          @click="skip"
        >
          {{ $t("enrichment.review.skip") }} <kbd>s</kbd>
        </button>
        <div class="ml-auto fs-100 t-basic-500">
          {{ $t("enrichment.review.shortcuts_hint") }}
        </div>
      </div>

      <ProductPreviewCard
        v-if="isPimCurrent"
        :key="current.subject_ref"
        :sku="current.subject_ref"
        :channel-idx="pimChannel.activeChannelIdx"
        class="focus-mode__product"
      />
    </div>
  </div>
</template>

<script>
import { useNotifyStore } from "@/stores/notify";
import { usePimChannelStore } from "@/stores/pimChannel";
import { extractApiMessage } from "@/composables/useFormErrors";
import DiffRenderer from "./DiffRenderer.vue";
import ProductPreviewCard from "./ProductPreviewCard.vue";
import { POST_AcceptProposal, POST_RejectProposal } from "@/api/enrichment/api";

export default {
  name: "EnrichmentFocusMode",
  components: { DiffRenderer, ProductPreviewCard },
  props: {
    rows: { type: Array, default: () => [] },
    loading: { type: Boolean, default: false },
    page: { type: Number, default: 1 },
    pageSize: { type: Number, default: 25 },
    totalCount: { type: Number, default: 0 },
    // Which proposal in the current page to open on first mount (set when entering
    // focus from a list row click). The rows watcher still resets to 0 on page change.
    initialIndex: { type: Number, default: 0 },
  },
  emits: ["need-more", "exit"],
  setup() {
    return { notify: useNotifyStore(), pimChannel: usePimChannelStore() };
  },
  data() {
    return {
      localIndex: this.initialIndex,
      acting: false,
      reason: "",
      driftMode: false,
      driftRow: null,
    };
  },
  computed: {
    current() {
      // During drift re-confirm, show the refreshed proposal returned by accept()
      // without mutating the parent-owned `rows` prop.
      if (this.driftMode && this.driftRow) return this.driftRow;
      return this.rows[this.localIndex] || null;
    },
    // Show the product-context card only for PIM proposals (subject_ref = SKU).
    isPimCurrent() {
      const c = this.current;
      return !!c && (c.target_module || "").includes("pim") && !!c.subject_ref;
    },
    globalIndex() {
      return (this.page - 1) * this.pageSize + this.localIndex;
    },
    hasMorePages() {
      return this.page * this.pageSize < this.totalCount;
    },
    metaLine() {
      if (!this.current) return "";
      const loc = this.current.target_locator || {};
      const field = [loc.feature_idx, loc.language].filter(Boolean).join(" · ");
      const conf =
        this.current.confidence != null
          ? `${Math.round(Number(this.current.confidence) * 100)}%`
          : "—";
      return [
        this.current.target_module,
        this.current.target_kind,
        field,
        this.current.source,
        conf,
      ]
        .filter(Boolean)
        .join("  ·  ");
    },
  },
  watch: {
    // A fresh page arrived (parent loaded next) — start at its top.
    rows() {
      this.localIndex = 0;
      this.driftMode = false;
      this.driftRow = null;
      this.reason = "";
    },
  },
  mounted() {
    window.addEventListener("keydown", this.onKey);
  },
  unmounted() {
    window.removeEventListener("keydown", this.onKey);
  },
  methods: {
    onKey(e) {
      // Never hijack keys while the operator is typing a reject reason.
      const tag = (e.target?.tagName || "").toLowerCase();
      if (tag === "input" || tag === "textarea" || e.target?.isContentEditable)
        return;
      if (this.acting || !this.current) return;
      if (e.key === "a") {
        e.preventDefault();
        this.accept();
      } else if (e.key === "r") {
        e.preventDefault();
        this.reject();
      } else if (e.key === "s" || e.key === "ArrowRight") {
        e.preventDefault();
        this.skip();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        this.back();
      }
    },
    advance() {
      this.reason = "";
      this.driftMode = false;
      this.driftRow = null;
      if (this.localIndex < this.rows.length - 1) {
        this.localIndex += 1;
      } else if (this.hasMorePages) {
        this.$emit("need-more"); // parent loads next page → rows watcher resets index
      } else {
        this.$emit("exit"); // end of the filtered set → back to List
      }
    },
    back() {
      if (this.localIndex > 0) {
        this.localIndex -= 1;
        this.reason = "";
        this.driftMode = false;
        this.driftRow = null;
      }
    },
    async accept() {
      if (this.acting || !this.current) return;
      this.acting = true;
      try {
        const { data } = await POST_AcceptProposal(this.current.id);
        if (data.status === "drifted") {
          // Live value moved since the proposal — re-render with the NEW current
          // (local override, no prop mutation) and require a conscious second accept
          // (D2 re-confirm, inline in Focus).
          this.driftRow = data;
          this.driftMode = true;
          this.notify.spawnNotification({
            type: "warning",
            msg: this.$t("enrichment.drift.title"),
          });
          return;
        }
        this.notify.spawnNotification({
          type: "positive",
          msg: this.$t("enrichment.review.toast.accepted"),
        });
        this.advance();
      } catch (err) {
        this.notify.spawnNotification({
          type: "negative",
          msg: extractApiMessage(err, this.$t("notifications.error")),
        });
      } finally {
        this.acting = false;
      }
    },
    async reject() {
      if (this.acting || !this.current) return;
      this.acting = true;
      try {
        await POST_RejectProposal(
          this.current.id,
          this.reason ? { reason: this.reason } : {}
        );
        this.notify.spawnNotification({
          type: "positive",
          msg: this.$t("enrichment.review.toast.rejected"),
        });
        this.advance();
      } catch (err) {
        this.notify.spawnNotification({
          type: "negative",
          msg: extractApiMessage(err, this.$t("notifications.error")),
        });
      } finally {
        this.acting = false;
      }
    },
    skip() {
      this.advance();
    },
  },
};
</script>

<style lang="scss" scoped>
.focus-mode__card {
  max-width: 860px;
  margin: 0 auto;
  padding: var(--space-400);
}
.focus-mode__subject {
  text-decoration: none;
  &:hover {
    text-decoration: underline;
  }
}
.focus-mode__drift {
  display: flex;
  align-items: center;
  gap: var(--space-100);
  padding: var(--space-200);
  margin: var(--space-300) 0;
  font-size: var(--fs-200);
}
.focus-mode__diff {
  margin: var(--space-300) 0;
}
.focus-mode__product {
  margin-top: var(--space-300);
  border-top: 1px solid var(--c-basic-200);
}
.focus-mode__reason {
  width: 100%;
  padding: var(--space-200);
  border: 1px solid var(--c-basic-400);
  border-radius: var(--radius-sm);
  background: var(--c-basic-100);
  color: var(--c-basic-800);
  font-size: var(--fs-200);
  resize: vertical;
  margin-bottom: var(--space-300);
}
.focus-mode__btn {
  height: var(--elem-height);
  padding: 0 16px;
  border: none;
  border-radius: var(--radius-sm);
  font-size: var(--fs-200);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: var(--space-100);
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  kbd {
    font-size: var(--fs-100);
    background: var(--c-basic-100);
    color: var(--c-basic-600);
    border-radius: var(--radius-sm);
    padding: 0 4px;
    opacity: 0.8;
  }
}
</style>
