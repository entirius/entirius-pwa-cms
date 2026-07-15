<template>
  <div class="attribute-library">
    <BasicInput
      v-model="search"
      :placeholder="$t('common.start_typing')"
      icon="search"
      class="mb-300"
      @input="debouncedFetch"
    />

    <div class="flex ai-ct jc-sb mb-200">
      <span class="fs-200 t-basic-500">{{
        $t("pim.available_count", { count: totalCount })
      }}</span>
      <span class="fs-200 t-basic-500">{{ $t("pim.drag_to_assign") }}</span>
    </div>

    <Loader v-if="loading" />

    <draggable
      v-if="!loading"
      v-model="normalizedFeatures"
      :group="{ name: 'features', pull: 'clone', put: true }"
      :sort="false"
      ghost-class="bg-support-100"
      :force-fallback="true"
      fallback-class="drag-ghost"
      :item-key="(el) => el.feature_idx"
      class="attribute-library__list"
      @change="onChange"
    >
      <template #item="{ element }">
        <div class="attribute-library__item flex ai-ct">
          <span class="drag-handle t-basic-400">&#x2630;</span>
          <span class="fw-500 fs-200 attribute-library__name">{{
            element.feature_name || element.feature_idx
          }}</span>
          <TypeBadge :feature-type="element.feature_type" />
        </div>
      </template>
    </draggable>
    <div
      v-if="!loading && !normalizedFeatures.length"
      class="t-basic-500 fs-200 p-300"
    >
      {{ $t("pim.no_unassigned") }}
    </div>

    <Pagination
      v-if="totalCount > pageSize"
      :pagination="paginationState"
      class="pt-200"
      @onChangePage="onPageChange"
    />
  </div>
</template>

<script>
import { useNotifyStore } from "@/stores/notify";
import { usePimChannelStore } from "@/stores/pimChannel";
import { GET_Features } from "@/api/pim/api";
import { featureTypeLabel } from "../helpers/pimEnums";
import TypeBadge from "./TypeBadge.vue";
import draggable from "vuedraggable";
import { extractApiMessage } from "@/composables/useFormErrors";

export default {
  name: "AttributeLibrary",
  components: { TypeBadge, draggable },
  props: {
    featureSetIdx: {
      type: String,
      required: true,
    },
    visible: {
      type: Boolean,
      default: false,
    },
  },
  emits: ["remove-feature"],
  setup() {
    const notify = useNotifyStore();
    const pimChannel = usePimChannelStore();
    return { notify, pimChannel };
  },
  data() {
    return {
      features: [],
      normalizedFeatures: [],
      totalCount: 0,
      currentPage: 1,
      pageSize: 20,
      search: "",
      loading: false,
      debounceTimer: null,
    };
  },
  computed: {
    paginationState() {
      return {
        page: this.currentPage,
        pages: Math.ceil(this.totalCount / this.pageSize),
      };
    },
  },
  watch: {
    featureSetIdx() {
      this.fetchFeatures();
    },
    visible(val) {
      if (val && !this.features.length) this.fetchFeatures();
    },
  },
  mounted() {
    if (this.visible) this.fetchFeatures();
  },
  methods: {
    featureTypeLabel,
    async fetchFeatures() {
      this.loading = true;
      try {
        const params = {
          page: this.currentPage,
          page_size: this.pageSize,
          exclude_feature_set: this.featureSetIdx,
        };
        if (this.search) params.search = this.search;

        const { data } = await GET_Features(
          params,
          this.pimChannel.activeChannelIdx
        );
        this.features = data.results || [];
        this.totalCount = data.count || 0;
        this.normalizedFeatures = this.features.map((f) => ({
          feature_idx: f.idx,
          feature_name: f.name || f.idx,
          feature_type: f.feature_type,
          _from_library: true,
        }));
      } catch (err) {
        this.notify.spawnNotification({
          type: "negative",
          msg: extractApiMessage(err, this.$t("notifications.error")),
        });
      } finally {
        this.loading = false;
      }
    },
    onChange(evt) {
      if (evt.added) {
        const el = evt.added.element;
        this.$emit("remove-feature", el.feature_idx);
      }
    },
    debouncedFetch() {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = setTimeout(() => {
        this.currentPage = 1;
        this.fetchFeatures();
      }, 300);
    },
    onPageChange(page) {
      this.currentPage = page;
      this.fetchFeatures();
    },
  },
};
</script>

<style lang="scss" scoped>
.attribute-library {
  display: flex;
  flex-direction: column;
  height: 100%;
}
.attribute-library__list {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-height: 0;
  flex: 1;
  overflow-y: auto;
}

.attribute-library__item {
  padding: 12px var(--space-200);
  background: var(--c-basic-100);
  border: 1px solid var(--c-basic-300);
  border-radius: var(--radius-sm);
  cursor: grab;
  user-select: none;
  gap: var(--space-100);
  transition: background 0.15s;
  &:hover {
    background: var(--c-basic-200);
  }
}

.attribute-library__name {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.drag-handle {
  cursor: grab;
  user-select: none;
  font-size: var(--fs-300);
}
</style>
