<template>
  <div class="events-mode">
    <div class="flex ai-ct flex-wrap gap-200 mb-300">
      <span class="t-basic-600 fs-200">{{
        $t("atlas.severity.label")
      }}</span>
      <FilterChip
        v-for="opt in severityOptions"
        :key="opt.value"
        :label="opt.label"
        :active="severityFilter === opt.value"
        :data-testid="`events-severity-${opt.value}`"
        @click="setSeverity(opt.value)"
      />
      <Switcher
        :label="$t('atlas.logs.show_acknowledged')"
        :selected="showAcknowledged"
        data-testid="events-show-ack-toggle"
        @onSelect="showAcknowledged = !showAcknowledged"
      />
    </div>

    <Loader v-show="loading" />
    <DataTable
      v-show="!loading"
      :columns="columns"
      :rows="events"
      row-key="id"
      :empty-text="$t('atlas.review.events.empty_state')"
    >
      <template #cell-severity="{ value }">
        <StatusBadge :label="value" :variant="severityVariant(value)" />
      </template>
      <template #cell-acknowledged_at="{ row }">
        <button
          v-if="!row.acknowledged_at"
          class="events-ack-btn bg-support-100 t-support-400"
          :data-testid="`events-ack-${row.id}`"
          @click.stop="acknowledge(row)"
        >
          <FontAwesomeIcon icon="check" />
          {{ $t("atlas.review.events.acknowledge_button") }}
        </button>
        <span v-else class="t-basic-500 fs-200">{{ row.acknowledged_at }}</span>
      </template>
    </DataTable>
  </div>
</template>

<script>
import { useNotifyStore } from "@/stores/notify";
import { extractApiMessage } from "@/composables/useFormErrors";
import {
  GET_IntegrationEvents,
  POST_AcknowledgeEvent,
} from "@/api/atlas/api";

const SEVERITY_VARIANTS = {
  critical: "negative",
  warning: "warning",
  info: "informative",
};

export default {
  name: "EventsMode",
  props: {
    filters: { type: Object, required: true },
  },
  setup() {
    return { notify: useNotifyStore() };
  },
  data() {
    return {
      events: [],
      loading: false,
      severityFilter: "__all",
      showAcknowledged: false,
    };
  },
  computed: {
    severityOptions() {
      return [
        { value: "__all", label: this.$t("common.all") },
        { value: "critical", label: this.$t("atlas.severity.critical") },
        { value: "warning", label: this.$t("atlas.severity.warning") },
        { value: "info", label: this.$t("atlas.severity.info") },
      ];
    },
    columns() {
      return [
        {
          key: "created_at",
          label: this.$t("atlas.logs.col.created"),
          width: "1fr",
        },
        {
          key: "severity",
          label: this.$t("atlas.severity.label"),
          width: "100px",
        },
        {
          key: "source_idx",
          label: this.$t("atlas.review.list.col.supplier"),
          width: "120px",
        },
        {
          key: "event_type",
          label: this.$t("atlas.logs.col.event_type"),
          width: "1.5fr",
        },
        {
          key: "message",
          label: this.$t("atlas.logs.col.message"),
          width: "2fr",
        },
        { key: "acknowledged_at", label: "", width: "160px" },
      ];
    },
  },
  watch: {
    filters: {
      handler() {
        this.fetchEvents();
      },
      deep: true,
    },
    severityFilter() {
      this.fetchEvents();
    },
    showAcknowledged() {
      this.fetchEvents();
    },
  },
  mounted() {
    this.fetchEvents();
  },
  methods: {
    severityVariant(value) {
      return SEVERITY_VARIANTS[value] || "neutral";
    },
    setSeverity(val) {
      this.severityFilter = val;
    },
    async fetchEvents() {
      this.loading = true;
      try {
        const params = { page_size: 50 };
        if (this.filters.supplier && this.filters.supplier !== "__all") {
          params.source = this.filters.supplier;
        }
        if (this.filters.search) params.search = this.filters.search;
        if (this.severityFilter !== "__all")
          params.severity = this.severityFilter;
        if (!this.showAcknowledged) params.acknowledged = false;
        const { data } = await GET_IntegrationEvents(params);
        this.events = data.results || [];
      } catch (err) {
        this.notify.spawnNotification({
          type: "negative",
          msg: extractApiMessage(err, this.$t("notifications.error")),
        });
      } finally {
        this.loading = false;
      }
    },
    async acknowledge(row) {
      try {
        await POST_AcknowledgeEvent(row.id);
        this.notify.spawnNotification({
          type: "positive",
          msg: this.$t("atlas.logs.ack_success"),
        });
        this.fetchEvents();
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
.events-mode {
  display: flex;
  flex-direction: column;
}
.events-ack-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  border: none;
  border-radius: var(--radius-sm);
  padding: 4px 8px;
  font-size: var(--fs-200);
  font-weight: 600;
  cursor: pointer;
}
.events-ack-btn:hover {
  opacity: 0.85;
}
</style>
