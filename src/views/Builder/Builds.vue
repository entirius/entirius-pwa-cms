<template>
  <div class="site-genator t-body fs-300 page-pad-x h-100 ovy-auto">
    <FloatingActions :actions="fabActions" />
    <div class="flex jc-sb ai-ct mv-8">
      <MobileFilterPanel
        :active-count="activeFilters.length"
        :trigger-label="$t('builder.filters')"
      >
        <p class="fs-200 t-secondary">{{ $t("builder.filters") }}</p>
        <template v-if="user && user.buildTypes">
          <FilterChip
            v-for="t in user.buildTypes.filter(
              (bt) => bt._for === content_type
            )"
            :key="`filter-${t.slug}`"
            :label="tBuildType(t.slug, t.label)"
            :active="activeFilters.includes(t.slug)"
            @click="setFilter(t)"
          />
        </template>
        <FilterChip
          v-if="activeFilters.length"
          label="✕"
          @click="activeFilters = []"
        />
      </MobileFilterPanel>
      <div class="flex gap-2 js-fe">
        <BasicButton
          v-if="translatorAvailable"
          :label="$t('builder.translate_all')"
          variant="secondary"
          class="icon-only-mobile"
          @click="showTranslateModal = true"
        >
          {{ $t('builder.translate_all') }}
        </BasicButton>
        <BasicSelect
          v-if="availableLanguages && language"
          :options="
            availableLanguages.map((val) => {
              return {
                label: `${val.iso2}`,
                value: val.iso2,
              };
            })
          "
          style="width: 4rem"
          :model-value="language.toUpperCase()"
          @update:model-value="
            ($event) => {
              if ($event.toLowerCase() === language) return;
              $router
                .replace({ query: { lg: $event.toLowerCase() } })
                .catch(() => {});
              init({ language: $event });
            }
          "
          :placeholder="$t('builder.language')"
          :aria-label="$t('builder.language')"
        />
      </div>
    </div>

    <template
      v-for="(doc, i) in activeFilters.length
        ? docs.filter((doc) => {
            return activeFilters.indexOf(doc.type) > -1;
          })
        : docs"
    >
      <div
        :key="`content_type-${i}`"
        v-if="doc.data.length"
        class="doc-section mb-10"
      >
        <div class="doc-section__header">
          {{ tBuildType(doc.type, doc.label) }}
          <span class="doc-section__count">{{ doc.data.length }}</span>
        </div>

        <DataTable
          :columns="contentColumns"
          :rows="doc.data"
          :empty-text="$t('builder.no_content_title')"
          row-key="uid"
          @row-click="(row) => navigateToEditor(row, doc.type)"
        >
          <template #cell-name="{ row }">
            <router-link
              class="data-table__name-link"
              :to="{
                name: 'Builder',
                params: { type: doc.type, uid: row.uid },
                query: { lg: language },
              }"
              @click.stop
              >{{
                row.name && row.name.length ? row.name : row.uid
              }}</router-link
            >
          </template>

          <template #cell-updated_at="{ value }">
            {{ new Date(value).toLocaleDateString("en") }}
            {{ new Date(value).toLocaleTimeString("pl") }}
          </template>

          <template #cell-status="{ row }">
            <StatusBadge
              :label="
                row.is_published ? $t('builder.published') : $t('builder.draft')
              "
              :tone="row.is_published ? 'positive' : 'informative'"
            />
          </template>

          <template #cell-actions="{ row }">
            <BasicButton
              size="sm"
              variant="ghost"
              class="data-table__action-btn"
              @click="
                $router.push({
                  name: 'Builder',
                  params: { type: doc.type, uid: row.uid },
                  query: { lg: language },
                })
              "
            >
              {{ canCreate ? $t('builder.edit') : $t('builder.preview') }}
            </BasicButton>
            <IconButton
              v-if="doc.type !== 'legal-page'"
              icon="delete"
              :label="$t('builder.delete')"
              variant="danger"
              size="sm"
              class="data-table__action-btn"
              :disabled="!canCreate"
              @click="
                () => {
                  confirmation_modal = true;
                  to_remove = [doc.type, row.uid];
                }
              "
            />
          </template>
        </DataTable>
        <div class="mv-2 ph-2" v-if="doc.pagination">
          <Pagination
            :nav_size="32"
            :page="doc.pagination.page"
            :pages="doc.pagination.pages"
            @update:page="setPagination({ page: $event, type: doc.type })"
          />
        </div>
      </div>
      <ConfirmDialog
        tone="danger"
        :open="confirmation_modal"
        @confirm="
          () => {
            removeDoc(to_remove[0], to_remove[1]);
            confirmation_modal = false;
          }
        "
        @cancel="confirmation_modal = false"
        :title="$t('builder.confirm_title')"
      >
        <template #default>
          <p>{{ $t("builder.confirm_msg") }}</p>
        </template>
      </ConfirmDialog>
    </template>

    <div
      v-if="contentTypes !== null && !hasVisibleContent"
      class="page-card flex ai-ct jc-ct gap-5 t-muted"
      style="min-height: 14rem; flex-direction: column"
    >
      <p class="fs-400 fw-600 t-secondary">
        {{ $t("builder.no_content_title") }}
      </p>
      <p class="fs-200 t-muted ta-ct" style="max-width: 30rem">
        {{ $t("builder.no_content_msg") }}
      </p>
    </div>

    <TranslateAllContentModal
      :visible="showTranslateModal"
      :channel-idx="contentDBChannel.activeChannel?.idx || ''"
      :title="$t('builder.translate_all')"
      @close="showTranslateModal = false"
      @translated="init({})"
    />
  </div>
</template>

<script>
import {
  GET_Content,
  DELETE_Content,
  GET_ContentTypes,
} from "../../api/contentDB/api";
import { useLoaderStore } from "@/stores/loader";
import { useNotifyStore } from "@/stores/notify";
import { useUserStore } from "@/stores/user";
import { useContentDBChannelStore } from "@/stores/contentDBChannel";
import { useMuninStore } from "@/stores/munin";
import config_options from "@/../__client/configs/__config_options";

const section_options = (value, look_for = null) => {
  if (!config_options[value]) return "no_options";
  if (look_for) return config_options[value][look_for];
  return config_options[value];
};

import TranslateAllContentModal from "@/functionals/TranslateAllContentModal/index.vue";
export default {
  setup() {
    const loader = useLoaderStore();
    const notify = useNotifyStore();
    const userStore = useUserStore();
    const contentDBChannel = useContentDBChannelStore();
    const munin = useMuninStore();
    return { loader, notify, userStore, contentDBChannel, munin };
  },
  data() {
    return {
      confirmation_modal: false,
      showTranslateModal: false,
      to_remove: null,
      // ----------
      config_options,
      // ----------
      content_type: null,
      docs: [],
      activeFilters: [],
      docsFilters: [],
      contentTypesListActive: false,
      contentTypes: null,
      language: null,
    };
  },
  computed: {
    translatorAvailable() {
      return this.munin.isModuleInstalled("contentdb_translator");
    },
    user() {
      return this.userStore.user;
    },
    canCreate() {
      return Boolean(this.user?.buildTypes?.some((type) => type.actions?.includes("create")));
    },
    availableLanguages() {
      return this.contentDBChannel.languages;
    },
    fabActions() {
      if (!this.user || !this.user.buildTypes) return [];
      return this.user.buildTypes
        .filter((bt) => bt._for === this.content_type)
        .map((bt, index) => {
          const config_max = this.section_options(bt.slug, "max_self");
          const doc_count = this.docs[index] ? this.docs[index]["count"] : 0;
          const is_disabled =
            !bt.actions.includes("create") || doc_count >= config_max;
          return {
            icon: "add",
            label: this.tBuildType(bt.slug, bt.label),
            handler: () => this.create_new(bt),
            disabled: is_disabled,
          };
        });
    },
    contentColumns() {
      return [
        {
          key: "name",
          label: this.$t("builder.name"),
          width: "1fr",
          truncate: true,
          title: (row) => row.name || row.uid,
        },
        {
          key: "updated_at",
          label: this.$t("builder.edit_date"),
          width: "160px",
          priority: 2,
        },
        {
          key: "status",
          label: this.$t("builder.status"),
          width: "110px",
          align: "center",
        },
        { key: "actions", label: "", align: "right", actions: true },
      ];
    },
    hasVisibleContent() {
      const filtered = this.activeFilters.length
        ? this.docs.filter((doc) => this.activeFilters.indexOf(doc.type) > -1)
        : this.docs;
      return filtered.some((doc) => doc.data && doc.data.length > 0);
    },
  },
  methods: {
    navigateToEditor(row, type) {
      this.$router.push({
        name: "Builder",
        params: { type, uid: row.uid },
        query: { lg: this.language },
      });
    },
    async setPagination({ page, type, limit }) {
      try {
        this.loader.loaderStart();
        const {
          data: { data = [], meta = {}, pagination = {} },
        } = await GET_Content({
          type: type,
          page: page,
          limit: limit,
        });

        this.docs = this.docs.map((doc) => {
          return doc.type === type ? { ...doc, data, pagination } : doc;
        });
      } catch ({ response }) {
        console.log(response);
      } finally {
        this.loader.loaderFinish();
      }
    },
    async removeDoc(type, uid) {
      const docs = this.docs;
      const idx = docs.findIndex((cat) => cat.type === type);
      try {
        this.loader.loaderStart();
        const res = await DELETE_Content({
          CDB_TYPE: this.content_type,
          type: type,
          uid: uid,
        });
        //if (!res) throw new Error();

        docs[idx].data = docs[idx].data.filter((entry) => entry.uid !== uid);
        this.notify.spawnNotification({
          msg: this.$t("notifications.doc_deleted"),
          type: "informative",
        });
        docs[idx]["count"] = docs[idx]["count"] - 1;
      } catch ({ response }) {
        console.log(response);
        this.notify.spawnNotification({
          msg: this.$t("notifications.error"),
          type: "negative",
        });
      } finally {
        this.loader.loaderFinish();
      }
    },
    setFilter({ slug = null, label = null }) {
      this.activeFilters.indexOf(slug) === -1
        ? this.activeFilters.push(slug)
        : (this.activeFilters = this.activeFilters.filter(
            (filter) => filter !== slug
          ));
    },
    async init({ language = null, _content_type = null }) {
      let { lg = null } = this.$route.query;
      let { content_type = null } = this.$route.params;

      lg = !language ? lg : language;
      content_type = !_content_type ? content_type : _content_type;

      if (!lg) {
        lg = this.contentDBChannel.defaultLanguage;
        this.$router
          .replace({ query: { ...this.$route.query, lg } })
          .catch(() => {});
      }

      this.language = lg;
      this.content_type = content_type;
      //this.language = lg;

      try {
        this.loader.loaderStart();

        const {
          data: { data: contentTypes = [], meta: contentMeta = {} },
        } = await GET_ContentTypes({ CDB_TYPE: content_type });

        this.contentTypes = contentTypes;
      } catch ({ response }) {
        console.log("err ---------------------------------");
        console.log(response);
        console.log("err ---------------------------------");
      }

      // ------
      // ------
      // ------
      if (Array.isArray(this.contentTypes) && !this.contentTypes.length) {
        this.docs = [];
      }
      if (this.contentTypes && this.contentTypes.length) {
        const promises = this.contentTypes.map((type) => {
          return GET_Content({
            CDB_TYPE: content_type,
            type: type.slug,
            language: lg ? lg.toUpperCase() : null,
          });
        });

        const response = await Promise.allSettled(promises);
        const model = response.reduce((arr, res) => {
          const { status = null, value = {} } = res;
          if (status === "rejected") return arr;

          const { data = {} } = value;
          const {
            data: content = [],
            content_type = null,
            pagination = null,
          } = data;

          arr.push({
            data: content,
            count: content.length,
            pagination,
            type: content_type,
            label: this.contentTypes.find((type) => type.slug === content_type)
              .label,
          });

          return arr;
        }, []);

        this.docs = model;
      }

      this.loader.loaderFinish();
    },
    create_new(type) {
      const { slug = null, _limit = null, _for = "content" } = type;
      // limitation for layout extender

      this.$router.push({
        name: "Builder",
        params: { type: slug },
        query: { lg: this.language },
      });
      return;
      const { data = [] } = this.docs.find((d) => d.type === slug);
      if (_for === "layout-extender" && data.length === _limit) {
        this.notify.spawnNotification({
          msg: this.$t("builder.doc_limit_reached"),
          type: "negative",
        });
        return;
      }
    },
    section_options(...value) {
      return section_options(...value);
    },
    tBuildType(slug, fallback) {
      const key = "config_option." + slug;
      const val = this.$t(key);
      return val !== key ? val : fallback;
    },
  },
  async created() {
    await this.contentDBChannel.fetchChannelsAndLanguages();
    await this.init({});
  },
  beforeRouteUpdate(to, from, next) {
    const { params = {}, query = {} } = to;
    const { content_type = null } = params;
    const { lg = null } = query;
    this.init({ _content_type: content_type, language: lg });
    next();
  },
  components: {
    TranslateAllContentModal,
  },
};
</script>

<style lang="scss" scoped>
.doc-section {
  border-radius: var(--radius-base);
  overflow: hidden;
  border: 1px solid var(--border-subtle);
}
.doc-section__header {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-4);
  font-size: var(--fs-200);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  color: var(--text-secondary);
  background-color: var(--surface-base);
  border-bottom: 1px solid var(--border-subtle);
}
.doc-section__count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 20px;
  height: 20px;
  padding: 0 var(--space-1);
  font-size: var(--fs-200);
  font-weight: 600;
  border-radius: var(--radius-full);
  background-color: var(--surface-hover);
  color: var(--text-secondary);
}
.data-table__name-link {
  display: block;
  min-width: 0;
  color: var(--text-body);
  text-decoration: none;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  &:hover {
    color: var(--text-accent);
  }
}
</style>
