<template>
  <div class="p-500 fs-300 t-basic-800 h-100 ov-h">
    <div
      class="bg-basic-100 b-basic-300 br-50 h-100 ovy-auto pl-500 pt-500 pb-500 pr-500"
    >
      <div class="flex ai-ct mb-400">
        <h1 class="fs-700 fw-600 flex-1">{{ $t("agm.people_list") }}</h1>
        <BasicButton
          v-if="mode === 'marketing_lists'"
          :text="$t('agm.download_csv')"
          class="btn-outline"
          @click="downloadCSV"
        />
      </div>

      <div class="mb-400">
        <BasicTabs
          v-model="mode"
          :options="[
            { value: 'people', label: $t('agm.tab_people') },
            { value: 'marketing_lists', label: $t('agm.tab_marketing_lists') },
          ]"
        />
      </div>

      <!-- People tab -->
      <template v-if="mode === 'people'">
        <div class="flex ai-ct gap-300 mb-400">
          <BasicInput
            v-model="search"
            :placeholder="$t('agm.search_by_email')"
            icon="search"
            class="consent-people__search"
            @input="debouncedFetch(searchAndFetch)"
          />
        </div>

        <Loader v-show="loading" />

        <DataTable
          v-show="!loading"
          :columns="columns"
          :rows="people"
          row-key="email"
          :empty-text="$t('agm.no_people')"
          @row-click="onRowClick"
        >
          <template #cell-last_activity="{ value }">
            <span>{{ formatDate(value) }}</span>
          </template>
        </DataTable>

        <Pagination
          v-if="totalCount > pageSize"
          :pagination="paginationState"
          @onChangePage="onPageChange"
        />
      </template>

      <!-- Marketing Lists tab -->
      <template v-if="mode === 'marketing_lists'">
        <Loader v-show="subscribersLoading" />

        <template v-if="!subscribersLoading">
          <p v-if="!subscriberGroups.length" class="t-basic-500">
            {{ $t("agm.no_subscribers") }}
          </p>

          <div
            v-for="group in subscriberGroups"
            :key="group.slug"
            class="mb-500"
          >
            <div class="flex ai-ct gap-200 mb-300">
              <h2 class="fs-400 fw-600">{{ group.name }}</h2>
              <span class="consent-people__count-badge fs-200 t-basic-500">
                {{ group.items.length }} {{ $t("agm.subscribers_count") }}
              </span>
            </div>
            <DataTable
              :columns="subscriberColumns"
              :rows="group.items"
              row-key="email"
              :empty-text="$t('agm.no_subscribers')"
            >
              <template #cell-granted_at="{ value }">
                <span>{{ formatDate(value) }}</span>
              </template>
            </DataTable>
          </div>
        </template>
      </template>
    </div>
  </div>
</template>

<script>
import { useLoaderStore } from "@/stores/loader";
import { useNotifyStore } from "@/stores/notify";
import { useSearchDebounce } from "@/composables/useSearchDebounce";
import {
  GET_People,
  GET_MarketingSubscribers,
  GET_MarketingSubscribersExport,
} from "@/api/agreements/api";
import { extractApiMessage } from "@/composables/useFormErrors";

export default {
  name: "ConsentPeople",
  setup() {
    const loader = useLoaderStore();
    const notify = useNotifyStore();
    const { search, debouncedFetch } = useSearchDebounce();
    return { loader, notify, search, debouncedFetch };
  },
  data() {
    return {
      mode: "people",
      people: [],
      totalCount: 0,
      currentPage: 1,
      pageSize: 20,
      loading: false,
      subscribers: [],
      subscribersLoading: false,
    };
  },
  computed: {
    columns() {
      return [
        {
          key: "email",
          label: this.$t("agm.email"),
          sortable: false,
          width: "2fr",
        },
        {
          key: "consent_count",
          label: this.$t("agm.consent_count"),
          sortable: false,
          width: "120px",
        },
        {
          key: "last_activity",
          label: this.$t("agm.last_activity"),
          sortable: false,
          width: "180px",
        },
      ];
    },
    subscriberColumns() {
      return [
        {
          key: "email",
          label: this.$t("agm.email"),
          sortable: false,
          width: "2fr",
        },
        {
          key: "granted_at",
          label: this.$t("agm.date"),
          sortable: false,
          width: "180px",
        },
        {
          key: "channel_idx",
          label: this.$t("agm.channel"),
          sortable: false,
          width: "140px",
        },
      ];
    },
    paginationState() {
      return {
        page: this.currentPage,
        pages: Math.ceil(this.totalCount / this.pageSize),
      };
    },
    subscriberGroups() {
      const groups = {};
      for (const sub of this.subscribers) {
        const key = sub.agreement_slug;
        if (!groups[key]) {
          groups[key] = {
            slug: key,
            name: sub.agreement_name || key,
            items: [],
          };
        }
        groups[key].items.push(sub);
      }
      return Object.values(groups);
    },
  },
  watch: {
    "$route.query.page"(newPage) {
      this.currentPage = parseInt(newPage) || 1;
      this.fetchPeople();
    },
    mode(val) {
      if (val === "marketing_lists" && !this.subscribers.length) {
        this.fetchSubscribers();
      }
    },
  },
  mounted() {
    this.currentPage = parseInt(this.$route.query.page) || 1;
    this.fetchPeople();
  },
  methods: {
    formatDate(dateStr) {
      if (!dateStr) return "---";
      return new Date(dateStr).toLocaleString();
    },
    async fetchPeople() {
      this.loading = true;
      try {
        const params = { page: this.currentPage, page_size: this.pageSize };
        if (this.search) params.search = this.search;

        const { data } = await GET_People(params);
        this.people = data.results || [];
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
    async fetchSubscribers() {
      this.subscribersLoading = true;
      try {
        const { data } = await GET_MarketingSubscribers();
        this.subscribers = data.results || data || [];
      } catch (err) {
        this.notify.spawnNotification({
          type: "negative",
          msg: extractApiMessage(err, this.$t("notifications.error")),
        });
      } finally {
        this.subscribersLoading = false;
      }
    },
    async downloadCSV() {
      try {
        const response = await GET_MarketingSubscribersExport();
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", "marketing-subscribers.csv");
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
      } catch (err) {
        this.notify.spawnNotification({
          type: "negative",
          msg: extractApiMessage(err, this.$t("notifications.error")),
        });
      }
    },
    searchAndFetch() {
      this.currentPage = 1;
      this.fetchPeople();
    },
    onPageChange(page) {
      this.$router.push({
        path: this.$route.path,
        query: { ...this.$route.query, page: String(page) },
      });
    },
    onRowClick(row) {
      this.$router.push(
        `/agreements/consents/${encodeURIComponent(row.email)}`
      );
    },
  },
};
</script>

<style lang="scss" scoped>
.consent-people__search {
  flex: 1;
  max-width: 400px;
}

.consent-people__count-badge {
  background: var(--c-basic-200);
  border: 1px solid var(--c-basic-300);
  border-radius: var(--radius-sm);
  padding: 2px 8px;
}
</style>
