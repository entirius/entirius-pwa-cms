<template>
  <div class="cf-booking-list__wrapper p-500 fs-300 t-basic-800 h-100 ov-h">
    <div
      class="bg-basic-100 b-basic-300 br-50 h-100 ovy-auto pl-500 pt-500 pb-500 pr-500"
    >
      <div class="flex ai-ct mb-400">
        <h1 class="fs-700 fw-600">{{ $t("cf.bookings") }}</h1>
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
          :active-count="activeFilterCount"
          :trigger-label="$t('cf.filters')"
        >
          <p class="fs-200 t-basic-600">{{ $t("cf.filters") }}</p>

          <label class="cf-list__date-field">
            <span class="cf-list__date-label">{{ $t("cf.date_from") }}</span>
            <input
              v-model="dateFrom"
              type="date"
              class="cf-list__date-input"
              @change="searchAndFetch"
            />
          </label>

          <label class="cf-list__date-field">
            <span class="cf-list__date-label">{{ $t("cf.date_to") }}</span>
            <input
              v-model="dateTo"
              type="date"
              class="cf-list__date-input"
              @change="searchAndFetch"
            />
          </label>

          <Dropdown
            :values="leadStatusOptions"
            :selected="[leadStatusFilter]"
            :placeholder="$t('cf.lead_status')"
            class="cf-list__filter"
            @onSelect="onLeadStatusFilter"
          />
        </MobileFilterPanel>
      </div>

      <Loader v-show="loading" />

      <DataTable
        v-show="!loading"
        :columns="columns"
        :rows="bookings"
        row-key="id"
        :empty-text="$t('cf.no_bookings')"
        @row-click="onRowClick"
      >
        <template #cell-meeting_start="{ value }">
          {{ formatDateTime(value) }}
        </template>
        <template #cell-meeting_end="{ value }">
          {{ formatDateTime(value) }}
        </template>
        <template #cell-name="{ row }">
          <span v-if="row.name">{{ row.name }}</span>
          <span v-else class="t-basic-400">---</span>
        </template>
        <template #cell-linked_lead="{ value }">
          <StatusBadge
            v-if="value"
            :label="leadStatusLabel($t, value.status)"
            :variant="leadStatusVariant(value.status)"
          />
          <span v-else class="t-basic-400">{{ $t("cf.no_linked_lead") }}</span>
        </template>
        <template #cell-meet_link="{ value }">
          <a
            v-if="value"
            :href="value"
            target="_blank"
            rel="noopener noreferrer"
            class="cf-list__meet-link"
            :title="$t('cf.open_meet')"
            @click.stop
          >
            <font-awesome-icon icon="video" />
          </a>
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
import { GET_Bookings } from "@/api/contactForms/api";
import {
  LEAD_STATUSES,
  leadStatusLabel,
  leadStatusVariant,
} from "./helpers/leadStatus";
import { extractApiMessage } from "@/composables/useFormErrors";

export default {
  name: "BookingList",
  setup() {
    const loader = useLoaderStore();
    const notify = useNotifyStore();
    const pimChannel = usePimChannelStore();
    const { search, debouncedFetch } = useSearchDebounce();
    return { loader, notify, pimChannel, search, debouncedFetch };
  },
  data() {
    return {
      bookings: [],
      totalCount: 0,
      currentPage: 1,
      pageSize: 20,
      loading: false,
      channelFilter: "__all",
      leadStatusFilter: "__all",
      dateFrom: "",
      dateTo: "",
    };
  },
  computed: {
    activeFilterCount() {
      let count = 0;
      if (this.leadStatusFilter !== "__all") count += 1;
      if (this.dateFrom) count += 1;
      if (this.dateTo) count += 1;
      return count;
    },
    channelOptions() {
      const opts = [{ label: this.$t("cf.all_channels"), value: "__all" }];
      for (const ch of this.pimChannel.channels) {
        opts.push({ label: `${ch.name || ch.idx} [${ch.idx}]`, value: ch.idx });
      }
      return opts;
    },
    leadStatusOptions() {
      const opts = [
        { label: this.$t("cf.statuses.all"), value: "__all" },
      ];
      for (const st of LEAD_STATUSES) {
        opts.push({ label: this.$t(`cf.statuses.${st}`), value: st });
      }
      return opts;
    },
    columns() {
      return [
        {
          key: "meeting_start",
          label: this.$t("cf.meeting_start"),
          width: "180px",
        },
        {
          key: "meeting_end",
          label: this.$t("cf.meeting_end"),
          width: "180px",
        },
        { key: "name", label: this.$t("cf.name"), width: "1fr" },
        { key: "email", label: this.$t("cf.email"), width: "1fr" },
        {
          key: "linked_lead",
          label: this.$t("cf.lead_status"),
          width: "140px",
        },
        { key: "meet_link", label: this.$t("cf.meet_link"), width: "80px" },
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
      this.fetchBookings();
    },
  },
  async mounted() {
    if (!this.pimChannel.channels.length) {
      await this.pimChannel.fetchChannels();
    }
    this.currentPage = parseInt(this.$route.query.page) || 1;
    this.fetchBookings();
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
    onChannelFilter(value) {
      this.channelFilter = value;
      this.currentPage = 1;
      this.fetchBookings();
    },
    onLeadStatusFilter(value) {
      this.leadStatusFilter = value;
      this.currentPage = 1;
      this.fetchBookings();
    },
    async fetchBookings() {
      this.loading = true;
      try {
        const params = { page: this.currentPage, page_size: this.pageSize };
        if (this.search) params.search = this.search;
        if (this.channelFilter !== "__all") params.channel = this.channelFilter;
        if (this.leadStatusFilter !== "__all") {
          params.lead_status = this.leadStatusFilter;
        }
        if (this.dateFrom) params.date_from = this.dateFrom;
        if (this.dateTo) params.date_to = this.dateTo;

        const { data } = await GET_Bookings(params);
        this.bookings = data.results || [];
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
      this.fetchBookings();
    },
    onPageChange(page) {
      this.$router.push({
        path: this.$route.path,
        query: { ...this.$route.query, page: String(page) },
      });
    },
    onRowClick(row) {
      this.$router.push(`/forms/bookings/${row.id}`);
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

.cf-list__date-field {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: var(--fs-200);
}

.cf-list__date-label {
  color: var(--c-basic-500);
  text-transform: uppercase;
  font-weight: 600;
}

.cf-list__date-input {
  height: var(--elem-height);
  padding: 0 var(--space-100);
  border: 1px solid var(--c-basic-400);
  border-radius: var(--space-50);
  background: var(--c-basic-100);
  color: var(--c-basic-800);
  font-size: var(--fs-300);
  min-width: 150px;
}

.cf-list__date-input:focus {
  outline: none;
  border-color: var(--c-support-400);
}

.cf-list__meet-link {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: var(--radius-sm);
  color: var(--c-support-400);
  text-decoration: none;
}

.cf-list__meet-link:hover {
  background: var(--c-basic-200);
}

@media only screen and (max-width: 768px) {
  .cf-booking-list__wrapper {
    padding: 16px !important;
  }
}
</style>
