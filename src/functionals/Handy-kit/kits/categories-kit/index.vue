<template>
  <div class="categories-kit fs-200 t-secondary flex-column fg-1 jc-sb gap-8">
    <div class="grid gap-8">
      <nav
        class="grid grid-col-2 grid-col-2-m ai-ct bg-raised pl-10 pr-10 pt-5 pb-5 t-secondary rounded-tl rounded-tr"
      >
        <p class="fw-600 fs-400 uppercase">
          {{ handyType.label ? handyType.label : $t("common.click") }}
        </p>
        <p
          class="js-fe t-secondary"
          @click="handy.open_Handykit({ typeId: false })"
        >
          <FontAwesomeIcon :icon="$icons.close" class="pointer" />
        </p>
      </nav>
      <div class="ph-8">
        <div
          :class="
            editing_category ? 'p-5 rounded bg-raised b-accent' : ''
          "
          :style="
            editing_category
              ? 'border-left: 3px solid var(--accent)'
              : ''
          "
        >
          <p
            class="mb-2"
            :class="{ 'fs-200 fw-600 t-accent': editing_category }"
          >
            {{
              editing_category
                ? $t("categories.edit_category")
                : $t("images.add_new_category")
            }}
          </p>
          <div class="flex gap-2">
            <BasicInput
              v-model="new_c"
              class="lh-base-elem w-50"
              :placeholder="$t('common.start_typing')"
            />
            <BasicButton
              v-if="editing_category"
              class="b-default t-secondary rounded fs-200"
              :text="$t('common.cancel')"
              @click="
                editing_category = null;
                new_c = '';
              "
            />
            <BasicButton
              class="bg-inverse rounded bg-accent-fill fs-200 b-accent t-on-accent-fill"
              :text="editing_category ? $t('common.save') : $t('common.post')"
              @click="
                editing_category
                  ? PUT_CATEGORY({
                      uid: editing_category.uid,
                      cat_name: new_c,
                      language: language,
                    })
                  : POST_CATEGORY({ cat_name: new_c, language: language })
              "
            />
          </div>
        </div>
        <hr class="bb-subtle mv-8" />
        <p class="mb-2">
          {{
            ` ${
              !c || (Array.isArray && !c.length)
                ? $t("categories.select_category")
                : $t("categories.category")
            }`
          }}
        </p>
        <Dropdown
          :key="`dropdown-${Object.values(c_to_set ?? {}).at(1)}`"
          :placeholder="`${
            !c || (Array.isArray && !c.length)
              ? $t('categories.select_category')
              : $t('categories.category')
          }`"
          class="rounded bg-base b-default override-dropdown"
          :class="{ 'bg-raised': !c || (Array.isArray && !c.length) }"
          :isDisabled="!c || (Array.isArray && !c.length)"
          :custom_droplist="true"
        >
          <template v-slot:custom>
            <div class="categories-kit__list ovy-auto">
              <div
                v-for="{ label = null, value = null } in c"
                class="ph-2 flex jc-sb ai-ct"
                @click="
                  c_to_set = { label, value };
                  if (editing_category) {
                    editing_category = null;
                    new_c = '';
                  }
                "
              >
                <span>{{ label }} </span>
                <span class="flex gap-5 ai-ct">
                  <span
                    class="t-accent pointer"
                    @click.stop="
                      editing_category = { uid: value, name: label };
                      new_c = label;
                    "
                    >{{ $t("common.edit") }}</span
                  >
                  <span
                    class="t-negative pointer"
                    @click.stop="
                      confirmation_modal = true;
                      to_delete = value;
                    "
                    >{{ $t("common.delete") }}</span
                  >
                </span>
              </div>
            </div>
          </template>
        </Dropdown>
        <template v-if="c_to_set">
          <div
            class="mv-8 t-secondary bg-raised p-2 rounded b-default flex"
          >
            <div class="fg-1">
              <p class="fs-300 fw-600">{{ $t("categories.category") }}:</p>
              <p class="fs-200 mt-2">
                {{ c_to_set.label }} ({{ c_to_set.value }})
              </p>
            </div>
            <BasicButton
              :text="$t('categories.unset')"
              class="b-negative t-negative rounded"
              @click="pass_asset({ force_unset: true })"
            />
          </div>
        </template>
      </div>
    </div>

    <ConfirmationModal
      destructive
      :visible="confirmation_modal"
      @accept="
        () => {
          DELETE_CATEGORY(to_delete);
          confirmation_modal = false;
          to_delete = null;
        }
      "
      @reject="
        confirmation_modal = false;
        to_delete = null;
      "
    >
      <template #header>
        <h2>{{ $t("builder.confirm_title") }}</h2>
      </template>
      <template #description>
        <p>{{ $t("builder.confirm_msg") }}</p>
      </template>
    </ConfirmationModal>

    <div
      class="grid grid-col-3 rtl-direction bg-raised pl-10 pr-10 pt-2 pb-2"
    >
      <BasicButton
        :text="$t('common.save')"
        class="rounded w-100 jc-ct"
        :class="[
          !c_to_set
            ? 'bg-hover b-subtle t-muted'
            : 'bg-accent-fill b-accent t-on-accent-fill ',
        ]"
        :isDisabled="!c_to_set"
        @click="pass_asset({})"
      />
    </div>
  </div>
</template>

<script>
import { useNotifyStore } from "@/stores/notify";
import { useHandyStore } from "@/stores/handy";
import { useContentDBChannelStore } from "@/stores/contentDBChannel";
import { _METHOD_content } from "../../../../api/contentDB/api";
import ConfirmationModal from "@/functionals/Confirmation-modal/index.vue";

const _base_url = `/category/`;
const ALL_PAGES_LIMIT = 100;
export default {
  setup() {
    const notify = useNotifyStore();
    const handy = useHandyStore();
    const contentDBChannel = useContentDBChannelStore();
    return { notify, handy, contentDBChannel };
  },
  components: {
    ConfirmationModal,
  },
  data() {
    return {
      loading: false,
      c: null,
      cp: null,
      new_c: "",
      editing_category: null,
      confirmation_modal: false,
      to_delete: null,
      language: null,
      c_to_set: null,
      default_c: null,
      closed: false,
    };
  },
  computed: {
    handyType() {
      return this.handy.handyType;
    },
    defaults() {
      return this.handy.defaults;
    },
  },
  methods: {
    open_Handykit(params) {
      this.handy.open_Handykit(params);
    },
    pass_Asset(asset) {
      this.handy.pass_Asset(asset);
    },
    set_additional_data() {
      const { lg = null } = this.$route.query;
      this.language = lg || this.contentDBChannel.defaultLanguage || "en";

      const { category: default_category = null } = this.defaults;
      this.default_c = default_category;

      if (default_category && typeof default_category === "object") {
        this.c_to_set = {
          label: default_category.name,
          value: default_category.uid,
        };
      }

      if (default_category && typeof default_category === "string")
        this.GET_CATEGORY({ uid: default_category });
    },
    // Every page, one after the other: the list scrolls in its own box (LazyScroll never fired, a Vue 2 directive,
    // so only the first page ever showed).
    async GET_ALL_CATEGORIES() {
      const params = { limit: ALL_PAGES_LIMIT, language: this.language };
      await this.GET_CATEGORIES(params);
      for (let page = 2; this.cp && page <= this.cp.pages && !this.closed; page += 1) {
        await this.GET_CATEGORIES({ ...params, page });
      }
    },
    async GET_CATEGORIES({ limit = 6, page = 1, language = null } = {}) {
      try {
        this.loading = true;
        const { data: response = null } = await _METHOD_content({
          method: "get",
          url: _base_url,
          params: {
            limit,
            page,
            language: language ? language.toUpperCase() : undefined,
          },
        });

        const { data = null, meta = null, pagination = null } = response ?? {};

        if (!this.c) this.c = [];

        if (!data || (Array.isArray(data) && !data.length)) return;

        const _data = data.map(({ uid = null, name = null }) => {
          return {
            label: name,
            value: uid,
          };
        });

        // A category created while the pages load comes back in a later page: keep it once.
        const known = new Set(this.c.map(({ value }) => value));
        this.c = [...this.c, ..._data.filter(({ value }) => !known.has(value))];

        if (!this.cp) this.cp = pagination;
      } catch (error) {
        console.log(error);
      } finally {
        this.loading = false;
      }
    },
    async GET_CATEGORY({ uid }) {
      try {
        const { data: response = null } = await _METHOD_content({
          method: "get",
          url: `${_base_url}${uid}`,
        });

        const { data = null } = response ?? {};
        if (!data) return;

        const { name = null, uid: _uid = null } = data ?? {};

        this.c_to_set = {
          label: name,
          value: _uid,
        };
      } catch (error) {
        this.notify.spawnNotification({
          title: this.$t("notifications.error"),
          msg: this.$t("notifications.unexpected_error"),
          type: "negative",
        });
      }
    },
    async POST_CATEGORY({ cat_name = "", language = "pl" }) {
      if (!cat_name.length) {
        this.notify.spawnNotification({
          title: this.$t("notifications.error"),
          msg: this.$t("categories.empty_fields"),
          type: "negative",
        });
        return;
      }

      try {
        const payload = {
          name: cat_name,
          url_key: cat_name.split(" ").join("-"),
        };
        if (language) payload.language = language.toUpperCase();

        const { data: response = null } = await _METHOD_content({
          method: "post",
          url: _base_url,
          payload,
        });
        const { data = null } = response ?? {};
        if (!data) return;

        const { name: res_name = null, uid = null } = data ?? {};

        this.c = [
          {
            label: res_name,
            value: uid,
          },
          ...this.c,
        ];

        this.notify.spawnNotification({
          title: this.$t("notifications.success"),
          msg: this.$t("notifications.success_fun"),
          type: "positive",
        });
      } catch (error) {
        this.notify.spawnNotification({
          title: this.$t("notifications.error"),
          msg: this.$t("notifications.unexpected_error"),
          type: "negative",
        });
      }
    },
    async PUT_CATEGORY({ uid = null, cat_name = "", language = "pl" }) {
      if (!cat_name.length) {
        this.notify.spawnNotification({
          title: this.$t("notifications.error"),
          msg: this.$t("categories.empty_fields"),
          type: "negative",
        });
        return;
      }

      try {
        const payload = {
          name: cat_name,
          url_key: cat_name.split(" ").join("-"),
        };
        if (language) payload.language = language.toUpperCase();

        await _METHOD_content({
          method: "put",
          url: `${_base_url}${uid}/`,
          payload,
        });

        this.c = this.c.map((item) => {
          if (item.value === uid) {
            return { label: cat_name, value: uid };
          }
          return item;
        });

        if (this.c_to_set && this.c_to_set.value === uid) {
          this.c_to_set = { label: cat_name, value: uid };
        }

        this.editing_category = null;
        this.new_c = "";

        this.notify.spawnNotification({
          title: this.$t("notifications.success"),
          msg: this.$t("notifications.success_fun"),
          type: "positive",
        });
      } catch (error) {
        this.notify.spawnNotification({
          title: this.$t("notifications.error"),
          msg: this.$t("notifications.unexpected_error"),
          type: "negative",
        });
      }
    },
    async DELETE_CATEGORY(uid) {
      try {
        const { data: response = null } = await _METHOD_content({
          method: "delete",
          url: `${_base_url}${uid}`,
        });

        // NO RESPONSE xD

        this.c = this.c.filter(({ value }) => value !== uid);
      } catch (error) {
        this.notify.spawnNotification({
          title: this.$t("notifications.error"),
          msg: this.$t("notifications.unexpected_error"),
          type: "negative",
        });
      }
    },
    pass_asset({ force_unset = false } = {}) {
      if (force_unset) {
        this.pass_Asset(null);
        this.open_Handykit({});
        return;
      }

      const { value = null } = this.c_to_set;
      if (!value) return;
      this.pass_Asset(value);
      this.open_Handykit({});
    },
    async init() {
      this.set_additional_data();
      await this.GET_ALL_CATEGORIES();
    },
  },
  created() {
    this.init();
  },
  beforeUnmount() {
    this.closed = true; // stops loading the remaining pages
  },
};
</script>
<style lang="scss">
.categories-kit {
  .categories-kit__list {
    max-height: 10rem;
  }

  .dropdown-wrapper {
    .dropdown-list {
      overflow-y: unset;
    }
  }
}
</style>
