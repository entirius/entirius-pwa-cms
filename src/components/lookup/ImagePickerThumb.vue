<template>
  <div class="image-picker-thumb">
    <button
      type="button"
      class="image-picker-thumb__button"
      :class="{ 'image-picker-thumb__button--dragover': dragActive }"
      data-testid="dedup-search-dropzone"
      @click="$refs.fileInput.click()"
    >
      <img v-if="previewUrl" :src="previewUrl" :alt="altText" />
      <FontAwesomeIcon v-else icon="upload" />
      <span
        v-if="previewUrl"
        class="image-picker-thumb__remove"
        data-testid="dedup-search-remove-image"
        @click.stop="$emit('remove')"
      >
        <FontAwesomeIcon :icon="$icons.close" />
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
    // Highlight driven by the parent: the whole search box is the drop target
    // (DedupSearchBox owns the dragenter/leave bookkeeping), this thumb only
    // mirrors that state so the eye lands on where the photo will end up.
    dragActive: { type: Boolean, default: false },
  },
  emits: ["pick", "remove"],
  methods: {
    onChange(event) {
      const file = event.target.files?.[0];
      if (file) this.$emit("pick", file);
      event.target.value = "";
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
    border: 1px dashed var(--border-default);
    border-radius: var(--radius-base);
    background: var(--surface-base);
    color: var(--text-muted);
    cursor: pointer;
    overflow: hidden;

    img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    // Same tokens as ProductFiles.vue __dropzone--dragover, so a drag reads the
    // same here as it does on the PIM file and gallery upload areas.
    &--dragover {
      border-color: var(--accent);
      background: var(--surface-raised);
      color: var(--text-accent);
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
    border-radius: var(--radius-full);
    background: var(--negative-fill);
    color: var(--text-on-status-fill);
    font-size: var(--fs-200);
  }
  &__file-input {
    display: none;
  }
}
</style>
