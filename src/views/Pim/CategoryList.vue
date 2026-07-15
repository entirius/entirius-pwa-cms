<template>
  <div class="p-500 fs-300 t-basic-800 h-100 ov-h">
    <div
      class="bg-basic-100 b-basic-300 br-50 h-100 ovy-auto pl-500 pt-500 pb-500 pr-500"
    >
      <div class="flex ai-ct mb-400">
        <h1 class="fs-700 fw-600">{{ $t("pim.category_tree") }}</h1>
      </div>

      <div class="category-list__toolbar">
        <BasicInput
          v-model="search"
          :placeholder="$t('common.start_typing')"
          icon="search"
          class="category-list__search"
        />
        <Dropdown
          :values="activeFilterOptions"
          :placeholder="$t('pim.filter_status')"
          @onSelect="onFilterActive"
        />
        <BasicButton
          :text="$t('pim.expand_all')"
          class="bg-basic-200 t-basic-600"
          @click="expandAll"
        />
        <BasicButton
          :text="$t('pim.collapse_all')"
          class="bg-basic-200 t-basic-600"
          @click="collapseAll"
        />
      </div>

      <Loader v-if="loading" />

      <CategoryTree
        v-else
        ref="categoryTree"
        :categories="categories"
        :search-query="search"
        :channel-idx="channelIdx"
        @select="onRowClick"
        @reorder="onReorder"
      />

      <FloatingActions :actions="fabActions" />
    </div>
  </div>
</template>

<script>
import { useLoaderStore } from "@/stores/loader";
import { useNotifyStore } from "@/stores/notify";
import { usePimChannelStore } from "@/stores/pimChannel";
import { GET_Categories, PATCH_CategoriesReorder } from "@/api/pim/api";
import CategoryTree from "./components/CategoryTree.vue";
import { extractApiMessage } from "@/composables/useFormErrors";

export default {
  name: "CategoryList",
  components: { CategoryTree },
  setup() {
    const loader = useLoaderStore();
    const notify = useNotifyStore();
    const pimChannel = usePimChannelStore();
    return { loader, notify, pimChannel };
  },
  data() {
    return {
      categories: [],
      totalCount: 0,
      search: "",
      isActiveFilter: null,
      loading: false,
    };
  },
  computed: {
    channelIdx() {
      return this.pimChannel.activeChannelIdx;
    },
    fabActions() {
      return [
        {
          icon: "plus",
          label: this.$t("pim.add_root_category"),
          handler: () => this.$router.push("/pim/categories/create"),
        },
      ];
    },
    activeFilterOptions() {
      return [
        { label: this.$t("pim.all"), value: null },
        { label: this.$t("pim.active"), value: true },
        { label: this.$t("pim.inactive"), value: false },
      ];
    },
  },
  watch: {
    "pimChannel.activeChannelIdx"() {
      this.fetchAllCategories();
    },
    isActiveFilter() {
      this.fetchAllCategories();
    },
  },
  mounted() {
    this.fetchAllCategories();
  },
  methods: {
    async fetchAllCategories({ silent = false } = {}) {
      if (!silent) this.loading = true;
      try {
        let allCategories = [];
        let page = 1;
        let hasMore = true;
        while (hasMore) {
          const params = { page, page_size: 100 };
          if (this.isActiveFilter !== null)
            params.is_active = this.isActiveFilter;
          const { data } = await GET_Categories(this.channelIdx, params);
          allCategories = allCategories.concat(data.results || []);
          hasMore = !!data.next;
          page++;
        }
        this.categories = allCategories;
        this.totalCount = allCategories.length;
      } catch (err) {
        this.notify.spawnNotification({
          type: "negative",
          msg: extractApiMessage(err, this.$t("notifications.error")),
        });
      } finally {
        if (!silent) this.loading = false;
      }
    },
    onFilterActive(val) {
      this.isActiveFilter = val;
    },
    onRowClick(row) {
      this.$router.push(`/pim/categories/${row.idx}`);
    },
    expandAll() {
      this.$refs.categoryTree.expandAll();
    },
    collapseAll() {
      this.$refs.categoryTree.collapseAll();
    },
    async onReorder(items) {
      try {
        await PATCH_CategoriesReorder(this.channelIdx, { items });
        this.notify.spawnNotification({
          type: "positive",
          msg: this.$t("pim.categories_reordered"),
        });
        await this.fetchAllCategories({ silent: true });
      } catch (err) {
        this.notify.spawnNotification({
          type: "negative",
          msg: extractApiMessage(err, this.$t("notifications.error")),
        });
        await this.fetchAllCategories({ silent: true });
      }
    },
  },
};
</script>

<style lang="scss" scoped>
.category-list__toolbar {
  display: flex;
  align-items: center;
  gap: var(--space-200);
  margin-bottom: var(--space-400);
  flex-wrap: wrap;
}
.category-list__search {
  flex: 1;
  min-width: 150px;
  max-width: 400px;
}
</style>
