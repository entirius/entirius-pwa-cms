<template>
  <div class="images-kit">
    <nav class="tab-navigation flex mb-sm">
      <span
        @click="open('ImagesLibrary')"
        class="tab-navigation__elem txt-center pointer"
        :class="[
          { active: fold === 'ImagesLibrary' },
          { opacity: preventOtherTabs && fold !== 'ImagesLibrary' },
        ]"
        >{{ $t("images.library") }}</span
      >
      <span
        @click="open('AddNewImage')"
        class="tab-navigation__elem txt-center pointer"
        :class="[
          { active: fold === 'AddNewImage' },
          { opacity: preventOtherTabs && fold !== 'AddNewImage' },
        ]"
        >{{ $t("images.new_photo") }}</span
      >
      <span
        @click="open('AddNewCategory')"
        class="tab-navigation__elem txt-center pointer"
        :class="[
          { active: fold === 'AddNewCategory' },
          { opacity: preventOtherTabs && fold !== 'AddNewCategory' },
        ]"
        >{{ $t("images.add_new_category") }}</span
      >
    </nav>
    <component :is="fold" />
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
