<template>
  <PageLayout class="fs-300 t-body">
    <template #header>
      <PageHeader :title="$t('access.applications.title')">
        <template #meta>
          <p class="t-muted fs-200 m-0">{{ $t("access.applications.help") }}</p>
        </template>
      </PageHeader>
    </template>
    <Loader block v-if="loading" />

    <DataTable
      v-else
      :columns="columns"
      :rows="applications"
      row-key="id"
      :row-attrs="(row) => ({ 'data-testid': `application-row-${row.id}` })"
      :empty-text="$t('access.applications.empty')"
      empty-size="md"
      @row-click="openApplication"
    >
      <template #cell-name="{ row }">
        <div class="flex ai-ct flex-wrap gap-2">
          <router-link :to="applicationLink(row)" class="fw-600 t-accent" @click.stop>{{ row.name }}</router-link>
          <Tag v-if="row.legacy" :label="$t('access.tokens.legacy')" />
        </div>
      </template>
      <template #cell-is_active="{ row }">
        <StatusBadge
          :tone="row.is_active ? 'positive' : 'neutral'"
          :label="row.is_active ? $t('common.active') : $t('common.inactive')"
        />
      </template>
      <template #cell-token_count="{ row }">{{ row.token_count ?? "—" }}</template>
    </DataTable>

    <FloatingActions :actions="fabActions" />
  </PageLayout>
</template>

<script>
import { useNotifyStore } from "@/stores/notify";
import { GET_AccessAllApplications, GET_AccessAllTokens } from "@/api/access/api";
import { extractApiMessage } from "@/composables/useFormErrors";

// Applications (django-access): the machine clients that hold API tokens, with their state, token count and whether
// they carry imported legacy keys. The application list answers neither, so each application's tokens are read — a
// failed read leaves that row's count empty, never the list.

async function tokenSummary(application) {
  try {
    const tokens = await GET_AccessAllTokens(application.id);
    return { token_count: tokens.length, legacy: tokens.some((token) => token.legacy) };
  } catch {
    return { token_count: null, legacy: false };
  }
}

export default {
  name: "AccessApplicationList",
  setup() {
    return { notify: useNotifyStore() };
  },
  data() {
    return { applications: [], loading: false };
  },
  computed: {
    columns() {
      return [
        { key: "name", label: this.$t("access.applications.name"), width: "1fr", truncate: true },
        { key: "is_active", label: this.$t("access.applications.state"), width: "max-content" },
        { key: "token_count", label: this.$t("access.applications.tokens"), width: "120px", numeric: true, priority: 2 },
      ];
    },
    fabActions() {
      return [
        { icon: "add", label: this.$t("access.applications.create"), handler: () => this.$router.push("/access/applications/new") },
      ];
    },
  },
  mounted() {
    this.fetchApplications();
  },
  methods: {
    applicationLink(row) {
      return `/access/applications/${row.id}`;
    },
    openApplication(row) {
      this.$router.push(this.applicationLink(row));
    },
    async fetchApplications() {
      this.loading = true;
      try {
        const applications = await GET_AccessAllApplications();
        const summaries = await Promise.all(applications.map(tokenSummary));
        this.applications = applications.map((application, i) => ({ ...application, ...summaries[i] }));
      } catch (err) {
        this.notify.spawnNotification({ type: "negative", msg: extractApiMessage(err, this.$t("notifications.error")) });
      } finally {
        this.loading = false;
      }
    },
  },
};
</script>
