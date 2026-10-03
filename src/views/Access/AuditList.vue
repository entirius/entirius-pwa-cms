<template>
  <PageLayout class="fs-300 t-body">
    <template #header>
      <PageHeader :title="$t('access.audit.title')" />
    </template>
    <template #toolbar>
      <div class="flex ai-ct flex-wrap gap-5">
        <MobileFilterPanel :active-count="activeFilterCount" :trigger-label="$t('access.audit.filters')">
          <BasicSelect
            :floating-label="$t('access.audit.action')"
            :options="actionOptions"
            :model-value="filters.action"
            clearable
            class="audit-list__filter"
            data-testid="audit-action-filter"
            @update:model-value="setFilter('action', $event)"
          />
          <BasicSelect
            :floating-label="$t('access.audit.actor')"
            :options="actorOptions"
            :model-value="filters.actor"
            searchable
            clearable
            class="audit-list__filter"
            @update:model-value="setFilter('actor', $event)"
          />
          <FormField :label="$t('access.audit.from')" layout="inline">
            <BasicDatePicker :model-value="filters.from" @update:model-value="setFilter('from', $event)" />
          </FormField>
          <FormField :label="$t('access.audit.to')" layout="inline">
            <BasicDatePicker :model-value="filters.to" @update:model-value="setFilter('to', $event)" />
          </FormField>
          <FilterChip
            :label="$t('access.audit.group_bypass')"
            :active="groupBypassRows"
            data-testid="audit-group-bypass"
            @click="groupBypassRows = !groupBypassRows"
          />
        </MobileFilterPanel>
      </div>
    </template>

    <Loader block v-if="loading" />

    <DataTable
      v-else
      :columns="columns"
      :rows="rows"
      row-key="id"
      :row-attrs="(row) => ({ 'data-testid': `audit-row-${row.action}` })"
      :empty-text="$t('access.audit.empty')"
      empty-size="md"
      expandable
    >
      <template #cell-created_at="{ value }">{{ formatDate(value) }}</template>
      <template #cell-action="{ row }">
        {{ actionLabel(row.action) }}<template v-if="row.grouped"> × {{ row.grouped.length }}</template>
      </template>
      <template #expand="{ row }">
        <pre class="audit-list__detail fs-200 m-0">{{ JSON.stringify(row.detail, null, 2) }}</pre>
      </template>
    </DataTable>

    <template #footer>
      <Pagination v-if="pages > 1" :page="page" :pages="pages" @update:page="changePage" />
    </template>
  </PageLayout>
</template>

<script>
import { useNotifyStore } from "@/stores/notify";
import { extractApiMessage } from "@/composables/useFormErrors";
import { formatDate } from "@/utils/format";
import { GET_AccessAudit, GET_AccessStaff } from "@/api/access/api";
import { AUDIT_ACTIONS, AUDIT_PAGE_SIZE, BYPASS, auditParams, groupBypass } from "./audit";

// The access audit log (django-access), newest first. Labels, targets and details are what users typed or the server
// stored — rendered as text only. A superuser's writes through the gate (`gate.bypass`, one per request) fold into
// one row per actor and day unless that action is the filter or the chip is off.
const STAFF_PAGE_SIZE = 100;

export default {
  name: "AccessAuditList",
  setup() {
    return { notify: useNotifyStore() };
  },
  data() {
    return {
      entries: [],
      count: 0,
      page: 1,
      loading: false,
      staff: [],
      filters: { action: null, actor: null, from: "", to: "" },
      groupBypassRows: true,
    };
  },
  computed: {
    columns() {
      return [
        { key: "created_at", label: this.$t("access.audit.time"), width: "160px" },
        { key: "actor_label", label: this.$t("access.audit.actor"), width: "160px", truncate: true, priority: 2 },
        { key: "action", label: this.$t("access.audit.action"), width: "max-content" },
        { key: "target", label: this.$t("access.audit.target"), width: "1fr", truncate: true, priority: 2 },
        { key: "ip", label: this.$t("access.audit.ip"), width: "140px", priority: 2 },
      ];
    },
    rows() {
      const grouping = this.groupBypassRows && this.filters.action !== BYPASS;
      const rows = grouping ? groupBypass(this.entries) : this.entries;
      return rows.map((row) => ({ ...row, target: this.targetLabel(row) }));
    },
    pages() {
      return Math.ceil(this.count / AUDIT_PAGE_SIZE);
    },
    actionOptions() {
      return AUDIT_ACTIONS.map((action) => ({ label: this.actionLabel(action), value: action }));
    },
    actorOptions() {
      return this.staff.map((user) => ({ label: user.name ? `${user.name} (${user.username})` : user.username, value: user.id }));
    },
    activeFilterCount() {
      return Object.values(this.filters).filter(Boolean).length;
    },
  },
  mounted() {
    this.fetchAudit();
    this.fetchStaff();
  },
  methods: {
    formatDate,
    actionLabel(action) {
      const key = `access.audit.actions.${action}`;
      return this.$t(key) === key ? action : this.$t(key);
    },
    targetLabel(row) {
      if (row.grouped) return this.$t("access.audit.requests", { count: row.grouped.length });
      return row.target_label || `${row.target_type} ${row.target_id}`;
    },
    setFilter(name, value) {
      this.filters[name] = value || (name === "from" || name === "to" ? "" : null);
      this.page = 1;
      this.fetchAudit();
    },
    changePage(page) {
      this.page = page;
      this.fetchAudit();
    },
    async fetchAudit() {
      this.loading = true;
      try {
        const { data } = await GET_AccessAudit(auditParams({ page: this.page, ...this.filters }));
        this.entries = data.results || [];
        this.count = data.count || 0;
      } catch (err) {
        this.notify.spawnNotification({ type: "negative", msg: extractApiMessage(err, this.$t("notifications.error")) });
      } finally {
        this.loading = false;
      }
    },
    async fetchStaff() {
      try {
        this.staff = (await GET_AccessStaff({ page_size: STAFF_PAGE_SIZE })).data.results || [];
      } catch {
        // No actor choices: the other filters still work.
      }
    },
  },
};
</script>

<style lang="scss" scoped>
.audit-list__filter {
  min-width: 180px;
  max-width: 240px;
  flex-shrink: 0;
}

.audit-list__detail {
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  color: var(--text-body);
}
</style>
