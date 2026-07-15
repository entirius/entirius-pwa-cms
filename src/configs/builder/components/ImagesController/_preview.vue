<template>
  <div class="image-controller-preview">
    <!-- <p>{{ value }}</p> -->

    <div class="flex gap-50 relative">
      <div class="flex gap-50">
        <div
          v-for="(v, k, i) in value"
          class="relative p-300 br-50 b-basic-500 ov-h pointer shadow-down"
        >
          <img
            :src="resolveImageUrl(v.image)"
            class="block absolute absolute-ct"
            @mouseover="
              () => {
                image_scale = i;
                scale_src = resolveImageUrl(v.image);
              }
            "
            @error="(e) => (e.target.style.display = 'none')"
          />
          <span
            class="fs-100 absolute image-badge ph-50 bg-support-400 t-basic-100 br-50"
          >
            {{ `${k}` }}
          </span>
        </div>
        <div
          v-if="scale_src"
          class="absolute scaled-image-preview br-50 b-basic-500 bg-basic-100 shadow-down"
          @mouseleave="
            () => {
              image_scale = null;
              scale_src = null;
            }
          "
        >
          <img
            :src="scale_src"
            alt=""
            class="block absolute absolute-ct"
            @error="(e) => (e.target.style.display = 'none')"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  props: {
    value: {
      type: Object,
      required: true,
    },
  },
  data() {
    return {
      image_scale: null,
      scale_src: null,
    };
  },
  methods: {
    resolveImageUrl(url) {
      if (!url) return "";
      if (url.startsWith("http")) return url;
      return (process.env.VUE_APP_API_URL || "") + url;
    },
  },
};
</script>

<style>
.image-controller-preview {
  .image-badge {
    bottom: 2px;

    right: 0;
    z-index: 1;
    font-size: 8px;
  }
  .scaled-image-preview {
    left: 0;
    top: 0;
    width: 15rem;
    height: 15rem;
    z-index: 2;
  }
}
</style>
