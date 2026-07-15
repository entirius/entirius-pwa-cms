<template>
  <div>
    <p class="fs-sm txt-gray-500">
      Lorem ipsum dolor, sit amet consectetur adipisicing elit. Fuga, alias.
    </p>
    <hr class="mv-lg" />
    <BasicInput
      :size="'sm'"
      :label="`new value for ${attrName}`"
      class="size-sm"
      v-model="attrVal"
    />

    <ButtonBasic
      :text="$t('common.add')"
      class="bg-primary-100 txt-gray-700 w-full sticky-btn mt-md"
      @click="addAttrVal"
    />
  </div>
</template>

<script>
import { useNotifyStore } from "@/stores/notify";
import { useHandyStore } from "@/stores/handy";
import { POST_AttrValue } from "@/api/contentDB/api";
export default {
  setup() {
    const notify = useNotifyStore();
    const handy = useHandyStore();
    return { notify, handy };
  },
  data() {
    return { attrVal: "", attrName: null };
  },
  computed: {
    defaults() {
      return this.handy.defaults;
    },
  },
  methods: {
    async addAttrVal() {
      try {
        if (!this.attrVal.length) {
          const err = new Error();
          err.response = this.$t("categories.empty_fields");
          throw err;
        }

        const { data } = await POST_AttrValue({
          slug: this.attrName,
          value: this.attrVal,
        });
        const { data: newAttrData, meta } = data;
        const { status } = meta;

        if (status.toLowerCase() === "created") {
          this.attrVal = "";

          this.notify.spawnNotification({
            title: this.$t("notifications.success"),
            type: "positive",
            timeout: "2500",
          });
        }
      } catch ({ response }) {
        this.notify.spawnNotification({
          title: response,
          type: "negative",
          timeout: "2500",
        });
      }
    },
  },
  created() {
    const { attrName = null } = this.defaults;
    this.attrName = attrName;
  },
};
</script>
