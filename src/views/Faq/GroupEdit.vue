<template>
  <div class="page-pad fs-300 t-body h-100 ov-h">
    <Teleport to="#faq-toolbar-left" defer>
      <IconButton
        icon="back"
        :label="$t('common.back')"
        @click="$router.push('/faq/groups')"
      />
    </Teleport>
    <Teleport to="#faq-toolbar-right" defer>
      <StatusBadge v-if="isDirty" tone="warning" :dot="false" :label="$t('unsaved.changes')" />
      <BasicButton
        v-if="isEdit && channelLanguages.length > 0"
        variant="secondary"
        @click="showTranslationsDrawer = true"
      >
        {{ $t('faq.translations') }}
      </BasicButton>
      <IconButton
        v-if="isEdit"
        icon="delete"
        :label="$t('common.delete')"
        variant="danger"
        @click="showDeleteConfirm = true"
      />
      <BasicButton
        variant="primary"
        @click="saveGroup"
      >
        {{ $t('common.save') }}
      </BasicButton>
    </Teleport>

    <div class="page-card h-100 ovy-auto">
      <Loader block v-if="loading" />

      <template v-else>
        <div class="flex ai-ct jc-sb mb-12">
          <h1 class="page-title">
            {{ isEdit ? group.name || group.idx : $t("faq.create_group") }}
          </h1>
          <BasicSwitch
            :label="$t('faq.is_active')"
            v-model="form.is_active"
          />
        </div>

        <!-- Main fields -->
        <div class="page-card detail-section mb-10">
          <h2 class="fs-500 fw-600 mb-8">{{ $t("faq.group_details") }}</h2>
          <div class="detail-grid">
            <div class="detail-field">
              <label class="field-label required">{{ $t("faq.idx") }}</label>
              <BasicInput
                v-model="form.idx"
                :disabled="isEdit"
                :validate="formErrors.getFieldError('idx')"
              />
            </div>
            <div class="detail-field">
              <label class="field-label required">{{ $t("faq.name") }}</label>
              <BasicInput
                v-model="form.name"
                :validate="formErrors.getFieldError('name')"
              />
            </div>
            <div class="detail-field">
              <label class="field-label">{{ $t("faq.channels") }}</label>
              <Dropdown
                :custom_droplist="true"
                :placeholder="`${$t('faq.channels')} (${
                  form.channel_ids.length || $t('faq.global')
                })`"
              >
                <template #custom>
                  <div
                    v-for="ch in channelOptions"
                    :key="ch.value"
                    class="pointer flex jc-sb ai-ct ph-2 dropdown-list-el"
                    :class="{
                      '-primary-100': form.channel_ids.includes(ch.value),
                    }"
                    @click.stop="toggleChannel(ch.value)"
                  >
                    <span class="ml-2">{{ ch.label }}</span>
                    <FontAwesomeIcon
                      v-if="form.channel_ids.includes(ch.value)"
                      :icon="$icons.check"
                      class="t-positive"
                    />
                  </div>
                </template>
              </Dropdown>
            </div>
          </div>
        </div>

        <!-- Items in this group — drag to reorder, add existing -->
        <div v-if="isEdit" class="page-card detail-section mb-10">
          <div class="section-head mb-8">
            <h2 class="fs-500 fw-600">{{ $t("faq.items_in_group") }}</h2>
            <div class="flex ai-ct gap-5">
              <Dropdown
                :values="unassignedItemOptions"
                :selected="[]"
                :placeholder="$t('faq.add_existing_item')"
                class="add-item-select"
                @onSelect="addItemToGroup"
              />
            </div>
          </div>

          <p v-if="!groupItems.length" class="fs-200 t-muted">
            {{ $t("faq.no_items_in_group") }}
          </p>

          <draggable
            v-else
            v-model="groupItems"
            item-key="id"
            handle=".drag-handle"
            ghost-class="bg-accent-subtle"
            :force-fallback="true"
            fallback-class="drag-ghost"
            @end="onReorderItems"
          >
            <template #item="{ element }">
              <div class="item-row flex ai-ct gap-5">
                <font-awesome-icon
                  :icon="$icons.drag"
                  class="drag-handle t-muted"
                />
                <span
                  class="flex-1 item-row__question pointer"
                  @click="$router.push(`/faq/items/${element.id}`)"
                >
                  {{ element.question }}
                </span>
                <StatusBadge
                  :label="element.is_active ? $t('faq.active') : $t('faq.inactive')"
                  :variant="element.is_active ? 'positive' : 'negative'"
                />
                <IconButton
                  icon="close"
                  :label="$t('faq.remove_from_group')"
                  variant="danger"
                  size="sm"
                  @click="removeItemFromGroup(element)"
                />
              </div>
            </template>
          </draggable>
        </div>
      </template>
    </div>

    <ConfirmDialog
      tone="danger"
      :open="showDeleteConfirm"
      @confirm="deleteGroup"
      @cancel="showDeleteConfirm = false"
      :title="$t('faq.confirm_delete_title')"
    >
      <template #default>
        <p>{{ $t("faq.confirm_delete_group") }}</p>
      </template>
    </ConfirmDialog>

    <!-- Translations drawer (group has only 'name' to translate) -->
    <TranslationsDrawer
      :visible="showTranslationsDrawer"
      :title="group.name || group.idx || ''"
      :languages="channelLanguages"
      :default-language="defaultLang"
      :values="t9nValues"
      @cancel="showTranslationsDrawer = false"
      @save="onTranslationsSave"
    />

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
import draggable from "vuedraggable";
import { useLoaderStore } from "@/stores/loader";
import { useNotifyStore } from "@/stores/notify";
import { useUnsavedChanges } from "@/composables/useUnsavedChanges";
import { useFormErrors, extractApiMessage } from "@/composables/useFormErrors";
import {
  GET_FaqGroup,
  POST_FaqGroup,
  PATCH_FaqGroup,
  DELETE_FaqGroup,
  GET_FaqGroupTranslations,
  POST_FaqGroupTranslation,
  PATCH_FaqGroupTranslation,
  GET_FaqChannels,
  GET_FaqItems,
  PATCH_FaqItem,
  PATCH_FaqItemsReorder,
} from "@/api/faq/api";

export default {
  name: "FaqGroupEdit",
  components: { draggable },
  setup() {
    const loader = useLoaderStore();
    const notify = useNotifyStore();
    const unsaved = useUnsavedChanges();
    const formErrors = useFormErrors();
    return { loader, notify, ...unsaved, formErrors };
  },
  data() {
    return {
      group: {},
      channels: [],
      translations: [],
      groupItems: [],
      allItems: [],
      loading: false,
      showDeleteConfirm: false,
      showTranslationsDrawer: false,
      form: {
        idx: "",
        name: "",
        channel_ids: [],
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
    channelOptions() {
      return this.channels.map((ch) => ({
        label: ch.name || ch.idx,
        value: ch.id,
      }));
    },
    unassignedItemOptions() {
      const groupItemIds = new Set(this.groupItems.map((i) => i.id));
      return this.allItems
        .filter((i) => !groupItemIds.has(i.id))
        .map((i) => ({
          label: i.question,
          value: i.id,
        }));
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
    t9nValues() {
      const vals = {};
      for (const t9n of this.translations) {
        vals[t9n.language] = t9n.name || "";
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
    await this.fetchChannels();
    if (this.isEdit) {
      await this.fetchGroup();
      await Promise.all([
        this.fetchTranslations(),
        this.fetchGroupItems(),
        this.fetchAllItems(),
      ]);
    } else {
      this.snapshot(this.form);
      this.track(this.form);
    }
  },
  methods: {
    toggleChannel(id) {
      const idx = this.form.channel_ids.indexOf(id);
      if (idx >= 0) {
        this.form.channel_ids.splice(idx, 1);
      } else {
        this.form.channel_ids.push(id);
      }
    },
    async fetchChannels() {
      try {
        const { data } = await GET_FaqChannels({ page_size: 100 });
        this.channels = Array.isArray(data) ? data : data.results || [];
      } catch (err) {
        this.notify.spawnNotification({
          type: "negative",
          msg: extractApiMessage(err, this.$t("notifications.error")),
        });
      }
    },
    async fetchGroup() {
      this.loading = true;
      try {
        const { data } = await GET_FaqGroup(this.channel, this.$route.params.id);
        this.group = data;
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
        idx: data.idx || "",
        name: data.name || "",
        channel_ids: data.channel_ids || [],
        is_active: data.is_active ?? true,
      };
    },
    async fetchTranslations() {
      try {
        const { data } = await GET_FaqGroupTranslations(this.channel, this.$route.params.id);
        this.translations = data.results || data || [];
      } catch {
        // Non-critical
      }
    },
    async fetchGroupItems() {
      try {
        const { data } = await GET_FaqItems(this.channel, {
          group: this.$route.params.id,
          page_size: 100,
        });
        this.groupItems = data.results || [];
      } catch {
        // Non-critical
      }
    },
    async fetchAllItems() {
      try {
        const { data } = await GET_FaqItems(this.channel, { page_size: 200 });
        this.allItems = data.results || [];
      } catch {
        // Non-critical
      }
    },
    async addItemToGroup(itemId) {
      try {
        await PATCH_FaqItem(this.channel, itemId, {
          group_idx: this.group.idx,
        });
        await this.fetchGroupItems();
        await this.fetchAllItems();
        this.notify.spawnNotification({
          type: "positive",
          msg: this.$t("faq.item_added_to_group"),
        });
      } catch (err) {
        this.notify.spawnNotification({
          type: "negative",
          msg: extractApiMessage(err, this.$t("notifications.error")),
        });
      }
    },
    async removeItemFromGroup(item) {
      try {
        await PATCH_FaqItem(this.channel, item.id, { group_idx: null });
        await this.fetchGroupItems();
        await this.fetchAllItems();
        this.notify.spawnNotification({
          type: "positive",
          msg: this.$t("faq.item_removed_from_group"),
        });
      } catch (err) {
        this.notify.spawnNotification({
          type: "negative",
          msg: extractApiMessage(err, this.$t("notifications.error")),
        });
      }
    },
    async onReorderItems() {
      try {
        const ordered_pks = this.groupItems.map((i) => i.id);
        await PATCH_FaqItemsReorder(this.channel, {
          ordered_pks,
          within_group: true,
        });
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
    async onTranslationsSave({ values }) {
      this.loader.loaderStart();
      try {
        const existingLangs = new Set(this.translations.map((t) => t.language));
        for (const lang of this.channelLanguages) {
          const name = values[lang] || "";
          if (existingLangs.has(lang)) {
            await PATCH_FaqGroupTranslation(this.channel, this.$route.params.id, lang, { name });
          } else if (name) {
            await POST_FaqGroupTranslation(this.channel, this.$route.params.id, { language: lang, name });
          }
        }
        await this.fetchTranslations();
        this.showTranslationsDrawer = false;
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
    async saveAndLeave() {
      await this.saveGroup();
      this.confirmLeave();
    },
    async saveGroup() {
      const valid = this.formErrors.validateRequired(this.form, {
        idx: this.$t("faq.idx"),
        name: this.$t("faq.name"),
      });
      if (!valid) return;

      this.loader.loaderStart();
      try {
        const payload = {
          idx: this.form.idx,
          name: this.form.name,
          channel_ids: this.form.channel_ids,
          is_active: this.form.is_active,
        };
        if (this.isEdit) {
          await PATCH_FaqGroup(this.channel, this.$route.params.id, payload);
          this.notify.spawnNotification({
            type: "positive",
            msg: this.$t("faq.group_saved"),
          });
          await this.fetchGroup();
        } else {
          const { data } = await POST_FaqGroup(this.channel, payload);
          this.notify.spawnNotification({
            type: "positive",
            msg: this.$t("faq.group_created"),
          });
          this.$router.push(`/faq/groups/${data.idx}`);
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
    async deleteGroup() {
      this.showDeleteConfirm = false;
      this.loader.loaderStart();
      try {
        await DELETE_FaqGroup(this.channel, this.$route.params.id);
        this.snapshot(this.form);
        this.notify.spawnNotification({
          type: "positive",
          msg: this.$t("faq.group_deleted"),
        });
        this.$router.push("/faq/groups");
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

.add-item-select {
  min-width: 250px;
  max-width: 400px;
}

.item-row {
  padding: var(--space-3) var(--space-5);
  border-bottom: 1px solid var(--border-subtle);
  transition: background 0.1s;

  &:hover {
    background: var(--surface-raised);
  }
}

.item-row__question {
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
  background: var(--surface-base);
  border: 1px solid var(--accent);
  border-radius: var(--radius-base);
  box-shadow: var(--shadow-md);
  padding: var(--space-3) var(--space-5);
}
</style>
