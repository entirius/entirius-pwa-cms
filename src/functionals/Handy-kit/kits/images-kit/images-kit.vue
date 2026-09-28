<template>
  <div class="images-kit">
    <BasicTabs
      class="mb-sm"
      id-prefix="images-kit"
      :options="tabs"
      :model-value="fold"
      @update:model-value="open"
    />
    <div :id="`images-kit-panel-${fold}`" role="tabpanel" :aria-labelledby="`images-kit-tab-${fold}`">
      <component :is="fold" />
    </div>
  </div>
</template>

<script>
import ImagesLibrary from "./images-library.vue";
import AddNewImage from "./add-new-image.vue";
import AddNewCategory from "./add-new-category.vue";
import { useHandyStore } from "@/stores/handy";

export default {
  setup() {
    const handy = useHandyStore();
    return { handy };
  },
  data() {
    return {
      fold: "ImagesLibrary",
      imagesTags: null,
    };
  },
  created() {
    if (this.handyFold) {
      this.fold = this.handyFold;
    }
  },
  methods: {
    open(tab) {
      if (this.preventOtherTabs) {
        return;
      }

      this.fold = tab;
    },
  },
  computed: {
    tabs() {
      return [
        { value: "ImagesLibrary", label: this.$t("images.library") },
        { value: "AddNewImage", label: this.$t("images.new_photo") },
        { value: "AddNewCategory", label: this.$t("images.add_new_category") },
      ];
    },
    handyFold() {
      return this.handy.handyFold;
    },
    preventOtherTabs() {
      return this.handy.preventOtherTabs;
    },
  },
  components: { ImagesLibrary, AddNewImage, AddNewCategory },
};
</script>
