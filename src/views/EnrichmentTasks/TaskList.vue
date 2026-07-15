<template>
  <div class="task-list p-500 fs-300 t-basic-800 h-100 ov-h">
    <div
      class="bg-basic-100 b-basic-300 br-50 flex-1 ovy-auto pl-500 pt-500 pb-500 pr-500"
    >
      <div class="flex ai-ct mb-400">
        <h1 class="fs-700 fw-600">{{ $t("enrichment.tasks.title") }}</h1>
      </div>

      <div class="flex ai-ct flex-wrap gap-100 mb-400">
        <FilterChip
          v-for="opt in statusOptions"
          :key="opt.value"
          :label="opt.label"
          :active="statusFilter === opt.value"
          :data-testid="`enrichment-task-status-${opt.value}`"
          @click="onFilterChange(opt.value)"
        />
        <span class="fs-200 t-basic-500 ml-auto">
          {{ $t("enrichment.tasks.matching", { count: totalCount }) }}
        </span>
      </div>

      <Loader v-show="loading" />

      <DataTable
        v-show="!loading"
        :columns="columns"
        :rows="tasks"
        row-key="id"
        :empty-text="$t('enrichment.tasks.empty')"
        @row-click="openQueue"
      >
        <template #cell-status="{ value }">
          <StatusBadge
            :label="$t(`enrichment.task_status.${value}`)"
            :variant="statusVariant(value)"
          />
        </template>
        <template #cell-progress="{ row }">
          <span class="t-basic-600">{{ formatCounts(row.counts) }}</span>
        </template>
        <template #cell-created="{ row }">
          <span class="fs-200 t-basic-500">{{ formatDate(row.created_at) }}</span>
        </template>
      </DataTable>
    </div>

    <Pagination
      v-if="totalCount > pageSize"
      :pagination="paginationState"
      class="mt-200"
      @onChangePage="onPageChange"
    />

    <TaskQueueDrawer
      :visible="queueVisible"
      :task-id="queueTaskId"
      :task-label="queueLabel"
      @close="closeQueue"
    />
  </div>
</template>

<script>
import { useNotifyStore } from "@/stores/notify";
import { extractApiMessage } from "@/composables/useFormErrors";
import { GET_Tasks } from "@/api/enrichment/api";
import { formatDate } from "@/utils/format";
import TaskQueueDrawer from "./TaskQueueDrawer.vue";

// Mirrors django_enrichment.enums.TaskStatus.
const TASK_STATUSES = ["open", "in_progress", "done", "cancelled", "failed"];
const STATUS_VARIANT = {
  open: "informative",
  in_progress: "warning",
  done: "positive",
  cancelled: "neutral",
  failed: "negative",
};

export default {
  name: "TaskList",
  components: { TaskQueueDrawer },
  setup() {
    const notify = useNotifyStore();
    return { notify, formatDate };
  },
  data() {
    return {
      tasks: [],
      totalCount: 0,
      currentPage: 1,
      pageSize: 20,
      statusFilter: this.$route.query.status || "open",
      loading: false,
      queueVisible: false,
      queueTaskId: null,
      queueLabel: "",
    };
  },
  computed: {
    statusOptions() {
      return [
        { value: "__all", label: this.$t("common.all") },
        ...TASK_STATUSES.map((s) => ({
          value: s,
          label: this.$t(`enrichment.task_status.${s}`),
        })),
      ];
    },
    columns() {
      return [
        { key: "id", label: this.$t("enrichment.tasks.col_id"), width: "70px" },
        { key: "type", label: this.$t("enrichment.tasks.col_type"), width: "1fr" },
        { key: "check", label: this.$t("enrichment.tasks.col_check"), width: "1.2fr" },
        { key: "rule", label: this.$t("enrichment.tasks.col_rule"), width: "1.2fr" },
        { key: "status", label: this.$t("enrichment.tasks.col_status"), width: "120px" },
        { key: "progress", label: this.$t("enrichment.tasks.col_progress"), width: "1fr" },
        { key: "created", label: this.$t("enrichment.tasks.col_created"), width: "170px" },
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
      this.fetchTasks();
    },
  },
  mounted() {
    this.currentPage = parseInt(this.$route.query.page) || 1;
    this.fetchTasks();
  },
  methods: {
    async fetchTasks() {
      this.loading = true;
      try {
        const params = { page: this.currentPage, page_size: this.pageSize };
        if (this.statusFilter !== "__all") params.status = this.statusFilter;
        const { data } = await GET_Tasks(params);
        // Flatten nested fields the DataTable can't reach via row[col.key].
        this.tasks = (data.results || []).map((t) => ({
          id: t.id,
          type: t.type,
          status: t.status,
          counts: t.counts,
          created_at: t.created_at,
          check: t.scope_spec?.check ?? "—",
          rule: t.params?.spawn_rule ?? "—",
        }));
        this.totalCount = data.count || 0;
      } catch (err) {
        this.notify.spawnNotification({
          type: "negative",
          msg: extractApiMessage(err, this.$t("notifications.error")),
        });
      } finally {
        this.loading = false;
      }
    },
    statusVariant(status) {
      return STATUS_VARIANT[status] || "neutral";
    },
    formatCounts(counts) {
      const entries = Object.entries(counts || {});
      return entries.length
        ? entries.map(([k, v]) => `${k}: ${v}`).join(", ")
        : "—";
    },
    onFilterChange(value) {
      this.statusFilter = value;
      this.currentPage = 1;
      this.$router.replace({
        path: this.$route.path,
        query: { ...this.$route.query, status: value },
      });
      this.fetchTasks();
    },
    onPageChange(page) {
      this.$router.push({
        path: this.$route.path,
        query: { ...this.$route.query, page: String(page) },
      });
    },
    openQueue(row) {
      this.queueTaskId = row.id;
      this.queueLabel = row.rule !== "—" ? row.rule : row.type;
      this.queueVisible = true;
    },
    closeQueue() {
      this.queueVisible = false;
    },
  },
};
</script>

<style lang="scss" scoped>
.task-list {
  display: flex;
  flex-direction: column;
}
</style>
