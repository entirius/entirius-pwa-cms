<template>
  <div class="fs-200 t-secondary flex-column gap-300 jc-sb">
    <nav
      class="grid grid-col-2 grid-col-2-m ai-ct bg-raised pl-400 pr-400 pt-200 pb-200 t-secondary br-tl-50 br-tr-50"
    >
      <p class="fw-600 fs-400 uppercase">
        {{ handyType.label ? handyType.label : $t("common.click") }}
      </p>
      <p
        class="js-fe t-secondary"
        @click="handy.open_Handykit({ typeId: false })"
      >
        <i class="icon-close-mini pointer" />
      </p>
    </nav>
    <div class="fg-1 pl-400 pr-400 ovy-auto pt-200 pb-400">
      <template v-if="attrs_list">
        <div class="grid grid-col-3 gap-100 mb-100">
          <Dropdown
            :placeholder="'Attr'"
            :selected="[attr_to_edit]"
            :values="
              attrs_list.map(({ label = null, slug }) => {
                return { label, value: slug };
              })
            "
            @onSelect="
              ($event) => {
                attr_to_edit = $event;
                if (attr_values && attr_values[attr_to_edit]) {
                  return;
                }

                GET_ATTR_VALUES();
              }
            "
            class="bg-base b-default br-50 shadow-down fs-200 t-body gc-s-1 gc-e-3"
          />
          <BasicButton
            :text="$t('attrs.add_value')"
            class="b-default br-50"
            @click="mode = 'add'"
            :isDisabled="!attr_to_edit"
            :class="[
              !attr_to_edit
                ? 'bg-raised t-muted'
                : 'bg-accent-fill t-on-accent-fill b-accent',
            ]"
          />
        </div>
      </template>
      <template v-if="!mode">
        <Dropdown
          :placeholder="
            !attr_to_edit
              ? $t('common.select')
              : !attr_values || !attr_values[attr_to_edit].length
              ? $t('attrs.add_value')
              : `${$t('attrs.available_values')} (${
                  attr_values[attr_to_edit].length
                })`
          "
          :custom_droplist="true"
          :isDisabled="!attr_to_edit"
          class="bg-base b-default br-50 shadow-down fs-200"
          :class="[!attr_to_edit ? 'bg-raised t-muted' : 't-body']"
          :key="`${force_refresh}-key`"
        >
          <template v-slot:custom>
            <div
              v-for="({ label, value }, i) in !attr_to_edit ||
              !attr_values ||
              !attr_values[attr_to_edit]
                ? []
                : attr_values[attr_to_edit].map(
                    ({ id = null, value = null }) => {
                      return {
                        label: value,
                        value: id,
                      };
                    }
                  )"
              class="ph-100 flex jc-sb"
            >
              <span>{{ label }}</span>
              <div>
                <span
                  class="t-accent mr-100"
                  @click="
                    () => {
                      document_attrs[attr_to_edit] = [label];
                      force_refresh += force_refresh;
                    }
                  "
                  >{{ $t("common.select") }}</span
                >
                <span
                  class="t-negative"
                  @click="DELETE_ATTR({ id: value })"
                  >{{ $t("common.delete") }}</span
                >
              </div>
            </div>
          </template>
        </Dropdown>
      </template>
      <template v-if="mode === 'add'">
        <BasicInput
          class="bg-base lh-base-elem mt-300"
          :label="$t('attrs.attribute_value')"
          v-model="attr_value"
        />
        <BasicButton
          class="br-50 mt-100 bb-default"
          :text="$t('common.save')"
          @click="POST_NEW_ATTR"
          :isDisabled="attr_value.length < 5"
          :class="[
            attr_value.length < 5
              ? 'bg-raised t-muted'
              : 't-on-accent-fill bg-accent-fill',
          ]"
        />
      </template>
      <hr class="bb-default mv-300" />
      <Dropdown
        :placeholder="`Setted attrs for document (${
          Object.keys(document_attrs ?? {}).length
        })`"
        :custom_droplist="true"
        :complex_values="true"
        class="bg-base b-default br-50 fs-200 mt-50"
        :class="[
          !Object.keys(document_attrs ?? {}).length
            ? 'bg-raised t-muted'
            : 't-body',
        ]"
        :key="`${force_refresh}-key-2`"
      >
        <template v-slot:custom>
          <div
            class="ph-100 flex jc-sb"
            v-for="({ label, value }, index) in !document_attrs
              ? []
              : Object.entries(document_attrs).reduce(
                  (arr, [attr_key, values], index) => {
                    const model = values.map((v) => {
                      return {
                        label: `${attr_key} - ${v}`,
                        value: { index, attr_to_edit: attr_key },
                      };
                    });
                    arr = [...arr, ...model];
                    return arr;
                  },
                  []
                )"
          >
            <p>{{ label }}</p>
            <div>
              <span
                class="t-negative"
                @click="
                  () => {
                    const { index, attr_to_edit } = value;
                    document_attrs[attr_to_edit].splice(index, 1);
                    if (!document_attrs[attr_to_edit].length)
                      delete document_attrs[attr_to_edit];
                    force_refresh += force_refresh;
                  }
                "
                >{{ $t("common.delete") }}</span
              >
            </div>
          </div>
        </template>
      </Dropdown>
    </div>

    <div
      class="grid grid-col-3 gap-100 rtl-direction bg-raised pl-400 pr-400 pt-100 pb-100"
    >
      <BasicButton
        class="bg-inverse br-50 bg-accent-fill-hover b-accent-fill-hover fs-200 b-strong t-inverse t-on-accent-fill-hover w-100 jc-ct"
        :text="$t('common.save')"
        @click="pass_asset({ ...document_attrs })"
      />
      <BasicButton
        class="bg-negative-subtle br-50 fs-200 b-negative t-negative w-100 jc-ct"
        :text="$t('common.cancel')"
        @click="handy.open_Handykit({})"
      />
    </div>
  </div>
</template>

<script>
import { useNotifyStore } from "@/stores/notify";
import { useHandyStore } from "@/stores/handy";
import { _METHOD_content } from "@/api/contentDB/api";
export default {
  setup() {
    const notify = useNotifyStore();
    const handy = useHandyStore();
    return { notify, handy };
  },
  data() {
    return {
      attrs_list: null,
      attr_to_edit: null,
      attr_values: null,
      mode: null,
      attr_value: "",
      //
      force_refresh: 1,
      //
      document_attrs: null,
    };
  },
  methods: {
    async init() {
      const { attributes = {} } = this.defaults;
      this.document_attrs = attributes;
      //if (!Object.keys(attributes).length) this.mode = "add";
      const { result } = await this.Modify_content({
        method: "get",
        url: `/attributes/`,
      });

      if (!result) {
        this.notify.spawnNotification({
          title: this.$t("notifications.error"),
          msg: this.$t("notifications.save_error"),
          type: "negative",
        });
        return;
      }
      const { data = [], pagination = null } = result;
      this.attrs_list = data;
    },
    async Modify_content({
      method = "post",
      url = null,
      param = null,
      payload = null,
      ...options
    }) {
      try {
        const { data: response } = await _METHOD_content({
          method,
          url,
          param,
          payload,
          ...options,
        });

        return { result: response };
      } catch (error) {
        console.log("Error!", error);
        this.notify.spawnNotification({
          title: this.$t("notifications.error"),
          msg: this.$t("notifications.save_error"),
          type: "negative",
        });

        return { result: null };
      }
    },
    async GET_ATTR_VALUES() {
      if (!this.attr_to_edit) {
        this.notify.spawnNotification({
          title: this.$t("notifications.error"),
          msg: this.$t("notifications.save_error"),
          type: "negative",
        });
        return;
      }

      const { result } = await this.Modify_content({
        method: "get",
        url: `/attributes/${this.attr_to_edit}/values/`,
      });
      if (!result) return;

      if (!this.attr_values) this.attr_values = {};

      const { data } = result;
      this.attr_values[this.attr_to_edit] = data ?? [];
    },
    async POST_NEW_ATTR() {
      const { result } = await this.Modify_content({
        method: "post",
        url: `/attributes/${this.attr_to_edit}/values/`,
        payload: { value: this.attr_value },
      });
      if (!result) return;

      const { data } = result;
      this.attr_values[this.attr_to_edit].push(data);
      this.mode = null;
    },
    async DELETE_ATTR({ id = null }) {
      const { result } = await this.Modify_content({
        method: "delete",
        url: `/attributes/${this.attr_to_edit}/values/${id}`,
      });
      // if (!result) return;
      this.attr_values[this.attr_to_edit] = this.attr_values[
        this.attr_to_edit
      ].filter(({ id: _id = null }) => {
        return _id !== id;
      });

      this.force_refresh += this.force_refresh;
      this.mode = null;
    },
    pass_asset(pass_me) {
      this.handy.pass_Asset(pass_me);
      this.notify.spawnNotification({
        title: this.$t("notifications.success"),
        msg: this.$t("notifications.success_fun"),
        type: "informative",
      });
      this.handy.open_Handykit({});
    },
  },
  created() {
    this.init();
  },
  computed: {
    handyType() {
      return this.handy.handyType;
    },
    defaults() {
      return this.handy.defaults;
    },
    options() {
      return this.handy.options;
    },
  },
};
</script>
