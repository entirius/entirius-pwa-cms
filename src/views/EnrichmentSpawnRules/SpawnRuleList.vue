<template>
  <div class="spawn-rules-list p-500 fs-300 t-basic-800 h-100 ov-h">
    <div
      class="bg-basic-100 b-basic-300 br-50 flex-1 ovy-auto pl-500 pt-500 pb-500 pr-500"
    >
      <div class="flex ai-ct mb-400">
        <h1 class="fs-700 fw-600">{{ $t("enrichment.spawn_rules.title") }}</h1>
      </div>

      <div class="spawn-rules-list__toolbar">
        <BasicInput
          v-model="search"
          :placeholder="$t('common.start_typing')"
          icon="search"
          class="spawn-rules-list__search"
          @input="debouncedFetch(searchAndFetch)"
        />
        <FilterChip
          :label="$t('enrichment.spawn_rules.only_active')"
          :active="onlyActive"
          data-test="spawn-rules-only-active"
          @click="toggleOnlyActive"
        />
      </div>

      <Loader v-show="loading" />

      <DataTable
        v-show="!loading"
        :columns="columns"
        :rows="rules"
        row-key="key"
        :empty-text="$t('enrichment.spawn_rules.empty')"
        @row-click="onRowClick"
      >
        <template #cell-auto="{ value }">
          <span
            class="chip"
            :class="value ? 'bg-support-100 t-support-400' : 'bg-basic-200 t-basic-500'"
          >
            {{ value ? $t("common.yes") : $t("common.no") }}
          </span>
        </template>
        <template #cell-active="{ value }">
          <span
            class="chip"
            :class="value ? 'bg-positive-100 t-positive-300' : 'bg-basic-200 t-basic-500'"
          >
            {{ value ? $t("common.yes") : $t("common.no") }}
          </span>
        </template>
        <template #cell-running="{ row }">
          <StatusBadge
            v-if="runningKeys.has(row.key)"
            :label="$t('enrichment.spawn_rules.running')"
            variant="informative"
          />
          <span v-else class="t-basic-400">—</span>
        </template>
        <template #cell-actions="{ row }">
          <BasicButton
            :text="$t('enrichment.spawn_rules.run_now')"
            class="bg-support-400 t-basic-100 fs-200"
            :data-test="`spawn-rule-run-${row.key}`"
            @click="runRule(row)"
          />
        </template>
      </DataTable>

      <FloatingActions :actions="fabActions" />
    </div>
    <Pagination
      v-if="totalCount > pageSize"
      :pagination="paginationState"
      class="mt-200"
      @onChangePage="onPageChange"
    />
  </div>
</template>

<script>
import { useLoaderStore } from "@/stores/loader";
import { useNotifyStore } from "@/stores/notify";
import { useSearchDebounce } from "@/composables/useSearchDebounce";
import { extractApiMessage } from "@/composables/useFormErrors";
import { GET_SpawnRules, GET_Tasks, POST_SpawnRuleRun } from "@/api/enrichment/api";

// Batch key prefix owned by the backend (spawn_rule_service.GAP_RULE_BATCH_PREFIX).
const GAP_RULE_PREFIX = "gaprule:";

export default {
  name: "SpawnRuleList",
  setup() {
    const loader = useLoaderStore();
    const notify = useNotifyStore();
    const { search, debouncedFetch } = useSearchDebounce();
    return { loader, notify, search, debouncedFetch };
  },
  data() {
    return {
      rules: [],
      runningKeys: new Set(),
      totalCount: 0,
      currentPage: 1,
      pageSize: 20,
      onlyActive: false,
      loading: false,
      busy: false,
    };
  },
  computed: {
    fabActions() {
      return [
        {
          icon: "plus",
          label: this.$t("enrichment.spawn_rules.create"),
          handler: () => this.$router.push("/enrichment/spawn-rules/new"),
        },
      ];
    },
    columns() {
      return [
        { key: "key", label: this.$t("enrichment.spawn_rules.col_key"), width: "1.5fr" },
        { key: "module", label: this.$t("enrichment.spawn_rules.col_module"), width: "90px" },
        { key: "check_key", label: this.$t("enrichment.spawn_rules.col_check"), width: "1.5fr" },
        { key: "task_type", label: this.$t("enrichment.spawn_rules.col_task_type"), width: "1fr" },
        { key: "auto", label: this.$t("enrichment.spawn_rules.col_auto"), width: "80px" },
        { key: "active", label: this.$t("enrichment.spawn_rules.col_active"), width: "80px" },
        { key: "running", label: this.$t("enrichment.spawn_rules.col_running"), width: "110px" },
        { key: "actions", label: "", width: "140px" },
      ];
    },
    paginationState() {
      return {
        page: this.currentPage,
        pages: Math.ceil(this.totalCount / this.pageSize),
      };
    },
  },
  watch: {
    "$route.query.page"(newPage) {
      this.currentPage = parseInt(newPage) || 1;
      this.fetchRules();
    },
  },
  mounted() {
    this.currentPage = parseInt(this.$route.query.page) || 1;
    this.fetchRules();
  },
  methods: {
    async fetchRules() {
      this.loading = true;
      try {
        const params = { page: this.currentPage, page_size: this.pageSize };
        if (this.search) params.search = this.search;
        if (this.onlyActive) params.active = true;

        const { data } = await GET_SpawnRules(params);
        this.rules = data.results || [];
        this.totalCount = data.count || 0;
        await this.fetchRunning();
      } catch (err) {
        this.notify.spawnNotification({
          type: "negative",
          msg: extractApiMessage(err, this.$t("notifications.error")),
        });
      } finally {
        this.loading = false;
      }
    },
    // One open + one in_progress page covers the realistic rule count; the task table is
    // rows-per-command, so two list calls beat N per-rule batch_key lookups.
    async fetchRunning() {
      try {
        const [open, inProgress] = await Promise.all([
          GET_Tasks({ status: "open", page_size: 100 }),
          GET_Tasks({ status: "in_progress", page_size: 100 }),
        ]);
        const keys = new Set();
        [...(open.data.results || []), ...(inProgress.data.results || [])].forEach((t) => {
          if ((t.batch_key || "").startsWith(GAP_RULE_PREFIX)) {
            keys.add(t.batch_key.slice(GAP_RULE_PREFIX.length));
          }
        });
        this.runningKeys = keys;
      } catch {
        this.runningKeys = new Set();
      }
    },
    async runRule(row) {
      if (this.busy) return;
      this.busy = true;
      try {
        const { data } = await POST_SpawnRuleRun(row.key);
        const map = {
          spawned: { type: "positive", key: "enrichment.spawn_rules.run_spawned" },
          already_running: { type: "informative", key: "enrichment.spawn_rules.run_already_running" },
          no_candidates: { type: "informative", key: "enrichment.spawn_rules.run_no_candidates" },
        };
        const outcome = map[data.status] || map.spawned;
        this.notify.spawnNotification({
          type: outcome.type,
          msg: this.$t(outcome.key, { id: data.task?.id ?? "" }),
        });
        await this.fetchRunning();
      } catch (err) {
        this.notify.spawnNotification({
          type: "negative",
          msg: extractApiMessage(err, this.$t("notifications.error")),
        });
      } finally {
        this.busy = false;
      }
    },
    searchAndFetch() {
      this.currentPage = 1;
      this.fetchRules();
    },
    toggleOnlyActive() {
      this.onlyActive = !this.onlyActive;
      this.searchAndFetch();
    },
    onPageChange(page) {
      this.$router.push({
        path: this.$route.path,
        query: { ...this.$route.query, page: String(page) },
      });
    },
    onRowClick(row) {
      this.$router.push(`/enrichment/spawn-rules/${row.key}`);
    },
  },
};
</script>

<style lang="scss" scoped>
.spawn-rules-list {
  display: flex;
  flex-direction: column;
}
.spawn-rules-list__toolbar {
  display: flex;
  align-items: center;
  gap: var(--space-200);
  margin-bottom: var(--space-400);
  flex-wrap: wrap;
}
.spawn-rules-list__search {
  flex: 1;
  min-width: 150px;
  max-width: 400px;
}
</style>
