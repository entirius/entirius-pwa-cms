<template>
  <div
    v-if="isStale"
    class="gap-status-alert bg-warning-100 t-warning-300 br-50 flex ai-ct jc-sb gap-300"
    :class="{ 'gap-status-alert--compact': compact }"
    data-test="gap-status-alert"
  >
    <div class="flex ai-ct gap-200">
      <FontAwesomeIcon icon="triangle-exclamation" class="gap-status-alert__icon" />
      <span>{{ $t("pim.gaps_rules_changed_alert", { date: changedAt }) }}</span>
    </div>
    <BasicButton
      :text="recomputing ? $t('pim.gaps_recomputing') : $t('pim.gaps_recompute_now')"
      :isDisabled="recomputing"
      class="bg-warning-300 t-basic-100"
      data-test="gap-recompute-btn"
      @click="recompute"
    />
  </div>
</template>

<script>
import { useNotifyStore } from "@/stores/notify";
import { GET_GapsStatus, POST_GapsRecompute } from "@/api/pim/api";
import { extractApiMessage } from "@/composables/useFormErrors";

const POLL_INTERVAL_MS = 2000;
const POLL_MAX_ATTEMPTS = 30; // ~60s safety window

export default {
  name: "GapStatusAlert",
  props: {
    // Compact rendering for embedding above a list (vs. the rules screen banner).
    compact: { type: Boolean, default: false },
  },
  setup() {
    const notify = useNotifyStore();
    return { notify };
  },
  data() {
    return {
      status: null,
      recomputing: false,
      _pollTimer: null,
      _pollAttempts: 0,
    };
  },
  computed: {
    isStale() {
      return !!this.status && this.status.is_stale === true;
    },
    changedAt() {
      const iso = this.status && this.status.rules_changed_at;
      if (!iso) return "";
      const d = new Date(iso);
      return isNaN(d.getTime()) ? iso : d.toLocaleString();
    },
  },
  mounted() {
    this.fetchStatus();
  },
  beforeUnmount() {
    this.stopPolling();
  },
  methods: {
    // Soft-compat: old backend has no gaps/status/ → 404 → status stays null → no banner, no errors.
    async fetchStatus() {
      try {
        const { data } = await GET_GapsStatus();
        this.status = data;
        if (data && data.recompute_running) {
          this.recomputing = true;
          this.startPolling();
        }
      } catch {
        this.status = null;
      }
    },
    async recompute() {
      if (this.recomputing) return;
      this.recomputing = true;
      try {
        const { data } = await POST_GapsRecompute();
        const started = data && data.status === "started";
        this.notify.spawnNotification({
          type: started ? "informative" : "warning",
          msg: started
            ? this.$t("pim.gaps_recompute_started")
            : this.$t("pim.gaps_recompute_already_running"),
        });
        this.startPolling();
      } catch (err) {
        this.recomputing = false;
        this.notify.spawnNotification({
          type: "negative",
          msg: extractApiMessage(err, this.$t("pim.gaps_recompute_error")),
        });
      }
    },
    startPolling() {
      this.stopPolling();
      this._pollAttempts = 0;
      this._pollTimer = setInterval(this.pollOnce, POLL_INTERVAL_MS);
    },
    stopPolling() {
      if (this._pollTimer) {
        clearInterval(this._pollTimer);
        this._pollTimer = null;
      }
    },
    async pollOnce() {
      this._pollAttempts += 1;
      try {
        const { data } = await GET_GapsStatus();
        this.status = data;
        if (data && !data.recompute_running) {
          this.finishRecompute(!data.is_stale);
          return;
        }
      } catch {
        // transient — keep trying until the attempt budget runs out
      }
      if (this._pollAttempts >= POLL_MAX_ATTEMPTS) {
        this.finishRecompute(false);
      }
    },
    finishRecompute(succeeded) {
      this.stopPolling();
      this.recomputing = false;
      if (succeeded) {
        this.notify.spawnNotification({
          type: "positive",
          msg: this.$t("pim.gaps_recompute_success"),
        });
      }
    },
  },
};
</script>

<style lang="scss" scoped>
.gap-status-alert {
  padding: var(--space-300);
  margin-bottom: var(--space-400);
  border: 1px solid var(--c-warning-200);
}
.gap-status-alert--compact {
  padding: var(--space-200) var(--space-300);
}
.gap-status-alert__icon {
  flex-shrink: 0;
}
</style>
