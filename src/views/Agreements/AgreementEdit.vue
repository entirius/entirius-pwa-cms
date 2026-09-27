<template>
  <div class="page-pad fs-300 t-body h-100 ov-h">
    <Teleport to="#agreements-toolbar-left" defer>
      <IconButton
        icon="back"
        :label="$t('common.back')"
        @click="$router.push('/agreements/list')"
      />
    </Teleport>
    <Teleport to="#agreements-toolbar-right" defer>
      <IconButton
        v-if="isEdit && !definition.is_system"
        icon="delete"
        :label="$t('common.delete')"
        variant="danger"
        @click="showDeleteConfirm = true"
      />
      <BasicButton
        variant="primary"
        @click="saveDefinition"
      >
        {{ $t('agm.save') }}
      </BasicButton>
    </Teleport>

    <div class="page-card h-100 ovy-auto">
      <Loader block v-if="loading" />

      <template v-else>
        <div class="flex ai-ct jc-sb flex-wrap gap-5 rg-3 mb-12">
          <div class="flex ai-ct flex-wrap gap-5">
            <h1 class="page-title">
              {{
                isEdit
                  ? definition.name || definition.slug
                  : $t("agm.create_definition")
              }}
            </h1>
            <StatusBadge
              v-if="definition.is_system"
              :label="$t('agm.system_badge')"
              variant="informative"
            />
          </div>
          <BasicSwitch
            :label="$t('agm.is_active')"
            v-model="form.is_active"
          />
        </div>

        <p v-if="definition.is_system" class="agm-system-info mb-10">
          {{ $t("agm.system_info") }}
        </p>

        <!-- Definition fields -->
        <div class="agm-section mb-10">
          <h2 class="fs-500 fw-600 mb-8">{{ $t("agm.definitions") }}</h2>
          <div class="agm-grid">
            <FormField :label="$t('agm.slug')">
              <BasicInput
                v-model="form.slug"
                :disabled="isEdit || definition.is_system"
              />
            </FormField>
            <FormField :label="$t('agm.name')">
              <BasicInput v-model="form.name" />
            </FormField>
            <FormField :label="$t('agm.category')">
              <BasicSelect
                :options="categoryOptions"
                v-model="form.category"
                :placeholder="$t('common.select')"
                :disabled="definition.is_system"
              />
            </FormField>
            <FormField :label="$t('agm.consent_channel')">
              <BasicSelect
                :options="consentChannelOptions"
                v-model="form.consent_channel"
                :placeholder="$t('common.select')"
                :disabled="definition.is_system"
              />
            </FormField>
            <FormField :label="$t('agm.content_route')">
              <BasicInput v-model="form.content_route" />
            </FormField>
            <FormField :label="$t('agm.sort_order')">
              <BasicInput v-model="form.sort_order" type="number" />
            </FormField>
            <FormField :label="$t('agm.channels')">
              <BasicSelect
                v-model="form.channel_ids"
                :options="channelOptions"
                :placeholder="$t('agm.all_channels')"
                multiple
                searchable
              />
            </FormField>

            <!-- display_contexts: readonly tags for system, multi-select for custom -->
            <FormField :label="$t('agm.display_contexts')">
              <template v-if="definition.is_system">
                <div class="flex gap-2 flex-wrap">
                  <span
                    v-for="ctx in definition.display_contexts"
                    :key="ctx"
                    class="agm-context-tag"
                  >
                    {{ contextLabel(ctx) }}
                  </span>
                  <span
                    v-if="
                      !definition.display_contexts ||
                      !definition.display_contexts.length
                    "
                    class="t-muted fs-200"
                  >
                    ---
                  </span>
                </div>
              </template>
              <template v-else>
                <BasicSelect
                  v-model="form.display_contexts"
                  :options="displayContextOptions"
                  :placeholder="$t('agm.all_channels')"
                  multiple
                />
              </template>
            </FormField>
          </div>
        </div>

        <!-- Versions section (edit mode only) -->
        <div v-if="isEdit" class="agm-section mb-10">
          <div class="flex ai-ct jc-sb mb-8">
            <h2 class="fs-500 fw-600">{{ $t("agm.versions") }}</h2>
            <BasicButton
              variant="secondary"
              @click="showVersionForm = !showVersionForm"
            >
              {{ $t('agm.create_version') }}
            </BasicButton>
          </div>

          <!-- New version form -->
          <div v-if="showVersionForm" class="agm-version-form mb-8">
            <div class="mb-5">
              <FormField :label="$t('agm.summary_en')" class="mb-5">
                <BasicWysiwyg
                  v-model="newVersion.summary_en"
                  :toolbar="wysiwygToolbar"
                />
              </FormField>
              <FormField :label="$t('agm.summary_pl')">
                <BasicWysiwyg
                  v-model="newVersion.summary_pl"
                  :toolbar="wysiwygToolbar"
                />
              </FormField>
            </div>
            <div class="flex jc-fe gap-5">
              <BasicButton
                variant="secondary"
                @click="cancelVersionForm"
              >
                {{ $t('common.cancel') }}
              </BasicButton>
              <BasicButton
                variant="secondary"
                @click="createVersion"
              >
                {{ $t('agm.create_version') }}
              </BasicButton>
            </div>
          </div>

          <!-- Versions table -->
          <p v-if="!versions.length" class="fs-200 t-muted">
            {{ $t("agm.no_definitions") }}
          </p>
          <div v-else class="table-scroll">
            <table class="table-basic">
              <thead>
                <tr>
                  <th>{{ $t("agm.version_number") }}</th>
                  <th>{{ $t("agm.summary_en") }}</th>
                  <th>{{ $t("agm.published_at") }}</th>
                  <th>{{ $t("agm.created_at") }}</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                <template v-for="ver in versions" :key="ver.id">
                  <tr class="agm-tr">
                    <td>{{ ver.version_number }}</td>
                    <td
                      class="agm-td--summary"
                      v-html="ver.summary_en || '—'"
                    />
                    <td>
                      <StatusBadge
                        v-if="ver.published_at"
                        :label="formatDate(ver.published_at)"
                        variant="positive"
                      />
                      <StatusBadge
                        v-else
                        :label="$t('agm.draft')"
                        variant="neutral"
                      />
                    </td>
                    <td>{{ formatDate(ver.created_at) }}</td>
                    <td>
                      <div class="flex gap-2 jc-fe">
                        <IconButton
                          v-if="!ver.published_at"
                          icon="edit"
                          :label="$t('agm.edit_draft')"
                          size="sm"
                          @click="startEditDraft(ver)"
                        />
                        <IconButton
                          v-else
                          icon="edit"
                          :label="$t('agm.create_draft_from_published')"
                          size="sm"
                          @click="startEditPublished(ver)"
                        />
                        <BasicButton
                          v-if="!ver.published_at"
                          variant="secondary"
                          @click="publishVersion(ver.id)"
                        >
                          {{ $t('agm.publish') }}
                        </BasicButton>
                      </div>
                    </td>
                  </tr>

                  <!-- Inline draft edit form -->
                  <tr
                    v-if="editingVersionId === ver.id && !ver.published_at"
                    :key="`edit-${ver.id}`"
                  >
                    <td colspan="5">
                      <div class="agm-version-form">
                        <div class="mb-5">
                          <FormField :label="$t('agm.summary_en')" class="mb-5">
                            <BasicWysiwyg
                              v-model="editVersion.summary_en"
                              :toolbar="wysiwygToolbar"
                            />
                          </FormField>
                          <FormField :label="$t('agm.summary_pl')">
                            <BasicWysiwyg
                              v-model="editVersion.summary_pl"
                              :toolbar="wysiwygToolbar"
                            />
                          </FormField>
                        </div>
                        <div class="flex jc-fe gap-5">
                          <BasicButton
                            variant="secondary"
                            @click="cancelEditVersion"
                          >
                            {{ $t('common.cancel') }}
                          </BasicButton>
                          <BasicButton
                            variant="secondary"
                            @click="saveDraftVersion(ver.id)"
                          >
                            {{ $t('common.save') }}
                          </BasicButton>
                        </div>
                      </div>
                    </td>
                  </tr>
                </template>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Legal Page History (only when definition has content_route) -->
        <div
          v-if="isEdit && definition.content_route"
          class="agm-section mb-10"
        >
          <div
            class="agm-history-toggle flex ai-ct gap-5 pointer"
            @click="contentHistoryOpen = !contentHistoryOpen"
          >
            <font-awesome-icon :icon="$icons.history" class="t-muted" />
            <h2 class="fs-500 fw-600">{{ $t("agm.content_history") }}</h2>
            <font-awesome-icon
              :icon="contentHistoryOpen ? $icons.collapse : $icons.expand"
              class="t-muted fs-200"
            />
          </div>

          <template v-if="contentHistoryOpen">
            <div class="flex gap-2 mt-8 mb-8">
              <FilterChip
                :label="$t('agm.filter_all')"
                :active="contentHistoryLang === ''"
                @click="
                  contentHistoryLang = '';
                  fetchContentHistory();
                "
              />
              <FilterChip
                label="EN"
                :active="contentHistoryLang === 'en'"
                @click="
                  contentHistoryLang = 'en';
                  fetchContentHistory();
                "
              />
              <FilterChip
                label="PL"
                :active="contentHistoryLang === 'pl'"
                @click="
                  contentHistoryLang = 'pl';
                  fetchContentHistory();
                "
              />
              <FilterChip
                label="DE"
                :active="contentHistoryLang === 'de'"
                @click="
                  contentHistoryLang = 'de';
                  fetchContentHistory();
                "
              />
            </div>

            <p v-if="!contentSnapshots.length" class="t-muted fs-200">
              {{ $t("agm.content_history_empty") }}
            </p>

            <div v-else class="table-scroll">
              <table class="table-basic">
                <thead>
                  <tr>
                    <th>{{ $t("agm.published_at") }}</th>
                    <th>{{ $t("builder.language") }}</th>
                    <th>{{ $t("common.preview") }}</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  <template
                    v-for="(snap, idx) in contentSnapshots"
                    :key="snap.published_id"
                  >
                    <tr
                      class="agm-tr pointer"
                      @click="toggleSnapshot(snap.published_id)"
                    >
                      <td>
                        <span>{{ formatDate(snap.created_at) }}</span>
                        <StatusBadge
                          v-if="idx === 0"
                          :label="$t('agm.snapshot_current')"
                          variant="positive"
                          class="ml-2"
                        />
                      </td>
                      <td>{{ snap.language }}</td>
                      <td class="agm-td--summary" :title="snap.text_preview">
                        {{ snap.text_preview }}
                      </td>
                      <td>
                        <div class="flex gap-2 ai-ct jc-fe">
                          <StatusBadge
                            v-if="snap.warnings && snap.warnings.length"
                            :label="$t('agm.snapshot_warnings')"
                            variant="warning"
                          />
                          <font-awesome-icon
                            :icon="
                              expandedSnapshot === snap.published_id
                                ? $icons.collapse
                                : $icons.expand
                            "
                            class="t-muted"
                          />
                        </div>
                      </td>
                    </tr>
                    <tr
                      v-if="expandedSnapshot === snap.published_id"
                      :key="`exp-${snap.published_id}`"
                    >
                      <td colspan="4">
                        <div
                          class="agm-legal-text-preview"
                          v-html="snap.text_html"
                        />
                      </td>
                    </tr>
                  </template>
                </tbody>
              </table>
            </div>
          </template>
        </div>
      </template>
    </div>

    <ConfirmDialog
      tone="danger"
      :open="showDeleteConfirm"
      @confirm="deleteDefinition"
      @cancel="showDeleteConfirm = false"
      :title="$t('pim.confirm_delete_title')"
    >
      <template #default
        ><p>{{ $t("agm.confirm_delete") }}</p></template
      >
    </ConfirmDialog>

    <ConfirmDialog
      :open="showPublishedEditConfirm"
      @confirm="confirmEditPublished"
      @cancel="showPublishedEditConfirm = false"
      :title="$t('agm.create_draft_from_published')"
    >
      <template #default
        ><p>{{ $t("agm.edit_published_confirm") }}</p></template
      >
    </ConfirmDialog>
  </div>
</template>

<script>
import { useLoaderStore } from "@/stores/loader";
import { useNotifyStore } from "@/stores/notify";
import {
  GET_Definition,
  POST_Definition,
  PATCH_Definition,
  DELETE_Definition,
  GET_Versions,
  POST_Version,
  PATCH_Version,
  POST_PublishVersion,
  GET_AgmChannels,
  GET_ContentHistory,
} from "@/api/agreements/api";
import { extractApiMessage } from "@/composables/useFormErrors";

export default {
  name: "AgreementEdit",
  components: {},
  setup() {
    const loader = useLoaderStore();
    const notify = useNotifyStore();
    return { loader, notify };
  },
  data() {
    return {
      definition: {},
      versions: [],
      channels: [],
      loading: false,
      showDeleteConfirm: false,
      showVersionForm: false,
      showPublishedEditConfirm: false,
      pendingPublishedVersion: null,
      editingVersionId: null,
      editVersion: {
        summary_en: "",
        summary_pl: "",
      },
      newVersion: {
        summary_en: "",
        summary_pl: "",
      },
      form: {
        slug: "",
        name: "",
        category: "",
        consent_channel: "",
        content_route: "",
        sort_order: 0,
        is_active: true,
        channel_ids: [],
        display_contexts: [],
      },
      wysiwygToolbar: ["bold", "italic", "underline", "link"],
      contentHistoryOpen: false,
      contentHistoryLang: "",
      contentSnapshots: [],
      expandedSnapshot: null,
    };
  },
  computed: {
    isEdit() {
      return !!this.$route.params.slug;
    },
    categoryOptions() {
      return [
        { label: this.$t("agm.filter_mandatory"), value: "mandatory" },
        { label: this.$t("agm.filter_marketing"), value: "marketing" },
        { label: this.$t("agm.filter_informational"), value: "informational" },
      ];
    },
    consentChannelOptions() {
      return [
        { label: "General", value: "general" },
        { label: "Email", value: "email" },
        { label: "SMS", value: "sms" },
        { label: "Push", value: "push" },
        { label: "Web", value: "web" },
      ];
    },
    channelOptions() {
      return this.channels.map((ch) => ({
        label: ch.name || ch.idx,
        value: ch.id,
      }));
    },
    displayContextOptions() {
      return [
        { label: this.$t("agm.context_checkout"), value: "checkout" },
        { label: this.$t("agm.context_registration"), value: "registration" },
        { label: this.$t("agm.context_newsletter"), value: "newsletter" },
      ];
    },
  },
  async mounted() {
    await this.fetchChannels();
    if (this.isEdit) {
      await this.fetchDefinition();
      await this.fetchVersions();
      if (this.definition.content_route) {
        await this.fetchContentHistory();
      }
    }
  },
  methods: {
    contextLabel(ctx) {
      const map = {
        checkout: this.$t("agm.context_checkout"),
        registration: this.$t("agm.context_registration"),
        newsletter: this.$t("agm.context_newsletter"),
      };
      return map[ctx] || ctx;
    },
    formatDate(dateStr) {
      if (!dateStr) return "---";
      return new Date(dateStr).toLocaleDateString();
    },
    startEditDraft(ver) {
      this.editingVersionId = ver.id;
      this.editVersion = {
        summary_en: ver.summary_en || "",
        summary_pl: ver.summary_pl || "",
      };
    },
    startEditPublished(ver) {
      this.pendingPublishedVersion = ver;
      this.showPublishedEditConfirm = true;
    },
    cancelEditVersion() {
      this.editingVersionId = null;
      this.editVersion = { summary_en: "", summary_pl: "" };
    },
    async fetchChannels() {
      try {
        const { data } = await GET_AgmChannels({ page_size: 100 });
        this.channels = data.results || [];
      } catch (err) {
        this.notify.spawnNotification({
          type: "negative",
          msg: extractApiMessage(err, this.$t("notifications.error")),
        });
      }
    },
    async fetchDefinition() {
      this.loading = true;
      try {
        const { data } = await GET_Definition(this.$route.params.slug);
        this.definition = data;
        this.resetForm(data);
      } catch (err) {
        this.notify.spawnNotification({
          type: "negative",
          msg: extractApiMessage(err, this.$t("notifications.error")),
        });
      } finally {
        this.loading = false;
      }
    },
    async fetchVersions() {
      try {
        const { data } = await GET_Versions(this.$route.params.slug);
        this.versions = data.results || data || [];
      } catch (err) {
        this.notify.spawnNotification({
          type: "negative",
          msg: extractApiMessage(err, this.$t("notifications.error")),
        });
      }
    },
    resetForm(data) {
      this.form = {
        slug: data.slug || "",
        name: data.name || "",
        category: data.category || "",
        consent_channel: data.consent_channel || "",
        content_route: data.content_route || "",
        sort_order: data.sort_order ?? 0,
        is_active: data.is_active ?? true,
        channel_ids: data.channel_ids || [],
        display_contexts: data.display_contexts || [],
      };
    },
    async saveDefinition() {
      this.loader.loaderStart();
      try {
        const payload = {
          slug: this.form.slug,
          name: this.form.name,
          category: this.form.category,
          consent_channel: this.form.consent_channel,
          content_route: this.form.content_route || null,
          sort_order: parseInt(this.form.sort_order) || 0,
          is_active: this.form.is_active,
          channel_ids: this.form.channel_ids,
          display_contexts: this.form.display_contexts,
        };
        if (this.isEdit) {
          await PATCH_Definition(this.$route.params.slug, payload);
          this.notify.spawnNotification({
            type: "positive",
            msg: this.$t("notifications.success"),
          });
          await this.fetchDefinition();
        } else {
          const { data } = await POST_Definition(payload);
          this.notify.spawnNotification({
            type: "positive",
            msg: this.$t("notifications.success"),
          });
          this.$router.push(`/agreements/${data.slug}`);
        }
      } catch (err) {
        this.notify.spawnNotification({
          type: "negative",
          msg: extractApiMessage(err, this.$t("notifications.save_error")),
        });
      } finally {
        this.loader.loaderFinish();
      }
    },
    async deleteDefinition() {
      this.showDeleteConfirm = false;
      this.loader.loaderStart();
      try {
        await DELETE_Definition(this.$route.params.slug);
        this.notify.spawnNotification({
          type: "positive",
          msg: this.$t("notifications.deleted"),
        });
        this.$router.push("/agreements/list");
      } catch (err) {
        this.notify.spawnNotification({
          type: "negative",
          msg: extractApiMessage(err, this.$t("notifications.error")),
        });
      } finally {
        this.loader.loaderFinish();
      }
    },
    cancelVersionForm() {
      this.showVersionForm = false;
      this.newVersion = { summary_en: "", summary_pl: "" };
    },
    async createVersion() {
      this.loader.loaderStart();
      try {
        await POST_Version(this.$route.params.slug, {
          summary_t9n: {
            en: this.newVersion.summary_en,
            pl: this.newVersion.summary_pl,
          },
        });
        this.notify.spawnNotification({
          type: "positive",
          msg: this.$t("notifications.success"),
        });
        this.cancelVersionForm();
        await this.fetchVersions();
      } catch (err) {
        this.notify.spawnNotification({
          type: "negative",
          msg: extractApiMessage(err, this.$t("notifications.save_error")),
        });
      } finally {
        this.loader.loaderFinish();
      }
    },
    async saveDraftVersion(id) {
      this.loader.loaderStart();
      try {
        await PATCH_Version(id, {
          summary_t9n: {
            en: this.editVersion.summary_en,
            pl: this.editVersion.summary_pl,
          },
        });
        this.notify.spawnNotification({
          type: "positive",
          msg: this.$t("notifications.success"),
        });
        this.cancelEditVersion();
        await this.fetchVersions();
      } catch (err) {
        this.notify.spawnNotification({
          type: "negative",
          msg: extractApiMessage(err, this.$t("notifications.save_error")),
        });
      } finally {
        this.loader.loaderFinish();
      }
    },
    async confirmEditPublished() {
      this.showPublishedEditConfirm = false;
      const ver = this.pendingPublishedVersion;
      this.pendingPublishedVersion = null;
      if (!ver) return;
      this.loader.loaderStart();
      try {
        await POST_Version(this.$route.params.slug, {
          summary_t9n: {
            en: ver.summary_en || "",
            pl: ver.summary_pl || "",
          },
        });
        this.notify.spawnNotification({
          type: "positive",
          msg: this.$t("notifications.success"),
        });
        await this.fetchVersions();
      } catch (err) {
        this.notify.spawnNotification({
          type: "negative",
          msg: extractApiMessage(err, this.$t("notifications.save_error")),
        });
      } finally {
        this.loader.loaderFinish();
      }
    },
    toggleSnapshot(id) {
      this.expandedSnapshot = this.expandedSnapshot === id ? null : id;
    },
    async fetchContentHistory() {
      try {
        const params = {};
        if (this.contentHistoryLang) params.language = this.contentHistoryLang;
        const { data } = await GET_ContentHistory(
          this.$route.params.slug,
          params
        );
        this.contentSnapshots = data.snapshots || [];
      } catch (err) {
        this.contentSnapshots = [];
      }
    },
    async publishVersion(id) {
      this.loader.loaderStart();
      try {
        await POST_PublishVersion(id);
        this.notify.spawnNotification({
          type: "positive",
          msg: this.$t("notifications.success"),
        });
        await this.fetchVersions();
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
.agm-section {
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-base);
  padding: var(--space-5);
}

.agm-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: var(--space-5);
}

.agm-version-form {
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-base);
  padding: var(--space-4);
  background: var(--surface-raised);
}

.agm-tr:hover {
  background: var(--surface-raised);
}

.agm-td--summary {
  max-width: 300px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.agm-system-info {
  font-size: var(--fs-300);
  color: var(--text-muted);
  background: var(--surface-raised);
  border-radius: var(--radius-base);
  padding: var(--space-2) var(--space-4);
}

.agm-context-tag {
  display: inline-flex;
  align-items: center;
  padding: 2px var(--space-2);
  border-radius: var(--radius-base);
  background: var(--surface-raised);
  color: var(--text-body);
  font-size: var(--fs-200);
  font-weight: 600;
}

.agm-legal-text-preview {
  max-height: 400px;
  overflow-y: auto;
  padding: var(--space-4);
  background: var(--surface-raised);
  border-radius: var(--radius-base);
  font-size: var(--fs-300);
  line-height: 1.6;
  color: var(--text-body);
}
</style>
