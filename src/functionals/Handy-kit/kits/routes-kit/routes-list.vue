<template>
  <div class="flex-column gap-300 jc-sb fg-1">
    <div class="fg-1 pl-400 pr-400 ovy-auto pb-400 h-100">
      <div>
        <p class="t-basic-600" v-if="type === 'static-page'">
          {{ $t("routes.paths_for_doc") }}
        </p>
        <p class="t-basic-600" v-else-if="type === 'blog-post'">
          {{ $t("routes.linked_paths") }}
        </p>
        <p class="t-basic-600" v-else>{{ $t("routes.linked_paths") }}</p>

        <hr class="mv-100" />
        <div class="flex gap-100">
          <div class="fg-1">
            <Dropdown
              :placeholder="`${$t('routes.list_of_paths')} (${routes.length})`"
              :values="routes"
              :selected="[
                Array.isArray(selected) && selected.at(0)
                  ? selected.at(0).value
                  : selected,
              ]"
              :complex_values="true"
              @onSelect="
                ({ draft = null, url = null, label = null }) => {
                  if (mode) CLOSE_form();
                  error = false;
                  if (draft) error = true;

                  if (['static-page', 'blog-post'].includes(type)) {
                    selected = [{ label, value: { draft, url, label } }];
                    return;
                  }

                  if (!selected) selected = [];

                  if (selected.some(({ value }) => value.url === url)) return;

                  selected.push({ label, value: { draft, url, label } });
                }
              "
              @onExtension="
                confirmation_modal = true;
                to_delete = $event.url;
              "
              @onExtension2="ENTER_edit_mode({ ...$event })"
              class="br-50 bg-basic-100 b-basic-400"
              :class="{ 'b-negative-200 t-negative-200': error }"
            />
            <template v-if="!['static-page', 'blog-post'].includes(type)">
              <p class="mt-300 mb-200">
                {{ $t("routes.multi_route_info") }}
              </p>
              <Dropdown
                :isDisabled="!selected"
                :values="
                  !selected
                    ? []
                    : selected.map((_selected) => {
                        return {
                          ..._selected,
                          label_ext: `(${$t('categories.unset')})`,
                          label_ext_class: 't-negative-200',
                        };
                      })
                "
                :complex_values="true"
                :placeholder="`${$t('routes.setted_routes')} (${
                  !selected ? 0 : selected.length
                })`"
                @onExtension="
                  ($event) => {
                    selected = selected.filter(
                      ({ label, value }) => value.url !== $event.url
                    );
                  }
                "
                class="br-50 bg-basic-100 b-basic-400"
              />
            </template>
          </div>
          <BasicButton
            style="min-width: 5.5rem"
            :icon="!mode ? 'plus' : false"
            :text="!mode ? $t('routes.set_new') : $t('common.close')"
            :class="{ 'jc-ct': mode }"
            class="as-s bg-basic-400 b-basic-400 t-basic-600 t-basic-100-hover bg-support-300-hover b-support-300-hover br-50"
            @click="
              () => {
                error = null;
                !mode ? (mode = 'add') : CLOSE_form();
              }
            "
          />
        </div>
        <hr class="mv-100" />

        <p class="fs-100 t-basic-600" v-if="type === 'static-page'">
          {{ $t("routes.static_page_help") }}
        </p>
        <p class="fs-100 t-basic-600" v-else-if="type === 'blog-post'">
          {{ $t("routes.blog_post_help") }}
        </p>
        <p class="fs-100 t-basic-600" v-else>
          {{ $t("routes.product_help") }}
        </p>

        <hr class="mv-100" />

        <div
          v-if="mode"
          class="mb-300 p-200 br-50"
          :class="
            mode === 'edit'
              ? 'bg-basic-200 b-support-400'
              : 'bg-basic-100 b-basic-400'
          "
          :style="
            mode === 'edit' ? 'border-left: 3px solid var(--c-support-400)' : ''
          "
          :key="force_refresh"
        >
          <div class="grid grid-col-2 gap-100">
            <BasicInput
              :label="$t('routes.route_value')"
              class="br-50 bg-basic-100 lh-base-elem"
              v-model="route_label"
            />
            <BasicInput
              :label="'URL'"
              class="br-50 bg-basic-100 lh-base-elem"
              v-model="route_url"
            />
          </div>

          <hr class="mv-100" />
          <div class="flex jc-fe gap-100">
            <BasicButton
              v-if="mode === 'edit'"
              :text="$t('common.cancel')"
              class="b-basic-400 t-basic-600 br-50"
              @click="CLOSE_form"
            />
            <BasicButton
              :text="
                mode === 'edit' ? $t('common.save') : $t('routes.add_route')
              "
              :icon="mode === 'edit' ? false : 'plus'"
              class="bg-support-400 b-support-400 t-basic-100 br-50"
              @click="SET_route({ label: route_label, url: route_url })"
            />
          </div>
        </div>
      </div>
    </div>
    <ConfirmationModal
      :visible="confirmation_modal"
      @accept="
        () => {
          DELETE_Route({ url: to_delete });
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
          !selected || selected.draft
            ? 'bg-basic-300 b-basic-300 t-basic-500'
            : 'bg-support-400 b-support-400 t-basic-100 ',
        ]"
        @click="pass_asset(selected)"
        :isDisabled="!selected"
      />
    </div>
  </div>
</template>

<script>
import { _METHOD_content } from "@/api/contentDB/api";
import { useNotifyStore } from "@/stores/notify";
import { useHandyStore } from "@/stores/handy";
import ConfirmationModal from "@/functionals/Confirmation-modal/index.vue";

export default {
  setup() {
    const notify = useNotifyStore();
    const handy = useHandyStore();
    return { notify, handy };
  },
  components: {
    ConfirmationModal,
  },
  data() {
    return {
      routes: [],
      type: null,
      route_payload: null,
      mode: null,
      // -------------------------------
      route_label: "",
      route_url: "",
      editing_route: null,
      confirmation_modal: false,
      to_delete: null,
      selected: null,
      error: null,
      force_refresh: 1,
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
    init() {
      const { type = null, routes = null } = this.defaults;
      if (!type) return;
      this.type = type;
      this.route_payload = routes;
      this.selected = !routes
        ? null
        : routes.map((url) => ({
            label: url,
            value: {
              url,
              draft: null,
              label: url,
            },
            label_ext: `(${this.$t("routes.in_use")})`,
            label_ext_class: "t-positive-200",
          }));
    },
    sortRoutes() {
      this.routes.sort((a, b) => {
        if (!this.route_payload) return 0;

        const aInPayload = this.route_payload.includes(a.value.url);
        const bInPayload = this.route_payload.includes(b.value.url);
        if (aInPayload && !bInPayload) return -1;
        if (!aInPayload && bInPayload) return 1;
        return 0;
      });
    },
    async GET_Navigation({ type = null }) {
      if (!type) return;

      try {
        this.loading = true;
        const { data: response } = await _METHOD_content({
          url: "/routes/",
          method: "get",
          type,
        });
        const data = response?.results ?? response?.data ?? null;

        if (!data) return;
        this.routes = data.map(
          ({ url = null, label = null, placement = null, draft = null }) => {
            const model = {
              label,
              value: {
                url,
                draft,
                label,
              },
              label_ext: this.$t("common.delete"),
              label_ext_class: "t-negative-200",
              label_ext_2: this.$t("common.edit"),
              label_ext_2_class: "t-support-400",
            };

            return model;
          }
        );

        this.sortRoutes();
      } catch (error) {
        console.log("GET  NAV ERROR", error);
        this.notify.spawnNotification({
          title: this.$t("notifications.error"),
          type: "negative",
          timeout: "2500",
        });
      } finally {
        this.loading = false;
      }
    },
    async DELETE_Route({ url = null }) {
      if (!url) return;
      try {
        this.loading = true;
        const { data: response, meta } = await _METHOD_content({
          url: `/routes/${url.replace(/^\//, '')}`,
          method: "delete",
        });
        this.notify.spawnNotification({
          title: this.$t("notifications.deleted"),
          type: "informative",
          timeout: "2500",
        });
        this.routes = this.routes.filter(({ value }) => {
          const { url: _url = null } = value;
          return _url !== url;
        });
      } catch (error) {
        console.log("DELETE  NAV ERROR", error);
        this.notify.spawnNotification({
          title: this.$t("notifications.error"),
          type: "negative",
          timeout: "2500",
        });
      } finally {
        this.loading = false;
      }
    },
    ENTER_edit_mode({ url = null, label = null }) {
      this.mode = "edit";
      this.editing_route = url;
      this.route_label = label || "";
      this.route_url = url || "";
      this.error = null;
    },
    CLOSE_form() {
      this.mode = null;
      this.editing_route = null;
      this.route_label = "";
      this.route_url = "";
      this.error = null;
    },
    async SET_route({ label = null, url = null }) {
      if (!label || !url) {
        this.notify.spawnNotification({
          title: this.$t("categories.empty_fields"),
          type: "negative",
          timeout: "2500",
        });
        return;
      }

      const isEdit = this.mode === "edit";

      try {
        this.loading = true;
        const { data: response, meta } = await _METHOD_content({
          url: isEdit ? `/routes/${this.editing_route.replace(/^\//, '')}/` : `/routes/`,
          method: isEdit ? "put" : "post",
          payload: {
            label,
            url,
          },
        });
        this.notify.spawnNotification({
          title: this.$t("notifications.success"),
          type: "informative",
          timeout: "2500",
        });

        if (isEdit) {
          this.routes = this.routes.map((route) => {
            if (route.value.url === this.editing_route) {
              return {
                label,
                value: { url, draft: route.value.draft, label },
                label_ext: this.$t("common.delete"),
                label_ext_class: "t-negative-200",
                label_ext_2: this.$t("common.edit"),
                label_ext_2_class: "t-support-400",
              };
            }
            return route;
          });

          if (this.selected && Array.isArray(this.selected)) {
            this.selected = this.selected.map((s) => {
              if (s.value?.url === this.editing_route) {
                return {
                  label,
                  value: { url, draft: s.value.draft, label },
                  label_ext: `(${this.$t("routes.in_use")})`,
                  label_ext_class: "t-positive-200",
                };
              }
              return s;
            });
          }
        } else {
          this.routes = [
            {
              label,
              value: { url, draft: null, label },
              label_ext: this.$t("common.delete"),
              label_ext_class: "t-negative-200",
              label_ext_2: this.$t("common.edit"),
              label_ext_2_class: "t-support-400",
            },
            ...this.routes,
          ];
        }

        this.CLOSE_form();
        this.force_refresh += this.force_refresh;
      } catch (error) {
        console.log("SET ROUTE ERROR", error);
        this.notify.spawnNotification({
          title: this.$t("notifications.error"),
          type: "negative",
          timeout: "2500",
        });
      } finally {
        this.loading = false;
      }
    },
    // TO REMOVE ---------------
    // TO REMOVE ---------------
    // TO REMOVE ---------------
    // TO REMOVE ---------------
    pass_asset(routes) {
      let route = routes.map(({ label = null, value = null }) => {
        if (!value) return;
        const { url = null } = value;
        return url;
      });

      this.pass_Asset(route);
      this.notify.spawnNotification({
        title: this.$t("notifications.success"),
        msg: this.$t("notifications.success_fun"),
        type: "informative",
      });
      this.open_Handykit({});
    },
  },
  created() {
    this.init();
    this.GET_Navigation({ type: this.type });
    // const { type = "static-page" } = this.$route.query;
    // this.routes =
    //   this.defaults && this.defaults.routes ? this.defaults.routes : [];
    // this.getStaticsRoutes({ type });
    // this.type = type;
  },
};
</script>
