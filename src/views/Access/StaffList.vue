<template>
  <PageLayout class="fs-300 t-body">
    <template #header>
      <PageHeader :title="$t('access.staff.title')">
        <template #meta>
          <p class="t-muted fs-200 m-0" data-testid="staff-help">{{ $t("access.staff.help") }}</p>
        </template>
      </PageHeader>
    </template>
    <template #toolbar>
      <div class="flex ai-ct flex-wrap gap-5">
        <BasicInput
          v-model="search"
          :placeholder="$t('access.staff.search')"
          :aria-label="$t('access.staff.search')"
          icon="search"
          class="staff-list__search"
          data-testid="staff-search"
          @input="debouncedFetch(searchAndFetch)"
        />
      </div>
    </template>

    <Loader block v-if="loading" />

    <DataTable
      v-else
      :columns="columns"
      :rows="staff"
      row-key="id"
      :row-attrs="(row) => ({ 'data-testid': `staff-row-${row.username}` })"
      empty-size="md"
      @row-click="openUser"
    >
      <template #cell-name="{ row }">
        <router-link :to="userLink(row)" class="fw-600 t-accent" @click.stop>{{ row.name || row.username }}</router-link>
      </template>
      <template #cell-roles="{ row }">
        <div class="flex flex-wrap gap-2">
          <Tag v-if="row.is_superuser" :label="$t('access.staff.superuser')" data-testid="staff-superuser" />
          <Tag v-for="role in row.roles" :key="`${role.key}-${role.via_group}`" :label="roleLabel(role)" />
        </div>
      </template>
      <template #empty>
        <EmptyState icon="empty" size="md" :title="$t('access.staff.empty')" :message="$t('access.staff.help')" />
      </template>
    </DataTable>

    <template #footer>
      <Pagination v-if="pages > 1" :page="page" :pages="pages" @update:page="changePage" />
    </template>
  </PageLayout>
</template>

<script>
import { useNotifyStore } from "@/stores/notify";
import { useSearchDebounce } from "@/composables/useSearchDebounce";
import { extractApiMessage } from "@/composables/useFormErrors";
import { GET_AccessStaff } from "@/api/access/api";
import { roleLabel } from "./grants";

// Active staff accounts with their roles, direct and through groups (django-access). Accounts are created outside the
// CMS (Django admin, createsuperuser): the header and the empty state say so.
const PAGE_SIZE = 20;

export default {
  name: "AccessStaffList",
  setup() {
    return { notify: useNotifyStore(), ...useSearchDebounce() };
  },
  data() {
    return { staff: [], count: 0, page: 1, loading: false };
  },
  computed: {
    columns() {
      return [
        { key: "name", label: this.$t("access.staff.name"), width: "1fr", truncate: true },
        { key: "username", label: this.$t("access.staff.username"), width: "160px", priority: 2 },
        { key: "email", label: this.$t("access.staff.email"), width: "220px", priority: 2 },
        { key: "roles", label: this.$t("access.staff.roles"), width: "max-content" },
      ];
    },
    pages() {
      return Math.ceil(this.count / PAGE_SIZE);
    },
  },
  mounted() {
    this.fetchStaff();
  },
  methods: {
    roleLabel(role) {
      return roleLabel(role, this.$t);
    },
    userLink(row) {
      return `/access/staff/${row.id}`;
    },
    openUser(row) {
      this.$router.push(this.userLink(row));
    },
    searchAndFetch() {
      this.page = 1;
      this.fetchStaff();
    },
    changePage(page) {
      this.page = page;
      this.fetchStaff();
    },
    async fetchStaff() {
      this.loading = true;
      try {
        const params = { page: this.page, page_size: PAGE_SIZE, ...(this.search ? { search: this.search } : {}) };
        const { data } = await GET_AccessStaff(params);
        this.staff = data.results || [];
        this.count = data.count || 0;
      } catch (err) {
        this.notify.spawnNotification({ type: "negative", msg: extractApiMessage(err, this.$t("notifications.error")) });
      } finally {
        this.loading = false;
      }
    },
  },
};
</script>

<style lang="scss" scoped>
@import "@/assets/scss/utils/media-query";

.staff-list__search {
  flex: 1;
  max-width: 400px;
  min-width: 150px;

  @include max-tablet {
    flex-basis: 100%;
    max-width: none;
  }
}
</style>
