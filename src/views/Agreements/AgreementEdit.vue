<template>
  <div class="p-500 fs-300 t-basic-800 h-100 ov-h">
    <Teleport to="#agreements-toolbar-left" defer>
      <BasicButton
        text=""
        icon="arrow-left"
        class="bg-basic-200 t-basic-600"
        @click="$router.push('/agreements/list')"
      />
    </Teleport>
    <Teleport to="#agreements-toolbar-right" defer>
      <BasicButton
        v-if="isEdit && !definition.is_system"
        text=""
        icon="trash-can"
        class="bg-negative-100 t-negative-300"
        @click="showDeleteConfirm = true"
      />
      <BasicButton
        :text="$t('agm.save')"
        class="bg-support-400 t-basic-100"
        @click="saveDefinition"
      />
    </Teleport>

    <div class="bg-basic-100 b-basic-300 br-50 h-100 ovy-auto p-500">
      <Loader v-if="loading" />

      <template v-else>
        <div class="flex ai-ct jc-sb mb-500">
          <div class="flex ai-ct gap-200">
            <h1 class="fs-700 fw-600">
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
          <Switcher
            :label="$t('agm.is_active')"
            :selected="form.is_active"
            @onSelect="form.is_active = !form.is_active"
          />
        </div>

        <p v-if="definition.is_system" class="agm-system-info mb-400">
          {{ $t("agm.system_info") }}
        </p>

        <!-- Definition fields -->
        <div class="agm-section mb-400">
          <h2 class="fs-500 fw-600 mb-300">{{ $t("agm.definitions") }}</h2>
          <div class="agm-grid">
            <FormField :label="$t('agm.slug')">
              <BasicInput
                v-model="form.slug"
                :isDisabled="isEdit || definition.is_system"
              />
            </FormField>
            <FormField :label="$t('agm.name')">
              <BasicInput v-model="form.name" />
            </FormField>
            <FormField :label="$t('agm.category')">
              <Dropdown
                :values="categoryOptions"
                :selected="form.category ? [form.category] : []"
                :placeholder="$t('common.select')"
                :disabled="definition.is_system"
                @onSelect="(val) => (form.category = val)"
              />
            </FormField>
            <FormField :label="$t('agm.consent_channel')">
              <Dropdown
                :values="consentChannelOptions"
                :selected="form.consent_channel ? [form.consent_channel] : []"
                :placeholder="$t('common.select')"
                :disabled="definition.is_system"
                @onSelect="(val) => (form.consent_channel = val)"
              />
            </FormField>
            <FormField :label="$t('agm.content_route')">
              <BasicInput v-model="form.content_route" />
            </FormField>
            <FormField :label="$t('agm.sort_order')">
              <BasicInput v-model="form.sort_order" type="number" />
            </FormField>
            <FormField :label="$t('agm.channels')">
              <Dropdown
                :custom_droplist="true"
                :placeholder="`${$t('agm.channels')} (${
                  form.channel_ids.length
                    ? form.channel_ids.length
                    : $t('agm.all_channels')
                })`"
              >
                <template #custom>
                  <div
                    v-for="ch in channelOptions"
                    :key="ch.value"
                    class="pointer flex jc-sb ai-ct ph-100 dropdown-list-el"
                    :class="{
                      '-primary-100': form.channel_ids.includes(ch.value),
                    }"
                    @click.stop="toggleChannel(ch.value)"
                  >
                    <span class="ml-100">{{ ch.label }}</span>
                    <FontAwesomeIcon
                      v-if="form.channel_ids.includes(ch.value)"
                      icon="check"
                      class="t-positive-200"
                    />
                  </div>
                </template>
              </Dropdown>
            </FormField>

            <!-- display_contexts: readonly tags for system, multi-select for custom -->
            <FormField :label="$t('agm.display_contexts')">
              <template v-if="definition.is_system">
                <div class="flex gap-100 flex-wrap">
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
                    class="t-basic-500 fs-200"
                  >
                    ---
                  </span>
                </div>
              </template>
              <template v-else>
                <Dropdown
                  :custom_droplist="true"
                  :placeholder="`${$t('agm.display_contexts')} (${
                    form.display_contexts.length
                      ? form.display_contexts.length
                      : $t('agm.all_channels')
                  })`"
                >
                  <template #custom>
                    <div
                      v-for="ctx in displayContextOptions"
                      :key="ctx.value"
                      class="pointer flex jc-sb ai-ct ph-100 dropdown-list-el"
                      :class="{
                        '-primary-100': form.display_contexts.includes(
                          ctx.value
                        ),
                      }"
                      @click.stop="toggleContext(ctx.value)"
                    >
                      <span class="ml-100">{{ ctx.label }}</span>
                      <FontAwesomeIcon
                        v-if="form.display_contexts.includes(ctx.value)"
                        icon="check"
                        class="t-positive-200"
                      />
                    </div>
                  </template>
                </Dropdown>
              </template>
            </FormField>
          </div>
        </div>

        <!-- Versions section (edit mode only) -->
        <div v-if="isEdit" class="agm-section mb-400">
          <div class="flex ai-ct jc-sb mb-300">
            <h2 class="fs-500 fw-600">{{ $t("agm.versions") }}</h2>
            <BasicButton
              :text="$t('agm.create_version')"
              class="bg-support-400 t-basic-100"
              @click="showVersionForm = !showVersionForm"
            />
          </div>

          <!-- New version form -->
          <div v-if="showVersionForm" class="agm-version-form mb-300">
            <div class="mb-200">
              <FormField :label="$t('agm.summary_en')" class="mb-200">
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
            <div class="flex jc-fe gap-200">
              <BasicButton
                :text="$t('common.cancel')"
                class="bg-basic-200 t-basic-600"
                @click="cancelVersionForm"
              />
              <BasicButton
                :text="$t('agm.create_version')"
                class="bg-support-400 t-basic-100"
                @click="createVersion"
              />
            </div>
          </div>

          <!-- Versions table -->
          <p v-if="!versions.length" class="fs-200 t-basic-500">
            {{ $t("agm.no_definitions") }}
          </p>
          <table v-else class="agm-versions-table w-100">
            <thead>
              <tr>
                <th class="agm-th">{{ $t("agm.version_number") }}</th>
                <th class="agm-th">{{ $t("agm.summary_en") }}</th>
                <th class="agm-th">{{ $t("agm.published_at") }}</th>
                <th class="agm-th">{{ $t("agm.created_at") }}</th>
                <th class="agm-th"></th>
              </tr>
            </thead>
            <tbody>
              <template v-for="ver in versions" :key="ver.id">
                <tr class="agm-tr">
                  <td class="agm-td">{{ ver.version_number }}</td>
                  <td
                    class="agm-td agm-td--summary"
                    v-html="ver.summary_en || '---'"
                  />
                  <td class="agm-td">
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
                  <td class="agm-td">{{ formatDate(ver.created_at) }}</td>
                  <td class="agm-td">
                    <div class="flex gap-100 jc-fe">
                      <BasicButton
                        v-if="!ver.published_at"
                        text=""
                        icon="pencil"
                        class="bg-basic-200 t-basic-600"
                        :title="$t('agm.edit_draft')"
                        @click="startEditDraft(ver)"
                      />
                      <BasicButton
                        v-else
                        text=""
                        icon="pencil"
                        class="bg-basic-200 t-basic-600"
                        :title="$t('agm.create_draft_from_published')"
                        @click="startEditPublished(ver)"
                      />
                      <BasicButton
                        v-if="!ver.published_at"
                        :text="$t('agm.publish')"
                        class="bg-support-400 t-basic-100"
                        @click="publishVersion(ver.id)"
                      />
                    </div>
                  </td>
                </tr>

                <!-- Inline draft edit form -->
                <tr
                  v-if="editingVersionId === ver.id && !ver.published_at"
                  :key="`edit-${ver.id}`"
                >
                  <td colspan="5" class="agm-td">
                    <div class="agm-version-form">
                      <div class="mb-200">
                        <FormField :label="$t('agm.summary_en')" class="mb-200">
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
                      <div class="flex jc-fe gap-200">
                        <BasicButton
                          :text="$t('common.cancel')"
                          class="bg-basic-200 t-basic-600"
                          @click="cancelEditVersion"
                        />
                        <BasicButton
                          :text="$t('common.save')"
                          class="bg-support-400 t-basic-100"
                          @click="saveDraftVersion(ver.id)"
                        />
                      </div>
                    </div>
                  </td>
                </tr>
              </template>
            </tbody>
          </table>
        </div>

        <!-- Legal Page History (only when definition has content_route) -->
        <div
          v-if="isEdit && definition.content_route"
          class="agm-section mb-400"
        >
          <div
            class="flex ai-ct gap-200 pointer"
            @click="contentHistoryOpen = !contentHistoryOpen"
          >
            <font-awesome-icon icon="clock-rotate-left" class="t-basic-500" />
            <h2 class="fs-500 fw-600">{{ $t("agm.content_history") }}</h2>
            <font-awesome-icon
              :icon="contentHistoryOpen ? 'chevron-up' : 'chevron-down'"
              class="t-basic-500 fs-200"
            />
          </div>

          <template v-if="contentHistoryOpen">
            <div class="flex gap-100 mt-300 mb-300">
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

            <p v-if="!contentSnapshots.length" class="t-basic-500 fs-200">
              {{ $t("agm.content_history_empty") }}
            </p>

            <table v-else class="agm-versions-table w-100">
              <thead>
                <tr>
                  <th class="agm-th">{{ $t("agm.published_at") }}</th>
                  <th class="agm-th">{{ $t("builder.language") }}</th>
                  <th class="agm-th">{{ $t("common.preview") }}</th>
                  <th class="agm-th"></th>
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
                    <td class="agm-td">
                      <span>{{ formatDate(snap.created_at) }}</span>
                      <StatusBadge
                        v-if="idx === 0"
                        :label="$t('agm.snapshot_current')"
                        variant="positive"
                        class="ml-100"
                      />
                    </td>
                    <td class="agm-td">{{ snap.language }}</td>
                    <td class="agm-td agm-td--summary">
                      {{ snap.text_preview }}
                    </td>
                    <td class="agm-td">
                      <div class="flex gap-100 ai-ct jc-fe">
                        <StatusBadge
                          v-if="snap.warnings && snap.warnings.length"
                          :label="$t('agm.snapshot_warnings')"
                          variant="warning"
                        />
                        <font-awesome-icon
                          :icon="
                            expandedSnapshot === snap.published_id
                              ? 'chevron-up'
                              : 'chevron-down'
                          "
                          class="t-basic-500"
                        />
                      </div>
                    </td>
                  </tr>
                  <tr
                    v-if="expandedSnapshot === snap.published_id"
                    :key="`exp-${snap.published_id}`"
                  >
                    <td colspan="4" class="agm-td">
                      <div
                        class="agm-legal-text-preview"
                        v-html="snap.text_html"
                      />
                    </td>
                  </tr>
                </template>
              </tbody>
            </table>
          </template>
        </div>
      </template>
    </div>

    <Confirmation-modal
      :visible="showDeleteConfirm"
      @accept="deleteDefinition"
      @reject="showDeleteConfirm = false"
    >
      <template #header
        ><h2>{{ $t("pim.confirm_delete_title") }}</h2></template
      >
      <template #description
        ><p>{{ $t("agm.confirm_delete") }}</p></template
      >
    </Confirmation-modal>

    <Confirmation-modal
      :visible="showPublishedEditConfirm"
      @accept="confirmEditPublished"
      @reject="showPublishedEditConfirm = false"
    >
      <template #header
        ><h2>{{ $t("agm.create_draft_from_published") }}</h2></template
      >
      <template #description
        ><p>{{ $t("agm.edit_published_confirm") }}</p></template
      >
    </Confirmation-modal>
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
import ConfirmationModal from "@/functionals/Confirmation-modal/index.vue";
import { extractApiMessage } from "@/composables/useFormErrors";

export default {
  name: "AgreementEdit",
  components: { ConfirmationModal },
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
    toggleChannel(id) {
      const idx = this.form.channel_ids.indexOf(id);
      if (idx >= 0) {
        this.form.channel_ids.splice(idx, 1);
      } else {
        this.form.channel_ids.push(id);
      }
    },
    toggleContext(value) {
      const idx = this.form.display_contexts.indexOf(value);
      if (idx >= 0) {
        this.form.display_contexts.splice(idx, 1);
      } else {
        this.form.display_contexts.push(value);
      }
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
  border: 1px solid var(--c-basic-200);
  border-radius: var(--radius-md);
  padding: 20px;
}

.agm-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: var(--space-200);
}

.agm-version-form {
  border: 1px solid var(--c-basic-200);
  border-radius: var(--radius-md);
  padding: 16px;
  background: var(--c-basic-200);
}

.agm-versions-table {
  border-collapse: collapse;
}

.agm-th {
  text-align: left;
  font-size: var(--fs-200);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  color: var(--c-basic-500);
  padding: 8px 12px;
  border-bottom: 2px solid var(--c-basic-200);
}

.agm-tr:hover {
  background: var(--c-basic-200);
}

.agm-td {
  padding: 10px 12px;
  border-bottom: 1px solid var(--c-basic-200);
  font-size: var(--fs-300);
  color: var(--c-basic-700);
}

.agm-td--summary {
  max-width: 300px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.agm-system-info {
  font-size: var(--fs-300);
  color: var(--c-basic-500);
  background: var(--c-basic-200);
  border-radius: var(--radius-md);
  padding: 10px 16px;
}

.agm-context-tag {
  display: inline-flex;
  align-items: center;
  padding: 2px 10px;
  border-radius: var(--radius-sm);
  background: var(--c-basic-200);
  color: var(--c-basic-700);
  font-size: var(--fs-200);
  font-weight: 600;
}

.agm-legal-text-preview {
  max-height: 400px;
  overflow-y: auto;
  padding: 16px;
  background: var(--c-basic-200);
  border-radius: var(--radius-md);
  font-size: var(--fs-300);
  line-height: 1.6;
  color: var(--c-basic-700);
}
</style>
