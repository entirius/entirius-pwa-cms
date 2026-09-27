<template>
  <figure class="media-tile flex-column" :class="{ 'media-tile--selected': selected }">
    <div class="media-tile__image flex jc-ct ai-ct">
      <img v-if="src" :src="src" :alt="alt" loading="lazy" />
      <FontAwesomeIcon v-else :icon="$icons.image" class="media-tile__placeholder" aria-hidden="true" />
    </div>
    <figcaption v-if="caption || $slots.actions" class="media-tile__footer flex ai-ct jc-sb gap-2">
      <span class="media-tile__caption">{{ caption }}</span>
      <span v-if="$slots.actions" class="flex gap-1">
        <slot name="actions" />
      </span>
    </figcaption>
  </figure>
</template>

<script setup>
// An image tile of a media grid (Figma S9/S10: 188 × 276 desktop, 150 × 240 below tablet). No `src` = the image
// placeholder. `selected` draws the accent border. The `actions` slot takes IconButtons (`sm`).
defineProps({
  src: { type: String, default: "" },
  alt: { type: String, default: "" },
  caption: { type: String, default: "" },
  selected: { type: Boolean, default: false },
});
</script>

<style lang="scss">
@import "@/assets/scss/utils/media-query";

.media-tile {
  box-sizing: border-box;
  width: 188px;
  height: 276px;
  margin: 0;
  gap: var(--space-2);
  padding: var(--space-2);
  border: 2px solid transparent;
  border-radius: var(--radius-base);
  background: var(--surface-raised);

  @include max-tablet {
    width: 150px;
    height: 240px;
  }

  &__image {
    flex: 1;
    min-height: 0;
    overflow: hidden;
    border-radius: var(--radius-base);
    background: var(--surface-sunken);

    img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
  }

  &__placeholder {
    font-size: var(--fs-700);
    color: var(--text-muted);
  }

  &__caption {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: var(--fs-200);
    color: var(--text-secondary);
  }
}

.media-tile--selected {
  border-color: var(--accent);
}
</style>
