<template>
  <div class="flex-column gap-300 jc-sb relative h-100">
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
    <div class="fg-1 pl-400 pr-400 ovy-auto pb-400">
      <p class="fs-200 mv-300 t-basic-600 fw-600">
        {{ $t("order.drag_to_reorder") }}
      </p>
      <draggable
        v-model="order"
        v-if="order && order.length"
        ghost-class="bg-support-400"
        handle=".handle-button"
        :item-key="(el) => el"
        class="grid grid-col-1 gap-100"
      >
        <template #item="{ element: uid }">
          <div
            class="handle-button br-50 b-basic-400 bg-basic-100 fs-200 t-basic-600 p-100 pointer"
          >
            <p class="fs-200 fw-600 t-basic-700">
              {{
                inserts[uid]?.core_type
                  ? formatCoreType(inserts[uid].core_type)
                  : ""
              }}
            </p>
            <p v-if="inserts[uid]?.title" class="fs-100 t-basic-600 mt-50 lc-1">
              {{ inserts[uid].title }}
            </p>
            <p
              v-else-if="inserts[uid]?.sku || inserts[uid]?.product_sku"
              class="fs-100 t-support-400 mt-50"
            >
              SKU: {{ inserts[uid]?.sku || inserts[uid]?.product_sku }}
            </p>
            <p class="fs-100 t-basic-400 mt-50">{{ uid.substring(0, 8) }}</p>
          </div>
        </template>
      </draggable>
    </div>

    <div
      class="grid grid-col-3 rtl-direction bg-basic-200 pl-400 pr-400 pt-100 pb-100 w-100"
      style="bottom: 0"
    >
      <BasicButton
        class="bg-basic-700 br-50 bg-support-400 b-support-400 fs-200 b-basic-800 t-basic-100 w-100 jc-ct"
        :text="$t('common.save')"
        @click="pass_asset"
      />
    </div>
  </div>
</template>

<script>
import { useNotifyStore } from "@/stores/notify";
import { useHandyStore } from "@/stores/handy";
import draggable from "vuedraggable";
export default {
  setup() {
    const notify = useNotifyStore();
    const handy = useHandyStore();
    return { notify, handy };
  },
  data() {
    return {
      inserts: null,
      order: null,
    };
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
  methods: {
    open_Handykit(params) {
      this.handy.open_Handykit(params);
    },
    pass_Asset(asset) {
      this.handy.pass_Asset(asset);
    },
    formatCoreType(coreType) {
      return coreType
        .replace(/^(section|tile)-/, "")
        .split("-")
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" ");
    },
    init() {
      if (!Object.keys(this.defaults).length) return;
      const { order, inserts } = this.defaults;
      this.order = order;
      this.inserts = inserts;
    },
    pass_asset(section) {
      this.pass_Asset(this.order);
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
  },
  components: {
    draggable,
  },
};
</script>
