<template>
  <div class="page-pad fs-300 t-body h-100 ov-h">
    <Teleport to="#pim-toolbar-left" defer>
      <IconButton
        icon="back"
        :label="$t('common.back')"
        @click="$router.push('/pim/categories')"
      />
    </Teleport>
    <Teleport to="#pim-toolbar-right" defer>
      <template v-if="activeTab === 'details' && !loading && !notFound">
        <StatusBadge v-if="isDirty" tone="warning" :dot="false" :label="$t('unsaved.changes')" />
        <BasicButton
          variant="primary"
          @click="saveCategory"
        >
          {{ $t('common.save') }}
        </BasicButton>
        <IconButton
          icon="delete"
          :label="$t('common.delete')"
          variant="danger"
          @click="showDeleteConfirm = true"
        />
      </template>
    </Teleport>
    <div class="page-card h-100 ovy-auto">
      <Loader block v-if="loading" />

      <EmptyState
        v-else-if="notFound"
        icon="folder-tree"
        :title="$t('pim.category_not_found')"
        :message="$t('pim.category_not_found_hint')"
      >
        <BasicButton
          variant="secondary"
          @click="$router.push('/pim/categories')"
        >
          {{ $t('pim.back_to_categories') }}
        </BasicButton>
      </EmptyState>

      <template v-else>
        <BasicTabs v-model="activeTab" :options="tabs" class="mb-10" />

        <div v-if="activeTab === 'details'">
          <div
            v-if="category.breadcrumb_path"
            class="detail-breadcrumb mb-10 t-muted fs-200"
          >
            <font-awesome-icon :icon="$icons.categories" class="mr-2" />
            {{ category.breadcrumb_path }}
          </div>

          <div class="page-card detail-section mb-10">
            <h2 class="fs-500 fw-600 mb-5">{{ $t("pim.basic_info") }}</h2>
            <div class="detail-grid">
              <div class="detail-field">
                <label class="field-label">IDX</label>
                <span class="detail-value">{{ category.idx }}</span>
              </div>
              <div class="detail-field">
                <label class="field-label">{{ $t("pim.parent") }}</label>
                <span class="detail-value">{{
                  category.parent_category_idx || "---"
                }}</span>
              </div>
              <div class="detail-field">
                <label class="field-label">{{ $t("pim.position") }}</label>
                <span class="detail-value">{{
                  category.position ?? "---"
                }}</span>
              </div>
              <div class="detail-field">
                <label class="field-label">{{ $t("pim.depth") }}</label>
                <span class="detail-value">{{ category.tree_deep }}</span>
              </div>
              <div class="detail-field">
                <label class="field-label">{{ $t("pim.status") }}</label>
                <BasicSwitch
                  :label="$t('pim.active')"
                  v-model="form.is_active"
                />
              </div>
              <div class="detail-field">
                <label class="field-label">{{ $t("pim.in_menu") }}</label>
                <BasicSwitch
                  :label="$t('pim.show_in_menu')"
                  v-model="form.is_in_menu"
                />
              </div>
              <div class="detail-field">
                <label class="field-label">{{ $t("pim.products") }}</label>
                <span class="detail-value">{{
                  category.product_count || 0
                }}</span>
              </div>
              <div class="detail-field">
                <label class="field-label">{{
                  $t("pim.subcategories")
                }}</label>
                <span class="detail-value">{{
                  category.subcategory_count || 0
                }}</span>
              </div>
            </div>
          </div>

          <div class="page-card detail-section mb-10">
            <div class="translation-field">
              <div class="translation-field__header">
                <label class="field-label">{{ $t("pim.name") }} ({{ defaultLang.toUpperCase() }})</label>
                <BasicButton
                  v-if="secondaryLanguages.length"
                  variant="secondary"
                  class="translation-field__btn"
                  @click="openTranslations('name')"
                >
                  {{ $t('pim.translations') }}
                </BasicButton>
              </div>
              <BasicInput v-model="form.name_t9n[defaultLang]" />
            </div>
            <div class="translation-field mt-8">
              <div class="translation-field__header">
                <label class="field-label">{{ $t("pim.description") }} ({{ defaultLang.toUpperCase() }})</label>
                <BasicButton
                  v-if="secondaryLanguages.length"
                  variant="secondary"
                  class="translation-field__btn"
                  @click="openTranslations('description')"
                >
                  {{ $t('pim.translations') }}
                </BasicButton>
              </div>
              <BasicWysiwyg v-model="form.description_t9n[defaultLang]" />
            </div>
            <!-- Internal AI-grounding desc — single-language, NOT the storefront description_t9n -->
            <div v-if="hasDesc" class="mt-8">
              <FormField
                :label="$t('pim.internal_desc_label')"
                :tooltip="$t('pim.internal_desc_tooltip')"
              >
                <BasicTextarea v-model="form.desc" />
              </FormField>
            </div>
          </div>

          <div class="page-card detail-section mb-10">
            <h2 class="fs-500 fw-600 mb-5">{{ $t("pim.category_image") }}</h2>
            <div v-if="form.image_url" class="category-image">
              <img :src="fullImageUrl" class="category-image__preview" />
              <button class="category-image__delete" @click="form.image_url = ''">
                <font-awesome-icon :icon="$icons.delete" />
              </button>
            </div>
            <div
              v-else
              class="category-image__dropzone"
              :class="{ 'category-image__dropzone--dragover': isDraggingImage }"
              role="button"
              tabindex="0"
              @click="$refs.categoryImageInput.click()"
              @keydown.enter="$refs.categoryImageInput.click()"
              @dragover.prevent="isDraggingImage = true"
              @dragleave="isDraggingImage = false"
              @drop.prevent="onImageDrop"
            >
              <span v-if="uploadingImage" class="t-muted fs-200">...</span>
              <template v-else>
                <font-awesome-icon icon="upload" class="t-muted fs-400" />
                <span class="t-muted fs-200 mt-2">{{ $t("pim.drop_files_here") }}</span>
              </template>
            </div>
            <input
              ref="categoryImageInput"
              type="file"
              accept="image/*"
              style="display: none"
              @change="onCategoryImageUpload"
            />
          </div>

          <div class="page-card detail-section mb-10">
            <h2 class="fs-500 fw-600 mb-5">{{ $t("pim.seo_settings") }}</h2>
            <div class="detail-grid mb-8">
              <div class="detail-field">
                <label class="field-label">
                  {{ $t("pim.index") }}
                  <BasicTooltip :text="$t('pim.index_help')" variant="help" />
                </label>
                <Switcher
                  :selected="!form.noindex"
                  @onSelect="form.noindex = !form.noindex"
                />
              </div>
              <div class="detail-field">
                <label class="field-label">
                  {{ $t("pim.follow") }}
                  <BasicTooltip :text="$t('pim.follow_help')" variant="help" />
                </label>
                <Switcher
                  :selected="!form.nofollow"
                  @onSelect="form.nofollow = !form.nofollow"
                />
              </div>
            </div>
            <div class="mb-8">
              <label class="field-label">
                {{ $t("pim.og_image_url") }}
                <BasicTooltip :text="$t('pim.og_image_url_help')" variant="help" />
              </label>
              <BasicInput v-model="form.og_image_url" />
            </div>
            <div class="translation-field mt-8">
              <div class="translation-field__header">
                <label class="field-label">{{ $t("pim.meta_title") }} ({{ defaultLang.toUpperCase() }})</label>
                <BasicButton
                  v-if="secondaryLanguages.length"
                  variant="secondary"
                  class="translation-field__btn"
                  @click="openTranslations('meta_title')"
                >
                  {{ $t('pim.translations') }}
                </BasicButton>
              </div>
              <BasicInput v-model="form.meta_title_t9n[defaultLang]" />
            </div>
            <div class="translation-field mt-8">
              <div class="translation-field__header">
                <label class="field-label">{{ $t("pim.meta_description") }} ({{ defaultLang.toUpperCase() }})</label>
                <BasicButton
                  v-if="secondaryLanguages.length"
                  variant="secondary"
                  class="translation-field__btn"
                  @click="openTranslations('meta_description')"
                >
                  {{ $t('pim.translations') }}
                </BasicButton>
              </div>
              <BasicTextarea v-model="form.meta_description_t9n[defaultLang]" rows="3" />
            </div>
            <div class="translation-field mt-8">
              <div class="translation-field__header">
                <label class="field-label">{{ $t("pim.canonical_url") }} ({{ defaultLang.toUpperCase() }})</label>
                <BasicButton
                  v-if="secondaryLanguages.length"
                  variant="secondary"
                  class="translation-field__btn"
                  @click="openTranslations('canonical_url')"
                >
                  {{ $t('pim.translations') }}
                </BasicButton>
              </div>
              <BasicInput v-model="form.canonical_url_t9n[defaultLang]" />
            </div>
          </div>
        </div>

        <CategoryProducts
          v-if="activeTab === 'products'"
          :channel-idx="channelIdx"
          :category-idx="category.idx"
        />
      </template>
    </div>

    <TranslationsDrawer
      :visible="!!translatingField"
      :title="translatingFieldLabel"
      :languages="pimChannel.activeChannelLanguages"
      :default-language="defaultLang"
      :values="translatingField ? form[translatingFieldFormKey] : {}"
      @cancel="translatingField = null"
      @save="onTranslationsSave"
    >
      <template v-if="translatingFieldIsWysiwyg" #input="{ modelValue, onUpdate }">
        <BasicWysiwyg variant="lite" :model-value="modelValue" @update:model-value="onUpdate" />
      </template>
      <template v-else-if="translatingFieldIsTextArea" #input="{ modelValue, onUpdate }">
        <BasicTextarea :model-value="modelValue" @update:model-value="onUpdate" rows="3" />
      </template>
    </TranslationsDrawer>

    <ConfirmDialog
      tone="danger"
      :open="showDeleteConfirm"
      @confirm="deleteCategory"
      @cancel="showDeleteConfirm = false"
      :title="$t('pim.confirm_delete')"
    >
      <template #default>
        <p>
          {{
            category.subcategory_count
              ? $t("pim.confirm_delete_category_cascade", {
                  count: category.subcategory_count,
                })
              : $t("pim.confirm_delete_category")
          }}
        </p>
      </template>
    </ConfirmDialog>

    <ConfirmDialog
      :open="!!pendingNav"
      @confirm="saveAndLeave"
      @discard="confirmLeave"
      @cancel="cancelLeave"
      :title="$t('unsaved.title')"
      :message="$t('unsaved.message')"
      :confirm-label="$t('unsaved.save_and_leave')"
      :discard-label="$t('unsaved.discard')"
    />
  </div>
</template>

<script>
import { useLoaderStore } from "@/stores/loader";
import { useNotifyStore } from "@/stores/notify";
import { usePimChannelStore } from "@/stores/pimChannel";
import { useUnsavedChanges } from "@/composables/useUnsavedChanges";
import { GET_Category, PATCH_Category, DELETE_Category, POST_UploadPicture } from "@/api/pim/api";
import CategoryProducts from "./components/CategoryProducts.vue";
import { extractApiMessage } from "@/composables/useFormErrors";
import { isNotFound } from "@/api/createClient";

export default {
  name: "CategoryDetail",
  components: {
    CategoryProducts,
  },
  beforeRouteLeave(to, from, next) {
    this.guardNavigation(to, from, next);
  },
  setup() {
    const loader = useLoaderStore();
    const notify = useNotifyStore();
    const pimChannel = usePimChannelStore();
    const unsaved = useUnsavedChanges();
    return { loader, notify, pimChannel, ...unsaved };
  },
  data() {
    return {
      activeTab: "details",
      category: {},
      loading: true,
      notFound: false,
      showDeleteConfirm: false,
      translatingField: null,
      isDraggingImage: false,
      uploadingImage: false,
      form: {
        is_active: true,
        is_in_menu: true,
        name_t9n: {},
        description_t9n: {},
        meta_title_t9n: {},
        meta_description_t9n: {},
        canonical_url_t9n: {},
        image_url: "",
        og_image_url: "",
        noindex: false,
        nofollow: false,
        desc: "",
      },
    };
  },
  computed: {
    channelIdx() {
      return this.pimChannel.activeChannelIdx;
    },
    // Soft-compat: old backend omits `desc` on the category detail → field hidden.
    hasDesc() {
      return "desc" in this.category;
    },
    tabs() {
      return [
        { value: "details", label: this.$t("pim.details") },
        {
          value: "products",
          label: this.$t("pim.products_in_category"),
          count: this.category.product_count || undefined,
        },
      ];
    },
    defaultLang() {
      return (
        this.pimChannel.activeChannel?.default_language ||
        this.pimChannel.activeChannelLanguages[0] ||
        "en"
      );
    },
    secondaryLanguages() {
      return this.pimChannel.activeChannelLanguages.filter(
        (l) => l !== this.defaultLang
      );
    },
    translatingFieldFormKey() {
      if (!this.translatingField) return null;
      return `${this.translatingField}_t9n`;
    },
    translatingFieldLabel() {
      const labels = {
        name: this.$t("pim.name"),
        description: this.$t("pim.description"),
        meta_title: this.$t("pim.meta_title"),
        meta_description: this.$t("pim.meta_description"),
        canonical_url: this.$t("pim.canonical_url"),
      };
      return labels[this.translatingField] || this.translatingField;
    },
    fullImageUrl() {
      const url = this.form.image_url || "";
      if (!url) return "";
      if (url.startsWith("http")) return url;
      const base = (process.env.VUE_APP_API_URL || "").replace(/\/$/, "");
      return `${base}${url}`;
    },
    translatingFieldIsWysiwyg() {
      return ["description"].includes(this.translatingField);
    },
    translatingFieldIsTextArea() {
      return ["meta_description"].includes(this.translatingField);
    },
  },
  watch: {
    "pimChannel.activeChannelIdx"() {
      this.fetchCategory();
    },
  },
  mounted() {
    this.fetchCategory();
  },
  methods: {
    async uploadCategoryImage(file) {
      this.uploadingImage = true;
      try {
        const formData = new FormData();
        formData.append("image", file);
        const { data } = await POST_UploadPicture(formData);
        this.form.image_url = data.image_url || "";
        this.notify.spawnNotification({ type: "positive", msg: this.$t("pim.picture_uploaded") });
      } catch (err) {
        this.notify.spawnNotification({
          type: "negative",
          msg: extractApiMessage(err, this.$t("notifications.error")),
        });
      } finally {
        this.uploadingImage = false;
      }
    },
    onCategoryImageUpload(e) {
      const file = e.target.files?.[0];
      if (file) this.uploadCategoryImage(file);
      e.target.value = "";
    },
    onImageDrop(e) {
      this.isDraggingImage = false;
      const file = e.dataTransfer.files?.[0];
      if (file) this.uploadCategoryImage(file);
    },
    openTranslations(fieldName) {
      this.translatingField = fieldName;
    },
    onTranslationsSave(values) {
      const formKey = `${this.translatingField}_t9n`;
      this.form[formKey] = { ...values };
      this.translatingField = null;
    },
    async fetchCategory() {
      this.loading = true;
      this.notFound = false;
      try {
        const { data } = await GET_Category(
          this.channelIdx,
          this.$route.params.idx
        );
        this.category = data;
        this.resetForm();
      } catch (err) {
        this.notFound = isNotFound(err);
        if (this.notFound) return;
        this.notify.spawnNotification({
          type: "negative",
          msg: extractApiMessage(err, this.$t("notifications.error")),
        });
      } finally {
        this.loading = false;
      }
    },
    resetForm() {
      const t9nKeys = ["name_t9n", "description_t9n", "meta_title_t9n", "meta_description_t9n", "canonical_url_t9n"];
      const t9nData = {};
      for (const key of t9nKeys) {
        const src = { ...(this.category[key] || {}) };
        for (const lang of this.pimChannel.activeChannelLanguages) {
          if (!(lang in src)) src[lang] = "";
        }
        t9nData[key] = src;
      }
      this.form = {
        is_active: this.category.is_active,
        is_in_menu: this.category.is_in_menu,
        image_url: this.category.image_url || "",
        og_image_url: this.category.og_image_url || "",
        noindex: this.category.noindex || false,
        nofollow: this.category.nofollow || false,
        desc: this.category.desc || "",
        ...t9nData,
      };
      this.snapshot(this.form);
      this.track(this.form);
    },
    async saveCategory() {
      this.loader.loaderStart();
      try {
        const payload = {};
        if (this.form.is_active !== this.category.is_active)
          payload.is_active = this.form.is_active;
        if (this.form.is_in_menu !== this.category.is_in_menu)
          payload.is_in_menu = this.form.is_in_menu;
        const t9nFields = ["name_t9n", "description_t9n", "meta_title_t9n", "meta_description_t9n", "canonical_url_t9n"];
        for (const f of t9nFields) {
          if (JSON.stringify(this.form[f]) !== JSON.stringify(this.category[f])) {
            payload[f] = this.form[f];
          }
        }
        for (const f of ["image_url", "og_image_url", "noindex", "nofollow"]) {
          if (this.form[f] !== (this.category[f] ?? (f === "og_image_url" ? "" : false))) {
            payload[f] = this.form[f];
          }
        }
        if (this.hasDesc && (this.form.desc || "") !== (this.category.desc || "")) {
          payload.desc = this.form.desc;
        }

        await PATCH_Category(this.channelIdx, this.category.idx, payload);
        this.notify.spawnNotification({
          type: "positive",
          msg: this.$t("pim.category_saved"),
        });
        await this.fetchCategory();
      } catch (err) {
        this.notify.spawnNotification({
          type: "negative",
          msg: extractApiMessage(err, this.$t("notifications.save_error")),
        });
      } finally {
        this.loader.loaderFinish();
      }
    },
    async saveAndLeave() {
      await this.saveCategory();
      this.confirmLeave();
    },
    async deleteCategory() {
      this.showDeleteConfirm = false;
      this.loader.loaderStart();
      try {
        await DELETE_Category(this.channelIdx, this.category.idx);
        this.notify.spawnNotification({
          type: "positive",
          msg: this.$t("notifications.deleted"),
        });
        this.confirmLeave();
        this.$router.push("/pim/categories");
      } catch (err) {
        this.notify.spawnNotification({
          type: "negative",
          msg: extractApiMessage(err, this.$t("notifications.error")),
        });
      } finally {
        this.loader.loaderFinish();
      }
    },
  },
};
</script>

<style lang="scss" scoped>
.detail-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: var(--space-5);
}
.detail-field {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}
.detail-value {
  font-size: var(--fs-300);
  color: var(--text-body);
}
.detail-breadcrumb {
  padding: var(--space-2) var(--space-3);
  background: var(--surface-base);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-base);
}
.category-image {
  position: relative;
  display: inline-block;

  &__preview {
    width: 200px;
    height: 140px;
    border-radius: var(--radius-base);
    border: 1px solid var(--border-subtle);
    object-fit: cover;
    display: block;
  }

  &__delete {
    position: absolute;
    top: 6px;
    right: 6px;
    width: 28px;
    height: 28px;
    border-radius: var(--radius-full);
    border: none;
    background: var(--negative-subtle);
    color: var(--negative);
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    font-size: var(--fs-200);
    box-shadow: var(--shadow-sm);

    &:hover {
      background: var(--negative-fill);
      color: var(--text-on-status-fill);
    }
  }

  &__dropzone {
    width: 100%;
    padding: var(--space-8) var(--space-5);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    border: 2px dashed var(--border-subtle);
    border-radius: var(--radius-base);
    transition: background 0.15s, border-color 0.15s;

    &:hover,
    &:focus-visible {
      background: var(--surface-raised);
      border-color: var(--border-default);
      outline: none;
    }

    &--dragover {
      background: var(--accent-subtle);
      border-color: var(--accent);
    }
  }
}
.translation-field__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--space-2);
}
.translation-field__btn {
  font-size: var(--fs-200);
}
</style>
