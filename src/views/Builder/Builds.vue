<template>
  <div class="site-genator t-basic-700 fs-300 ph-500 h-100 ovy-auto">
    <FloatingActions :actions="fabActions" />
    <div class="flex jc-sb ai-ct mv-300">
      <MobileFilterPanel
        :active-count="activeFilters.length"
        :trigger-label="$t('builder.filters')"
      >
        <p class="fs-200 t-basic-600">{{ $t("builder.filters") }}</p>
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
      <div class="flex gap-100 js-fe">
        <BasicButton
          v-if="translatorAvailable"
          :text="$t('builder.translate_all')"
          icon="language"
          class="bg-support-100 t-support-400"
          @click="showTranslateModal = true"
        />
        <Dropdown
          v-if="availableLanguages && language"
          :values="
            availableLanguages.map((val) => {
              return {
                label: `${val.iso2}`,
                value: val.iso2,
              };
            })
          "
          style="width: 4rem"
          :selected="[!language ? null : language.toUpperCase()]"
          @onSelect="
            ($event) => {
              if ($event.toLowerCase() === language) return;
              $router
                .replace({ query: { lg: $event.toLowerCase() } })
                .catch(() => {});
              init({ language: $event });
            }
          "
          :placeholder="$t('builder.language')"
          class="bg-basic-100 b-basic-400 t-basic-600 fs-200 br-50"
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
        class="doc-section mb-400"
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
              :variant="row.is_published ? 'positive' : 'informative'"
            />
          </template>

          <template #cell-actions="{ row }">
            <button
              class="data-table__action-btn"
              @click.stop="
                $router.push({
                  name: 'Builder',
                  params: { type: doc.type, uid: row.uid },
                  query: { lg: language },
                })
              "
            >
              <i class="icon-edit" />
              {{
                !user?.buildTypes?.some((type) =>
                  type.actions?.includes("create")
                )
                  ? $t("builder.preview")
                  : $t("builder.edit")
              }}
            </button>
            <button
              v-if="doc.type !== 'legal-page'"
              class="data-table__action-btn data-table__action-btn--danger"
              :class="[
                !user?.buildTypes?.some((type) =>
                  type.actions?.includes('create')
                )
                  ? 'data-table__action-btn--disabled'
                  : '',
              ]"
              @click.stop="
                () => {
                  confirmation_modal = true;
                  to_remove = [doc.type, row.uid];
                }
              "
            >
              <i class="icon-bin" />
              {{ $t("builder.delete") }}
            </button>
          </template>
        </DataTable>
        <div class="mv-100 ph-100" v-if="doc.pagination">
          <Pagination
            :nav_size="32"
            :pagination="doc.pagination"
            @onChangePage="setPagination({ page: $event, type: doc.type })"
          />
        </div>
      </div>
      <ConfirmationModal
        :visible="confirmation_modal"
        @accept="
          () => {
            removeDoc(to_remove[0], to_remove[1]);
            confirmation_modal = false;
          }
        "
        @reject="confirmation_modal = false"
      >
        <template #header>
          <h2>{{ $t("builder.confirm_title") }}</h2>
        </template>
        <template #description>
          <p>{{ $t("builder.confirm_msg") }}</p>
        </template>
      </ConfirmationModal>
    </template>

    <div
      v-if="contentTypes !== null && !hasVisibleContent"
      class="flex ai-ct jc-ct gap-200 p-500 br-50 b-basic-300 bg-basic-100 t-basic-500"
      style="min-height: 14rem; flex-direction: column"
    >
      <p class="fs-400 fw-600 t-basic-600">
        {{ $t("builder.no_content_title") }}
      </p>
      <p class="fs-200 t-basic-500 ta-ct" style="max-width: 30rem">
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

import ConfirmationModal from "@/functionals/Confirmation-modal/index.vue";
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
            icon: "plus",
            label: this.tBuildType(bt.slug, bt.label),
            handler: () => this.create_new(bt),
            disabled: is_disabled,
          };
        });
    },
    contentColumns() {
      return [
        { key: "name", label: this.$t("builder.name"), width: "1fr" },
        {
          key: "updated_at",
          label: this.$t("builder.edit_date"),
          width: "160px",
        },
        {
          key: "status",
          label: this.$t("builder.status"),
          width: "110px",
          align: "center",
        },
        { key: "actions", label: "", width: "140px", align: "right" },
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
    ConfirmationModal,
    TranslateAllContentModal,
  },
};
</script>

<style lang="scss" scoped>
.doc-section {
  border-radius: 5px;
  overflow: hidden;
  border: 1px solid var(--c-basic-300);
}
.doc-section__header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  color: var(--c-basic-600);
  background-color: var(--c-basic-100);
  border-bottom: 1px solid var(--c-basic-300);
}
.doc-section__count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 20px;
  height: 20px;
  padding: 0 6px;
  font-size: 11px;
  font-weight: 600;
  border-radius: 50px;
  background-color: var(--c-basic-300);
  color: var(--c-basic-600);
}
.data-table__name-link {
  display: block;
  min-width: 0;
  color: var(--c-basic-700);
  text-decoration: none;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  &:hover {
    color: var(--c-support-400);
  }
}
.data-table__action-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  font-size: 12px;
  color: var(--c-basic-600);
  background: none;
  border: 1px solid transparent;
  border-radius: 5px;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.15s ease;
  &:hover {
    background-color: var(--c-basic-300);
    border-color: var(--c-basic-400);
  }
  &--danger:hover {
    color: var(--c-negative-200);
    border-color: var(--c-negative-200);
    background-color: var(--c-basic-100);
  }
  &--disabled {
    opacity: 0.35;
    pointer-events: none;
  }
}
@media only screen and (max-width: 768px) {
  .site-genator {
    padding-left: 16px !important;
    padding-right: 16px !important;
  }
}
</style>
