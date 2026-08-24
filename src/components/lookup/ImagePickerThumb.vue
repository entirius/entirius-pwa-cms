<template>
  <div class="image-picker-thumb">
    <button
      type="button"
      class="image-picker-thumb__button"
      data-testid="dedup-search-dropzone"
      @click="$refs.fileInput.click()"
      @dragover.prevent
      @drop.prevent="onDrop"
    >
      <img v-if="previewUrl" :src="previewUrl" :alt="altText" />
      <FontAwesomeIcon v-else icon="upload" />
      <span
        v-if="previewUrl"
        class="image-picker-thumb__remove"
        data-testid="dedup-search-remove-image"
        @click.stop="$emit('remove')"
      >
        <FontAwesomeIcon icon="xmark" />
      </span>
    </button>
    <input
      ref="fileInput"
      type="file"
      accept="image/*"
      class="image-picker-thumb__file-input"
      data-testid="dedup-search-file-input"
      @change="onChange"
    />
  </div>
</template>

<script>
export default {
  name: "ImagePickerThumb",
  props: {
    previewUrl: { type: String, default: "" },
    altText: { type: String, default: "" },
  },
  emits: ["pick", "remove"],
  methods: {
    onChange(event) {
      const file = event.target.files?.[0];
      if (file) this.$emit("pick", file);
      event.target.value = "";
    },
    onDrop(event) {
      const file = event.dataTransfer?.files?.[0];
      if (file) this.$emit("pick", file);
    },
  },
};
</script>

<style lang="scss" scoped>
.image-picker-thumb {
  position: relative;
  flex-shrink: 0;

  &__button {
    width: 42px;
    height: 42px;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 1px dashed var(--c-basic-400);
    border-radius: var(--radius-sm);
    background: var(--c-basic-100);
    color: var(--c-basic-500);
    cursor: pointer;
    overflow: hidden;

    img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
  }
  &__remove {
    position: absolute;
    top: -6px;
    right: -6px;
    width: 18px;
    height: 18px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    background: var(--c-negative-300);
    color: var(--c-basic-100);
    font-size: 10px;
  }
  &__file-input {
    display: none;
  }
}
</style>
