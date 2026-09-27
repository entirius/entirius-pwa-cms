<template>
  <div class="options-manager">
    <div class="flex ai-ct jc-sb mb-8">
      <h3 class="fs-400 fw-600">
        {{ $t("pim.options") }}
        <span v-if="totalCount" class="t-muted fw-400 fs-200"
          >({{ totalCount }})</span
        >
      </h3>
      <BasicButton
        :text="$t('pim.add_option')"
        class="btn-primary"
        @click="showAddForm = true"
      />
    </div>

    <!-- Search -->
    <div class="options-manager__search mb-5">
      <BasicInput
        v-model="searchQuery"
        :placeholder="$t('pim.search_to_add')"
        @update:model-value="onSearch"
      />
    </div>

    <!-- Add option form -->
    <div
      v-if="showAddForm"
      class="options-manager__add-form flex ai-ct gap-5 mb-8"
    >
      <BasicInput
        v-model="newOption.idx"
        :label="$t('pim.option_code')"
        class="flex-1"
      />
      <BasicInput
        v-model="newOption.label"
        :label="$t('pim.default_label')"
        class="flex-1"
      />
      <BasicButton
        :text="$t('common.save')"
        class="btn-primary"
        @click="createOption"
      />
      <BasicButton
        :text="$t('common.cancel')"
        class="btn-secondary"
        @click="showAddForm = false"
      />
    </div>

    <Loader v-if="loading" />

    <div
      v-else-if="!options.length && !searchQuery"
      class="t-muted fs-200 p-8"
    >
      {{ $t("pim.no_options") }}
    </div>

    <div
      v-else-if="!options.length && searchQuery"
      class="t-muted fs-200 p-8"
    >
      {{ $t("pim.no_results") }}
    </div>

    <template v-else>
      <Pagination
        v-if="totalCount > pageSize"
        :pagination="paginationState"
        class="mb-5"
        @onChangePage="onPageChange"
      />

      <!-- Table header -->
      <div class="options-table__header flex ai-ct">
        <span class="options-table__col--num">#</span>
        <span class="options-table__col--code">{{
          $t("pim.option_code").toUpperCase()
        }}</span>
        <span class="options-table__col--label hide-mobile"
          >{{ $t("pim.default_label").toUpperCase() }} (EN)</span
        >
        <span class="options-table__col--actions">ACTIONS</span>
      </div>

      <draggable
        v-model="options"
        ghost-class="bg-accent-subtle"
        handle=".drag-handle"
        :item-key="(el) => el.idx"
        :disabled="!!searchQuery"
        @end="onReorder"
      >
        <template #item="{ element, index }">
          <div class="options-table__row flex ai-ct">
            <span class="options-table__col--num flex ai-ct gap-2">
              <span
                v-if="!searchQuery"
                class="drag-handle t-muted cursor-grab"
                >&#x2630;</span
              >
              {{ pageOffset + index + 1 }}
            </span>
            <span class="options-table__col--code fw-500">{{
              element.idx
            }}</span>
            <span class="options-table__col--label t-secondary hide-mobile">{{
              getDefaultLabel(element)
            }}</span>
            <span class="options-table__col--actions flex ai-ct gap-2">
              <BasicButton
                :text="$t('pim.translations')"
                icon="language"
                class="bg-raised t-secondary icon-only-mobile"
                @click="openTranslations(element)"
              />
              <BasicButton
                custom
                size="sm"
                :label="$t('common.delete')"
                class="btn-danger"
                @click="confirmDelete(element)"
              >
                <template #custom><FontAwesomeIcon icon="trash-can" /></template>
              </BasicButton>
            </span>
          </div>
        </template>
      </draggable>

      <Pagination
        v-if="totalCount > pageSize"
        :pagination="paginationState"
        class="mt-5"
        @onChangePage="onPageChange"
      />
    </template>

    <!-- Translations drawer -->
    <OptionTranslationsDrawer
      :option="translatingOption"
      :languages="languages"
      :saving="savingTranslation"
      @close="translatingOption = null"
      @save="saveTranslationFromDrawer"
    />

    <!-- Delete confirmation -->
    <Confirmation-modal
      :visible="!!deletingOption"
      @accept="deleteOption"
      @reject="deletingOption = null"
    >
      <template #header
        ><h2>{{ $t("pim.confirm_delete_title") }}</h2></template
      >
      <template #description
        ><p>{{ $t("pim.confirm_delete_option") }}</p></template
      >
    </Confirmation-modal>
  </div>
</template>

<script>
import { useLoaderStore } from "@/stores/loader";
import { useNotifyStore } from "@/stores/notify";
import { usePimChannelStore } from "@/stores/pimChannel";
import draggable from "vuedraggable";
import {
  GET_FeatureAttributes,
  GET_Attributes,
  POST_Attribute,
  PATCH_Attribute,
  DELETE_Attribute,
  PATCH_AttributesReorder,
} from "@/api/pim/api";

import ConfirmationModal from "@/functionals/Confirmation-modal/index.vue";
import OptionTranslationsDrawer from "./OptionTranslationsDrawer.vue";
import { extractApiMessage } from "@/composables/useFormErrors";

const PAGE_SIZE = 50;

export default {
  name: "OptionsManager",
  components: { draggable, ConfirmationModal, OptionTranslationsDrawer },
  props: {
    featureIdx: {
      type: String,
      required: true,
    },
    languages: {
      type: Array,
      default: () => [],
    },
  },
  setup() {
    const loader = useLoaderStore();
    const notify = useNotifyStore();
    const pimChannel = usePimChannelStore();
    return { loader, notify, pimChannel };
  },
  data() {
    return {
      options: [],
      loading: false,
      showAddForm: false,
      newOption: { idx: "", label: "" },
      translatingOption: null,
      deletingOption: null,
      savingTranslation: false,
      page: 1,
      totalCount: 0,
      searchQuery: "",
      searchTimeout: null,
    };
  },
  computed: {
    pageSize() {
      return PAGE_SIZE;
    },
    paginationState() {
      return { page: this.page, pages: Math.ceil(this.totalCount / PAGE_SIZE) };
    },
    pageOffset() {
      return (this.page - 1) * PAGE_SIZE;
    },
  },
  watch: {
    featureIdx() {
      this.resetAndFetch();
    },
  },
  mounted() {
    this.fetchOptions();
  },
  beforeUnmount() {
    clearTimeout(this.searchTimeout);
  },
  methods: {
    extractErrorMessage(err) {
      const errData = err?.response?.data || err;
      let msg = this.$t("notifications.save_error");
      if (errData?.message) {
        msg = errData.message;
        if (errData.details?.length) {
          const fieldErrors = errData.details
            .map((d) =>
              d.field ? `${d.field}: ${d.description}` : d.description
            )
            .join(", ");
          msg += ` (${fieldErrors})`;
        }
      } else if (errData?.detail) {
        msg = errData.detail;
      }
      return msg;
    },
    getDefaultLabel(option) {
      if (!option.name_t9n) return "";
      return (
        option.name_t9n.en ||
        option.name_t9n.pl ||
        Object.values(option.name_t9n)[0] ||
        ""
      );
    },
    resetAndFetch() {
      this.options = [];
      this.page = 1;
      this.totalCount = 0;
      this.searchQuery = "";
      this.fetchOptions();
    },
    onPageChange(p) {
      this.page = p;
      this.fetchOptions();
    },
    async fetchOptions() {
      this.loading = true;
      try {
        let data;
        if (this.searchQuery) {
          const res = await GET_Attributes({
            feature_idx: this.featureIdx,
            search: this.searchQuery,
            page_size: PAGE_SIZE,
            page: this.page,
          });
          data = res.data;
        } else {
          const res = await GET_FeatureAttributes(
            this.featureIdx,
            this.pimChannel.activeChannelIdx,
            { page_size: PAGE_SIZE, page: this.page }
          );
          data = res.data;
        }
        const results = (data.results || data || []).map((a) => ({
          ...a,
          name_t9n: a.name_t9n || {},
        }));
        this.options = results;
        this.totalCount = data.count ?? results.length;
      } catch (err) {
        this.notify.spawnNotification({
          type: "negative",
          msg: extractApiMessage(err, this.$t("notifications.error")),
        });
      } finally {
        this.loading = false;
      }
    },
    onSearch() {
      clearTimeout(this.searchTimeout);
      this.searchTimeout = setTimeout(() => {
        this.page = 1;
        this.fetchOptions();
      }, 300);
    },
    async createOption() {
      if (!this.newOption.idx) return;
      this.loader.loaderStart();
      try {
        const name_t9n = {};
        if (this.newOption.label) {
          const defaultLang = this.languages[0] || "en";
          name_t9n[defaultLang] = this.newOption.label;
        }
        await POST_Attribute({
          feature_idx: this.featureIdx,
          idx: this.newOption.idx,
          name_t9n,
          display_order: (this.totalCount + 1) * 100,
        });
        this.notify.spawnNotification({
          type: "positive",
          msg: this.$t("pim.option_created"),
        });
        this.newOption = { idx: "", label: "" };
        this.showAddForm = false;
        this.page = 1;
        await this.fetchOptions();
      } catch (err) {
        this.notify.spawnNotification({
          type: "negative",
          msg: this.extractErrorMessage(err),
        });
      } finally {
        this.loader.loaderFinish();
      }
    },
    async onReorder() {
      const items = this.options.map((opt, i) => ({
        feature_idx: this.featureIdx,
        idx: opt.idx,
        display_order: (this.pageOffset + i + 1) * 100,
      }));
      this.loader.loaderStart();
      try {
        await PATCH_AttributesReorder({ items });
        this.notify.spawnNotification({
          type: "positive",
          msg: this.$t("pim.reorder_saved"),
        });
      } catch (err) {
        this.notify.spawnNotification({
          type: "negative",
          msg: this.extractErrorMessage(err),
        });
      } finally {
        this.loader.loaderFinish();
      }
    },
    openTranslations(option) {
      this.translatingOption = {
        ...option,
        name_t9n: { ...(option.name_t9n || {}) },
      };
    },
    async saveTranslationFromDrawer({ idx, name_t9n }) {
      this.savingTranslation = true;
      try {
        await PATCH_Attribute(this.featureIdx, idx, { name_t9n });
        this.notify.spawnNotification({
          type: "positive",
          msg: this.$t("pim.media_saved"),
        });
        this.translatingOption = null;
        await this.fetchOptions();
      } catch (err) {
        this.notify.spawnNotification({
          type: "negative",
          msg: this.extractErrorMessage(err),
        });
      } finally {
        this.savingTranslation = false;
      }
    },
    confirmDelete(option) {
      this.deletingOption = option;
    },
    async deleteOption() {
      if (!this.deletingOption) return;
      this.loader.loaderStart();
      try {
        await DELETE_Attribute(this.featureIdx, this.deletingOption.idx);
        this.notify.spawnNotification({
          type: "positive",
          msg: this.$t("pim.option_deleted"),
        });
        this.deletingOption = null;
        // If we deleted the last item on the page, go back one page
        if (this.options.length <= 1 && this.page > 1) this.page--;
        await this.fetchOptions();
      } catch (err) {
        this.notify.spawnNotification({
          type: "negative",
          msg: this.extractErrorMessage(err),
        });
      } finally {
        this.loader.loaderFinish();
      }
    },
  },
};
</script>

<style lang="scss" scoped>
.options-manager__add-form {
  padding: var(--space-3);
  background: var(--surface-raised);
  border-radius: var(--radius-base);
}
.options-table__header {
  padding: var(--space-2) var(--space-3);
  border-bottom: 2px solid var(--border-subtle);
  font-size: var(--fs-150);
  font-weight: 600;
  color: var(--text-muted);
  letter-spacing: 0.03em;
}
.options-table__row {
  padding: var(--space-2) var(--space-3);
  border-bottom: 1px solid var(--border-subtle);
  transition: background 0.15s;
  &:hover {
    background: var(--surface-base);
  }
}
.options-table__col--num {
  width: 60px;
  flex-shrink: 0;
}
.options-table__col--code {
  flex: 1;
}
.options-table__col--label {
  flex: 1;
}
.options-table__col--actions {
  width: 180px;
  flex-shrink: 0;
  justify-content: flex-end;

  @media only screen and (max-width: 768px) {
    width: auto;
  }
}
.drag-handle {
  cursor: grab;
  user-select: none;
  font-size: var(--fs-300);
}
.cursor-grab {
  cursor: grab;
}
</style>
