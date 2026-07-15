<template>
  <div class="p-500 fs-300 t-basic-800 h-100 ov-h">
    <Teleport to="#faq-toolbar-left" defer>
      <BasicButton
        text=""
        icon="arrow-left"
        class="bg-basic-200 t-basic-600"
        @click="$router.push('/faq/items')"
      />
      <span class="fw-600 fs-400">{{ isEdit ? item.question || item.url_key : $t("faq.create_item") }}</span>
    </Teleport>
    <Teleport to="#faq-toolbar-right" defer>
      <span v-if="isDirty" class="chip bg-warning-100 t-warning-300">
        {{ $t("unsaved.changes") }}
      </span>
      <BasicButton
        v-if="isEdit"
        text=""
        icon="trash-can"
        class="bg-negative-100 t-negative-300"
        @click="showDeleteConfirm = true"
      />
      <BasicButton
        :text="$t('common.save')"
        class="bg-support-400 t-basic-100"
        @click="saveItem"
      />
    </Teleport>

    <div class="bg-basic-100 b-basic-300 br-50 h-100 ovy-auto p-500">
      <Loader v-if="loading" />

      <template v-else>
        <div class="flex ai-ct jc-sb mb-500">
          <h1 class="fs-700 fw-600">
            {{ isEdit ? item.question || item.url_key : $t("faq.create_item") }}
          </h1>
          <Switcher
            :label="$t('faq.is_active')"
            :selected="form.is_active"
            @onSelect="form.is_active = !form.is_active"
          />
        </div>

        <!-- Main fields -->
        <div class="detail-section mb-400">
          <h2 class="fs-500 fw-600 mb-300">{{ $t("faq.item_details") }}</h2>
          <div class="detail-grid">
            <div class="detail-field">
              <div class="flex ai-ct jc-sb">
                <label class="detail-label required">{{ $t("faq.url_key") }}</label>
                <BasicButton
                  v-if="isEdit && channelLanguages.length"
                  :text="$t('faq.translations')"
                  icon="language"
                  class="btn-outline translation-field__btn"
                  @click="openTranslations('url_key')"
                />
              </div>
              <BasicInput
                v-model="form.url_key"
                :isDisabled="isEdit"
                :validate="formErrors.getFieldError('url_key')"
              />
            </div>
            <div class="detail-field">
              <label class="detail-label">{{ $t("faq.group") }}</label>
              <Dropdown
                :values="groupOptions"
                :selected="form.group_idx ? [form.group_idx] : []"
                :placeholder="$t('faq.no_group')"
                @onSelect="(val) => (form.group_idx = val)"
              />
            </div>
          </div>
        </div>

        <!-- Content fields — each with per-field Translations button -->
        <div class="detail-section mb-400">
          <h2 class="fs-500 fw-600 mb-300">{{ $t("faq.item_content") }}</h2>

          <div class="detail-field mb-300">
            <div class="flex ai-ct jc-sb">
              <label class="detail-label required">{{ $t("faq.question") }}</label>
              <BasicButton
                v-if="isEdit && channelLanguages.length"
                :text="$t('faq.translations')"
                icon="language"
                class="btn-outline translation-field__btn"
                @click="openTranslations('question')"
              />
            </div>
            <BasicInput
              v-model="form.question"
              :validate="formErrors.getFieldError('question')"
            />
          </div>

          <div class="detail-field mb-300">
            <div class="flex ai-ct jc-sb">
              <label class="detail-label">{{ $t("faq.short_answer") }}</label>
              <BasicButton
                v-if="isEdit && channelLanguages.length"
                :text="$t('faq.translations')"
                icon="language"
                class="btn-outline translation-field__btn"
                @click="openTranslations('short_answer')"
              />
            </div>
            <BasicInput v-model="form.short_answer" />
          </div>

          <div class="detail-field">
            <div class="flex ai-ct jc-sb">
              <label class="detail-label required">{{ $t("faq.answer") }}</label>
              <BasicButton
                v-if="isEdit && channelLanguages.length"
                :text="$t('faq.translations')"
                icon="language"
                class="btn-outline translation-field__btn"
                @click="openTranslations('answer')"
              />
            </div>
            <BasicWysiwyg v-model="form.answer" />
          </div>
        </div>

        <!-- Associations (edit mode only) -->
        <div v-if="isEdit" class="detail-section mb-400">
          <div class="flex ai-ct jc-sb mb-300">
            <h2 class="fs-500 fw-600">{{ $t("faq.associations") }}</h2>
            <BasicButton
              :text="$t('faq.add_association')"
              icon="plus"
              class="btn-outline"
              @click="addAssociation"
            />
          </div>
          <p v-if="!associations.length" class="fs-200 t-basic-500">
            {{ $t("faq.no_associations") }}
          </p>
          <div
            v-for="(assoc, idx) in associations"
            :key="idx"
            class="assoc-row flex ai-ct gap-200 mb-200"
          >
            <Dropdown
              :values="entityTypeOptions"
              :selected="assoc.entity_type ? [assoc.entity_type] : []"
              :placeholder="$t('faq.entity_type')"
              class="assoc-type-select"
              @onSelect="(val) => { assoc.entity_type = val; assoc.entity_identifier = ''; assoc.entity_display = ''; }"
            />
            <EntitySearchPicker
              v-if="assoc.entity_type === 'product'"
              :modelValue="assoc.entity_identifier"
              :displayValue="assoc.entity_display || ''"
              :fetchFn="productFetch"
              :placeholder="$t('layout_extender.search_product')"
              :disabled="!pimEnabled"
              class="flex-1"
              @update:modelValue="assoc.entity_identifier = $event"
              @update:displayValue="assoc.entity_display = $event"
              @clear="assoc.entity_identifier = ''; assoc.entity_display = ''"
            />
            <EntitySearchPicker
              v-else-if="assoc.entity_type === 'category'"
              :modelValue="assoc.entity_identifier"
              :displayValue="assoc.entity_display || ''"
              :fetchFn="categoryFetch"
              :placeholder="$t('layout_extender.search_category')"
              :disabled="!pimEnabled"
              class="flex-1"
              @update:modelValue="assoc.entity_identifier = $event"
              @update:displayValue="assoc.entity_display = $event"
              @clear="assoc.entity_identifier = ''; assoc.entity_display = ''"
            />
            <EntitySearchPicker
              v-else-if="assoc.entity_type === 'blog-post' || assoc.entity_type === 'page'"
              :modelValue="assoc.entity_identifier"
              :displayValue="assoc.entity_display || ''"
              :fetchFn="pageFetch"
              :placeholder="$t('layout_extender.search_page')"
              :clientFilter="true"
              class="flex-1"
              @update:modelValue="assoc.entity_identifier = $event"
              @update:displayValue="assoc.entity_display = $event"
              @clear="assoc.entity_identifier = ''; assoc.entity_display = ''"
            />
            <BasicInput
              v-else
              v-model="assoc.entity_identifier"
              :placeholder="$t('faq.entity_identifier')"
              :isDisabled="!assoc.entity_type"
              class="flex-1"
            />
            <BasicButton
              text=""
              icon="xmark"
              class="bg-basic-200 t-basic-600"
              @click="removeAssociation(idx)"
            />
          </div>
          <div v-if="associationsDirty" class="flex jc-fe mt-200">
            <BasicButton
              :text="$t('faq.save_associations')"
              class="bg-support-400 t-basic-100"
              @click="saveAssociations"
            />
          </div>
        </div>
      </template>
    </div>

    <!-- Per-field translations drawer -->
    <TranslationsDrawer
      :visible="!!translatingField"
      :title="translatingFieldLabel"
      :languages="channelLanguages"
      :default-language="defaultLang"
      :values="translatingFieldValues"
      @cancel="translatingField = null"
      @save="onTranslationsSave"
    >
      <template v-if="translatingField === 'answer'" #input="{ lang, modelValue, onUpdate }">
        <BasicWysiwyg
          :modelValue="modelValue"
          @update:modelValue="onUpdate"
        />
      </template>
    </TranslationsDrawer>

    <Confirmation-modal
      :visible="showDeleteConfirm"
      @accept="deleteItem"
      @reject="showDeleteConfirm = false"
    >
      <template #header>
        <h2>{{ $t("faq.confirm_delete_title") }}</h2>
      </template>
      <template #description>
        <p>{{ $t("faq.confirm_delete_item") }}</p>
      </template>
    </Confirmation-modal>

    <UnsavedChangesModal
      :visible="!!pendingNav"
      @save="saveAndLeave"
      @discard="confirmLeave"
      @stay="cancelLeave"
    />
  </div>
</template>

<script>
import { useLoaderStore } from "@/stores/loader";
import { useNotifyStore } from "@/stores/notify";
import { useUnsavedChanges } from "@/composables/useUnsavedChanges";
import { useFormErrors, extractApiMessage } from "@/composables/useFormErrors";
import { useMuninStore } from "@/stores/munin";
import { usePimChannelStore } from "@/stores/pimChannel";
import { useCategoryFetch, useProductFetch, usePageFetch } from "@/composables/useEntityFetch";
import {
  GET_FaqItem,
  POST_FaqItem,
  PATCH_FaqItem,
  DELETE_FaqItem,
  GET_FaqItemTranslations,
  POST_FaqItemTranslation,
  PATCH_FaqItemTranslation,
  GET_FaqGroups,
  GET_FaqChannels,
} from "@/api/faq/api";
import UnsavedChangesModal from "@/functionals/Unsaved-changes-modal/index.vue";
import ConfirmationModal from "@/functionals/Confirmation-modal/index.vue";

const FIELD_LABELS = {
  url_key: "URL key (per language)",
  question: "Question",
  short_answer: "Short answer",
  answer: "Answer",
};

export default {
  name: "FaqItemEdit",
  components: { UnsavedChangesModal, ConfirmationModal },
  setup() {
    const loader = useLoaderStore();
    const notify = useNotifyStore();
    const unsaved = useUnsavedChanges();
    const formErrors = useFormErrors();
    const muninStore = useMuninStore();
    const pimChannelStore = usePimChannelStore();
    return { loader, notify, ...unsaved, formErrors, muninStore, pimChannelStore };
  },
  data() {
    return {
      item: {},
      groups: [],
      channels: [],
      translations: [],
      associations: [],
      originalAssociations: "[]",
      translatingField: null,
      loading: false,
      showDeleteConfirm: false,
      form: {
        url_key: "",
        question: "",
        answer: "",
        short_answer: "",
        group_idx: null,
        is_active: true,
      },
    };
  },
  computed: {
    channel() {
      return process.env.VUE_APP_CHANNEL;
    },
    isEdit() {
      return !!this.$route.params.id;
    },
    groupOptions() {
      const opts = [{ label: this.$t("faq.no_group"), value: null }];
      for (const g of this.groups) {
        opts.push({ label: g.name || g.idx, value: g.idx });
      }
      return opts;
    },
    entityTypeOptions() {
      return [
        { label: "Product", value: "product" },
        { label: "Category", value: "category" },
        { label: "Blog Post", value: "blog-post" },
        { label: "Page", value: "page" },
      ];
    },
    pimEnabled() {
      return this.muninStore.isPanelEnabled("pim");
    },
    pimChannelIdx() {
      return this.pimChannelStore.activeChannelIdx || this.channel;
    },
    productFetch() {
      return useProductFetch(this.pimChannelIdx);
    },
    categoryFetch() {
      return useCategoryFetch(this.pimChannelIdx);
    },
    pageFetch() {
      return usePageFetch();
    },
    associationsDirty() {
      return JSON.stringify(this.associations) !== this.originalAssociations;
    },
    channelLanguages() {
      const langs = new Set();
      for (const ch of this.channels) {
        if (ch.language_codes) {
          for (const code of ch.language_codes) langs.add(code);
        }
      }
      return Array.from(langs);
    },
    defaultLang() {
      const ch = this.channels.find((c) => c.idx === this.channel);
      return ch?.default_language || this.channelLanguages[0] || "en";
    },
    translatingFieldLabel() {
      return FIELD_LABELS[this.translatingField] || "";
    },
    translatingFieldValues() {
      if (!this.translatingField) return {};
      const vals = {};
      for (const t9n of this.translations) {
        vals[t9n.language] = t9n[this.translatingField] || "";
      }
      return vals;
    },
  },
  watch: {
    form: {
      deep: true,
      handler() {
        if (this.formErrors.hasErrors) this.formErrors.clearErrors();
      },
    },
  },
  beforeRouteLeave(to, from, next) {
    this.guardNavigation(to, from, next);
  },
  async mounted() {
    await Promise.all([this.fetchGroups(), this.fetchChannels()]);
    if (this.isEdit) {
      await this.fetchItem();
      await this.fetchTranslations();
    } else {
      const groupIdx = this.$route.query.group;
      if (groupIdx) this.form.group_idx = groupIdx;
      this.snapshot(this.form);
      this.track(this.form);
    }
  },
  methods: {
    openTranslations(fieldName) {
      this.translatingField = fieldName;
    },
    async onTranslationsSave({ values }) {
      this.loader.loaderStart();
      try {
        const field = this.translatingField;
        const existingLangs = new Set(this.translations.map((t) => t.language));

        for (const lang of this.channelLanguages) {
          const val = values[lang] || "";
          if (existingLangs.has(lang)) {
            await PATCH_FaqItemTranslation(this.channel, this.$route.params.id, lang, {
              [field]: val,
            });
          } else if (val) {
            // Create new T9N row — need all required fields.
            // Note: backend rejects empty question/answer (min_length=1). When
            // editing url_key for a language without an existing T9N row, the
            // user must translate question + answer first.
            const payload = { language: lang, url_key: "", question: "", answer: "", short_answer: "" };
            payload[field] = val;
            await POST_FaqItemTranslation(this.channel, this.$route.params.id, payload);
          }
        }
        await this.fetchTranslations();
        this.translatingField = null;
        this.notify.spawnNotification({
          type: "positive",
          msg: this.$t("faq.translations_saved"),
        });
      } catch (err) {
        this.notify.spawnNotification({
          type: "negative",
          msg: extractApiMessage(err, this.$t("notifications.save_error")),
        });
      } finally {
        this.loader.loaderFinish();
      }
    },

    async fetchGroups() {
      try {
        const { data } = await GET_FaqGroups(this.channel, { page_size: 100 });
        this.groups = data.results || [];
      } catch {
        // Non-critical
      }
    },
    async fetchChannels() {
      try {
        const { data } = await GET_FaqChannels({ page_size: 100 });
        this.channels = Array.isArray(data) ? data : data.results || [];
      } catch {
        // Non-critical
      }
    },
    async fetchItem() {
      this.loading = true;
      try {
        const { data } = await GET_FaqItem(this.channel, this.$route.params.id);
        this.item = data;
        this.associations = (data.associations || []).map((a) => ({ ...a }));
        this.originalAssociations = JSON.stringify(this.associations);
        this.resetForm(data);
        this.snapshot(this.form);
        this.track(this.form);
      } catch (err) {
        this.notify.spawnNotification({
          type: "negative",
          msg: extractApiMessage(err, this.$t("notifications.error")),
        });
      } finally {
        this.loading = false;
      }
    },
    resetForm(data) {
      this.form = {
        url_key: data.url_key || "",
        question: data.question || "",
        answer: data.answer || "",
        short_answer: data.short_answer || "",
        group_idx: data.group_idx || null,
        is_active: data.is_active ?? true,
      };
    },
    async fetchTranslations() {
      try {
        const { data } = await GET_FaqItemTranslations(this.channel, this.$route.params.id);
        this.translations = data.results || data || [];
      } catch {
        // Non-critical
      }
    },

    addAssociation() {
      this.associations.push({ entity_type: "", entity_identifier: "" });
    },
    removeAssociation(idx) {
      this.associations.splice(idx, 1);
    },
    async saveAssociations() {
      try {
        await PATCH_FaqItem(this.channel, this.$route.params.id, {
          associations: this.associations.filter(
            (a) => a.entity_type && a.entity_identifier
          ),
        });
        this.originalAssociations = JSON.stringify(this.associations);
        this.notify.spawnNotification({
          type: "positive",
          msg: this.$t("faq.associations_saved"),
        });
      } catch (err) {
        this.notify.spawnNotification({
          type: "negative",
          msg: extractApiMessage(err, this.$t("notifications.error")),
        });
      }
    },

    async saveAndLeave() {
      await this.saveItem();
      this.confirmLeave();
    },
    async saveItem() {
      const valid = this.formErrors.validateRequired(this.form, {
        url_key: this.$t("faq.url_key"),
        question: this.$t("faq.question"),
      });
      if (!valid) return;

      this.loader.loaderStart();
      try {
        const payload = {
          url_key: this.form.url_key,
          question: this.form.question,
          answer: this.form.answer,
          short_answer: this.form.short_answer,
          group_idx: this.form.group_idx,
          is_active: this.form.is_active,
        };
        if (this.isEdit) {
          await PATCH_FaqItem(this.channel, this.$route.params.id, payload);
          this.notify.spawnNotification({
            type: "positive",
            msg: this.$t("faq.item_saved"),
          });
          await this.fetchItem();
        } else {
          const { data } = await POST_FaqItem(this.channel, payload);
          this.notify.spawnNotification({
            type: "positive",
            msg: this.$t("faq.item_created"),
          });
          this.$router.push(`/faq/items/${data.id}`);
        }
      } catch (err) {
        this.formErrors.handleApiError(err);
        this.notify.spawnNotification({
          type: "negative",
          msg: extractApiMessage(err, this.$t("notifications.save_error")),
        });
      } finally {
        this.loader.loaderFinish();
      }
    },
    async deleteItem() {
      this.showDeleteConfirm = false;
      this.loader.loaderStart();
      try {
        await DELETE_FaqItem(this.channel, this.$route.params.id);
        this.snapshot(this.form);
        this.notify.spawnNotification({
          type: "positive",
          msg: this.$t("faq.item_deleted"),
        });
        this.$router.push("/faq/items");
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
.detail-section {
  border: 1px solid var(--c-basic-200);
  border-radius: var(--radius-md);
  padding: 20px;
}

.detail-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: var(--space-200);
}

.detail-field {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.detail-label {
  font-size: var(--fs-200);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  color: var(--c-basic-500);
}

.translation-field__btn {
  flex-shrink: 0;
}

.assoc-row {
  padding: 8px 0;
}

.assoc-type-select {
  min-width: 150px;
  max-width: 180px;
  flex-shrink: 0;
}

</style>
