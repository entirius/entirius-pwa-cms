<template>
  <div class="cf-lead-list__wrapper p-500 fs-300 t-basic-800 h-100 ov-h">
    <div
      class="bg-basic-100 b-basic-300 br-50 h-100 ovy-auto pl-500 pt-500 pb-500 pr-500"
    >
      <div class="flex ai-ct mb-400">
        <h1 class="fs-700 fw-600">{{ $t("cf.leads") }}</h1>
      </div>

      <div class="flex ai-ct gap-300 mb-400">
        <BasicInput
          v-model="search"
          :placeholder="$t('cf.search_placeholder')"
          icon="search"
          class="cf-list__search"
          @input="debouncedFetch(searchAndFetch)"
        />
        <Dropdown
          :values="channelOptions"
          :selected="[channelFilter]"
          :placeholder="$t('cf.channel')"
          class="cf-list__filter"
          @onSelect="onChannelFilter"
        />
      </div>

      <div class="flex ai-ct mb-400">
        <MobileFilterPanel
          :active-count="statusFilter === '__all' ? 0 : 1"
          :trigger-label="$t('cf.filters')"
        >
          <p class="fs-200 t-basic-600">{{ $t("cf.filters") }}</p>
          <FilterChip
            v-for="opt in statusFilterOptions"
            :key="opt.value"
            :label="opt.label"
            :active="statusFilter === opt.value"
            @click="onStatusFilter(opt.value)"
          />
        </MobileFilterPanel>
      </div>

      <Loader v-show="loading" />

      <DataTable
        v-show="!loading"
        :columns="columns"
        :rows="leads"
        row-key="id"
        :empty-text="$t('cf.no_leads')"
        @row-click="onRowClick"
      >
        <template #cell-status="{ value }">
          <StatusBadge
            :label="leadStatusLabel($t, value)"
            :variant="leadStatusVariant(value)"
          />
        </template>
        <template #cell-deal_value="{ value }">
          <span v-if="value">{{ value }}</span>
          <span v-else class="t-basic-400">---</span>
        </template>
        <template #cell-contact_date="{ value }">
          {{ formatDateTime(value) }}
        </template>
        <template #cell-source_type="{ value }">
          {{ sourceTypeLabel(value) }}
        </template>
        <template #cell-ads_conversion_imported="{ value }">
          <span
            v-if="value"
            class="cf-ads-imported"
            :title="$t('cf.ads_imported_tooltip')"
          >
            <font-awesome-icon icon="bullseye" />
          </span>
          <span v-else class="t-basic-400">---</span>
        </template>
      </DataTable>

      <Pagination
        v-if="totalCount > pageSize"
        :pagination="paginationState"
        @onChangePage="onPageChange"
      />
    </div>
  </div>
</template>

<script>
import { useLoaderStore } from "@/stores/loader";
import { useNotifyStore } from "@/stores/notify";
import { usePimChannelStore } from "@/stores/pimChannel";
import { useSearchDebounce } from "@/composables/useSearchDebounce";
import { GET_Leads } from "@/api/contactForms/api";
import {
  LEAD_STATUSES,
  leadStatusLabel,
  leadStatusVariant,
} from "./helpers/leadStatus";
import { extractApiMessage } from "@/composables/useFormErrors";

export default {
  name: "LeadList",
  setup() {
    const loader = useLoaderStore();
    const notify = useNotifyStore();
    const pimChannel = usePimChannelStore();
    const { search, debouncedFetch } = useSearchDebounce();
    return { loader, notify, pimChannel, search, debouncedFetch };
  },
  data() {
    return {
      leads: [],
      totalCount: 0,
      currentPage: 1,
      pageSize: 20,
      loading: false,
      channelFilter: "__all",
      statusFilter: "__all",
    };
  },
  computed: {
    channelOptions() {
      const opts = [{ label: this.$t("cf.all_channels"), value: "__all" }];
      for (const ch of this.pimChannel.channels) {
        opts.push({ label: `${ch.name || ch.idx} [${ch.idx}]`, value: ch.idx });
      }
      return opts;
    },
    statusFilterOptions() {
      const opts = [{ label: this.$t("cf.statuses.all"), value: "__all" }];
      for (const st of LEAD_STATUSES) {
        opts.push({ label: this.$t(`cf.statuses.${st}`), value: st });
      }
      return opts;
    },
    columns() {
      return [
        { key: "name", label: this.$t("cf.name"), width: "1fr" },
        { key: "email", label: this.$t("cf.email"), width: "1fr" },
        { key: "status", label: this.$t("cf.status"), width: "120px" },
        {
          key: "source_type",
          label: this.$t("cf.source_type"),
          width: "140px",
        },
        {
          key: "deal_value",
          label: this.$t("cf.deal_value"),
          width: "120px",
        },
        {
          key: "contact_date",
          label: this.$t("cf.contact_date"),
          width: "180px",
        },
        {
          key: "ads_conversion_imported",
          label: this.$t("cf.ads_imported"),
          width: "100px",
        },
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
      this.fetchLeads();
    },
  },
  async mounted() {
    if (!this.pimChannel.channels.length) {
      await this.pimChannel.fetchChannels();
    }
    this.currentPage = parseInt(this.$route.query.page) || 1;
    this.fetchLeads();
  },
  methods: {
    leadStatusLabel,
    leadStatusVariant,
    formatDateTime(iso) {
      if (!iso) return "---";
      const d = new Date(iso);
      return d.toLocaleString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    },
    sourceTypeLabel(value) {
      if (!value) return "---";
      const key = `cf.source_types.${value}`;
      const translated = this.$t(key);
      return translated !== key ? translated : value;
    },
    onChannelFilter(value) {
      this.channelFilter = value;
      this.currentPage = 1;
      this.fetchLeads();
    },
    onStatusFilter(value) {
      this.statusFilter = value;
      this.currentPage = 1;
      this.fetchLeads();
    },
    async fetchLeads() {
      this.loading = true;
      try {
        const params = { page: this.currentPage, page_size: this.pageSize };
        if (this.search) params.search = this.search;
        if (this.channelFilter !== "__all") params.channel = this.channelFilter;
        if (this.statusFilter !== "__all") params.status = this.statusFilter;

        const { data } = await GET_Leads(params);
        this.leads = data.results || [];
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
    searchAndFetch() {
      this.currentPage = 1;
      this.fetchLeads();
    },
    onPageChange(page) {
      this.$router.push({
        path: this.$route.path,
        query: { ...this.$route.query, page: String(page) },
      });
    },
    onRowClick(row) {
      this.$router.push(`/forms/leads/${row.id}`);
    },
  },
};
</script>

<style lang="scss" scoped>
.cf-list__search {
  flex: 1;
  max-width: 400px;
  min-width: 150px;
}

.cf-list__filter {
  min-width: 180px;
  max-width: 240px;
  flex-shrink: 0;
}

.cf-ads-imported {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: var(--radius-sm);
  background: var(--c-positive-100);
  color: var(--c-positive-300);
}

@media only screen and (max-width: 768px) {
  .cf-lead-list__wrapper {
    padding: 16px !important;
  }
}
</style>
