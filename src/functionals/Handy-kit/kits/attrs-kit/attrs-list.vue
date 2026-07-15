<template>
  <div>
    <p class="fs-sm txt-gray-500">
      {{ $t("attrs.available_values") }}
    </p>
    <hr class="mv-lg" />
    <DropDown
      :value="attrs"
      @onSelect="bindAttr"
      :errorValue="errorValue"
      :functionals="{ delete: true }"
      @onDelete="deleteAttr"
      :placeholder="$t('attrs.available_values')"
      class="minw-30"
    />
    <hr class="mv-lg" />
    <p class="fs-sm txt-gray-500">
      {{ $t("attrs.linked_values") }}
      <span class="txt-gray-700 bold">{{ attrName }}</span>
    </p>
    <hr class="mv-lg" />

    <DropDown
      :value="
        attrData.map((val) => {
          return { label: val, v: val };
        })
      "
      :placeholder="`${$t('attrs.linked_values')} (${attrData.length})`"
      :functionals="{ delete: true }"
      @onDelete="unbindAttr"
      class="minw-30"
    />
    <ButtonBasic
      :text="$t('attrs.save_changes')"
      class="bg-primary-100 txt-gray-700 w-full sticky-btn mt-md"
      @click="save"
    />
  </div>
</template>

<script>
import { useNotifyStore } from "@/stores/notify";
import { useHandyStore } from "@/stores/handy";
import { GET_AttrsValues, DELETE_AttrValue } from "@/api/contentDB/api";

export default {
  setup() {
    const notify = useNotifyStore();
    const handy = useHandyStore();
    return { notify, handy };
  },
  data() {
    return {
      attrs: null,
      attrName: null,
      attrData: null,
      errorValue: false,
    };
  },
  computed: {
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
    async getAttr({ slug = null }) {
      const { data } = await GET_AttrsValues({ slug });
      const { data: attrData, meta } = data;

      this.attrs = attrData.map((val) => {
        return { label: val.value, v: val };
      });
    },
    async deleteAttr({ id = null, value = null }) {
      const { data, status } = await DELETE_AttrValue({
        slug: this.attrName,
        id,
      });
      if (status === 204) {
        this.notify.spawnNotification({
          title: this.$t("notifications.deleted"),
          type: "negative",
          timeout: 2500,
        });
        this.attrs = this.attrs.filter((cat) => cat.label !== value);
      }
    },
    bindAttr({ id = null, value = null }) {
      if (this.attrData.indexOf(value) > -1) {
        this.notify.spawnNotification({
          msg: this.$t("notifications.error"),
          type: "negative",
        });
        this.errorValue = true;
        return;
      }

      this.attrData.unshift(value);
      this.errorValue = false;
    },
    unbindAttr(val) {
      this.attrData = this.attrData.filter((attr) => attr != val);
    },
    save() {
      this.pass_Asset(this.attrData);
      this.open_Handykit({ typeId: false });
    },
  },
  created() {
    const { attrName, attrData } = this.defaults;
    this.getAttr({ slug: attrName });
    this.attrName = attrName;
    this.attrData = attrData ? attrData : [];
  },
};
</script>
