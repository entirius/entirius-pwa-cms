<template>
  <div class="routes-kit fs-200 t-basic-600 flex-column gap-300">
    <nav
      class="grid grid-col-2 grid-col-2-m ai-ct bg-basic-200 pl-400 pr-400 pt-200 pb-200 t-basic-600 br-tl-50 br-tr-50"
    >
      <p class="fw-600 fs-400 uppercase">
        {{ handyType.label ? handyType.label : "kliknij" }}
      </p>
      <p
        class="js-fe t-basic-600"
        @click="handy.open_Handykit({ typeId: false })"
      >
        <i class="icon-close-mini pointer" />
      </p>
    </nav>
    <component :is="fold" />
  </div>
</template>

<script>
import RoutesList from "./routes-list.vue";
import RoutesSets from "./routes-sets.vue";
import { useHandyStore } from "@/stores/handy";

export default {
  setup() {
    const handy = useHandyStore();
    return { handy };
  },
  data() {
    return {
      fold: "RoutesList",
    };
  },
  components: {
    RoutesList,
    RoutesSets,
  },
  computed: {
    handyType() {
      return this.handy.handyType;
    },
    handyFold() {
      return this.handy.handyFold;
    },
    preventOtherTabs() {
      return this.handy.preventOtherTabs;
    },
  },
  methods: {
    open(tab) {
      if (this.preventOtherTabs) {
        return;
      }
      this.fold = tab;
    },
  },
  created() {
    if (this.handyFold) {
      this.fold = this.handyFold;
    }
  },
};
</script>

<style lang="scss" scoped></style>
