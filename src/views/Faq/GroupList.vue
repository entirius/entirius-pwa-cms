<template>
  <div class="p-500 fs-300 t-basic-800 h-100 ov-h">
    <div class="bg-basic-100 b-basic-300 br-50 h-100 ovy-auto pl-500 pt-500 pb-500 pr-500">
      <div class="group-list__toolbar">
        <BasicInput
          v-model="search"
          :placeholder="$t('common.start_typing')"
          icon="search"
          class="group-list__search"
          @input="debouncedFetch(searchAndFetch)"
        />
        <MobileFilterPanel
          :active-count="activeFilter !== 'all' ? 1 : 0"
          :trigger-label="$t('builder.filters')"
        >
          <p class="fs-200 t-basic-600">{{ $t("builder.filters") }}</p>
          <FilterChip
            v-for="tab in filterTabs"
            :key="tab.key"
            :label="tab.label"
            :active="activeFilter === tab.key"
            @click="setFilter(tab.key)"
          />
        </MobileFilterPanel>
      </div>

      <Loader v-show="loading" />

      <div v-show="!loading">
        <p v-if="!groups.length" class="t-basic-500 fs-300">
          {{ $t("faq.no_groups") }}
        </p>

        <draggable
          v-else
          v-model="groups"
          item-key="id"
          handle=".drag-handle"
          ghost-class="bg-support-100"
          :force-fallback="true"
          fallback-class="drag-ghost"
          @end="onReorder"
        >
          <template #item="{ element }">
            <div
              class="group-row flex ai-ct gap-200 pointer"
              @click="$router.push(`/faq/groups/${element.idx}`)"
            >
              <font-awesome-icon
                icon="grip-vertical"
                class="drag-handle t-basic-400"
              />
              <span class="group-row__name fw-600 flex-1">
                {{ element.name || element.idx }}
              </span>
              <div class="flex ai-ct gap-100">
                <span
                  v-if="(element.channel_ids || []).length"
                  class="chip bg-support-100 t-support-400"
                >
                  {{ element.channel_ids.length }} {{ element.channel_ids.length === 1 ? 'channel' : 'channels' }}
                </span>
                <span
                  v-else
                  class="chip bg-basic-200 t-basic-500"
                >
                  {{ $t("faq.global") }}
                </span>
              </div>
              <span class="chip bg-support-100 t-support-400">
                {{ element.item_count || 0 }} {{ $t("faq.items") }}
              </span>
              <StatusBadge
                :label="element.is_active ? $t('faq.active') : $t('faq.inactive')"
                :variant="element.is_active ? 'positive' : 'negative'"
              />
            </div>
          </template>
        </draggable>
      </div>

      <Pagination
        v-if="totalCount > pageSize"
        :pagination="paginationState"
        @onChangePage="onPageChange"
      />

      <FloatingActions :actions="fabActions" />
    </div>
  </div>
</template>

<script>
import draggable from "vuedraggable";
import { useLoaderStore } from "@/stores/loader";
import { useNotifyStore } from "@/stores/notify";
import { useSearchDebounce } from "@/composables/useSearchDebounce";
import {
  GET_FaqGroups,
  PATCH_FaqGroupsReorder,
} from "@/api/faq/api";
import { extractApiMessage } from "@/composables/useFormErrors";

export default {
  name: "FaqGroupList",
  components: { draggable },
  setup() {
    const loader = useLoaderStore();
    const notify = useNotifyStore();
    const { search, debouncedFetch } = useSearchDebounce();
    return { loader, notify, search, debouncedFetch };
  },
  data() {
    return {
      groups: [],
      totalCount: 0,
      currentPage: 1,
      pageSize: 50,
      loading: false,
      activeFilter: "all",
    };
  },
  computed: {
    fabActions() {
      return [
        {
          icon: "plus",
          label: this.$t("faq.create_group"),
          handler: () => this.$router.push("/faq/groups/create"),
        },
      ];
    },
    filterTabs() {
      return [
        { key: "all", label: this.$t("faq.filter_all") },
        { key: "active", label: this.$t("faq.filter_active") },
        { key: "inactive", label: this.$t("faq.filter_inactive") },
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
      this.fetchGroups();
    },
  },
  mounted() {
    this.currentPage = parseInt(this.$route.query.page) || 1;
    this.fetchGroups();
  },
  methods: {
    async fetchGroups() {
      this.loading = true;
      try {
        const params = { page: this.currentPage, page_size: this.pageSize };
        if (this.search) params.search = this.search;
        if (this.activeFilter === "active") params.is_active = true;
        if (this.activeFilter === "inactive") params.is_active = false;

        const channel = process.env.VUE_APP_CHANNEL;
        const { data } = await GET_FaqGroups(channel, params);
        this.groups = data.results || [];
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
    setFilter(key) {
      this.activeFilter = key;
      this.currentPage = 1;
      this.fetchGroups();
    },
    searchAndFetch() {
      this.currentPage = 1;
      this.fetchGroups();
    },
    async onReorder() {
      try {
        const channel = process.env.VUE_APP_CHANNEL;
        const ordered_idxs = this.groups.map((g) => g.idx);
        await PATCH_FaqGroupsReorder(channel, { ordered_idxs });
        this.notify.spawnNotification({
          type: "positive",
          msg: this.$t("faq.reorder_saved"),
        });
      } catch (err) {
        this.notify.spawnNotification({
          type: "negative",
          msg: extractApiMessage(err, this.$t("notifications.error")),
        });
      }
    },
    onPageChange(page) {
      this.$router.push({
        path: this.$route.path,
        query: { ...this.$route.query, page: String(page) },
      });
    },
  },
};
</script>

<style lang="scss" scoped>
.group-list__toolbar {
  display: flex;
  align-items: center;
  gap: var(--space-200);
  margin-bottom: var(--space-400);
  flex-wrap: wrap;
}

.group-list__search {
  flex: 1;
  min-width: 150px;
  max-width: 400px;
}

.group-row {
  padding: 12px var(--space-200);
  border-bottom: 1px solid var(--c-basic-300);
  transition: background 0.1s;

  &:hover {
    background: var(--c-basic-200);
  }
}

.group-row__name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.drag-handle {
  cursor: grab;
  flex-shrink: 0;

  &:active {
    cursor: grabbing;
  }
}

</style>

<style lang="scss">
.drag-ghost {
  max-width: 600px;
  opacity: 0.9;
  background: var(--c-basic-100);
  border: 1px solid var(--c-support-400);
  border-radius: 6px;
  box-shadow: var(--shadow-md);
  padding: 12px var(--space-200);
}
</style>
