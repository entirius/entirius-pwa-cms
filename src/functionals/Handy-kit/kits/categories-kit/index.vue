<template>
  <div class="categories-kit fs-200 t-basic-600 flex-column fg-1 jc-sb gap-300">
    <div class="grid gap-300">
      <nav
        class="grid grid-col-2 grid-col-2-m ai-ct bg-basic-200 pl-400 pr-400 pt-200 pb-200 t-basic-600 br-tl-50 br-tr-50"
      >
        <p class="fw-600 fs-400 uppercase">
          {{ handyType.label ? handyType.label : $t("common.click") }}
        </p>
        <p
          class="js-fe t-basic-600"
          @click="handy.open_Handykit({ typeId: false })"
        >
          <i class="icon-close-mini pointer" />
        </p>
      </nav>
      <div class="ph-300">
        <div
          :class="
            editing_category ? 'p-200 br-50 bg-basic-200 b-support-400' : ''
          "
          :style="
            editing_category
              ? 'border-left: 3px solid var(--c-support-400)'
              : ''
          "
        >
          <p
            class="mb-100"
            :class="{ 'fs-100 fw-600 t-support-400': editing_category }"
          >
            {{
              editing_category
                ? $t("categories.edit_category")
                : $t("images.add_new_category")
            }}
          </p>
          <div class="flex gap-100">
            <BasicInput
              v-model="new_c"
              class="lh-base-elem w-50"
              :placeholder="$t('common.start_typing')"
            />
            <BasicButton
              v-if="editing_category"
              class="b-basic-400 t-basic-600 br-50 fs-200"
              :text="$t('common.cancel')"
              @click="
                editing_category = null;
                new_c = '';
              "
            />
            <BasicButton
              class="bg-basic-700 br-50 bg-support-400 fs-200 b-support-400 t-basic-100"
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
        <hr class="bb-basic-200 mv-300" />
        <p class="mb-100">
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
          class="br-50 bg-basic-100 b-basic-400 override-dropdown"
          :class="{ 'bg-basic-200': !c || (Array.isArray && !c.length) }"
          :isDisabled="!c || (Array.isArray && !c.length)"
          :custom_droplist="true"
        >
          <template v-slot:custom>
            <LazyScroll
              @onLazy="load_more"
              style="height: 100; max-height: 10rem"
            >
              <div
                v-for="{ label = null, value = null } in c"
                class="ph-100 flex jc-sb ai-ct"
                @click="
                  c_to_set = { label, value };
                  if (editing_category) {
                    editing_category = null;
                    new_c = '';
                  }
                "
              >
                <span>{{ label }} </span>
                <span class="flex gap-200 ai-ct">
                  <span
                    class="t-support-400 pointer"
                    @click.stop="
                      editing_category = { uid: value, name: label };
                      new_c = label;
                    "
                    >{{ $t("common.edit") }}</span
                  >
                  <span
                    class="t-negative-200 pointer"
                    @click.stop="
                      confirmation_modal = true;
                      to_delete = value;
                    "
                    >{{ $t("common.delete") }}</span
                  >
                </span>
              </div>
            </LazyScroll>
          </template>
        </Dropdown>
        <template v-if="c_to_set">
          <div
            class="mv-300 t-basic-600 bg-basic-200 p-100 br-50 b-basic-400 flex"
          >
            <div class="fg-1">
              <p class="fs-300 fw-600">{{ $t("categories.category") }}:</p>
              <p class="fs-200 mt-100">
                {{ c_to_set.label }} ({{ c_to_set.value }})
              </p>
            </div>
            <BasicButton
              :text="$t('categories.unset')"
              class="b-negative-200 t-negative-200 br-50"
              @click="pass_asset({ force_unset: true })"
            />
          </div>
        </template>
      </div>
    </div>

    <ConfirmationModal
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
      class="grid grid-col-3 rtl-direction bg-basic-200 pl-400 pr-400 pt-100 pb-100"
    >
      <BasicButton
        :text="$t('common.save')"
        class="br-50 w-100 jc-ct"
        :class="[
          !c_to_set
            ? 'bg-basic-300 b-basic-300 t-basic-500'
            : 'bg-support-400 b-support-400 t-basic-100 ',
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
import LazyScroll from "../../../../boots/LazyScroll/LazyScroll.vue";
import ConfirmationModal from "@/functionals/Confirmation-modal/index.vue";

const _base_url = `/category/`;
export default {
  setup() {
    const notify = useNotifyStore();
    const handy = useHandyStore();
    const contentDBChannel = useContentDBChannelStore();
    return { notify, handy, contentDBChannel };
  },
  components: {
    LazyScroll,
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
    load_more() {
      const { page = 1, pages = 1 } = this.cp;
      if (page >= pages) return;

      this.GET_CATEGORIES({
        page: page + 1,
        limit: this.cp.limit,
        language: this.language,
      });

      this.cp.page = page + 1;
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

        this.c = [...this.c, ..._data];

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
      await this.GET_CATEGORIES({ language: this.language });
    },
  },
  created() {
    this.init();
  },
};
</script>
<style lang="scss">
.categories-kit {
  .dropdown-wrapper {
    .dropdown-list {
      overflow-y: unset;
    }
  }
}
</style>
