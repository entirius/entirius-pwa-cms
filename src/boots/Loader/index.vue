<template>
  <div
    v-if="overlay"
    class="loader-overlay"
    :class="{ 'loader-overlay--contained': contained }"
    role="status"
  >
    <div class="loader-element relative" :style="sizeStyle" aria-hidden="true">
      <div class="loader-element__circle absolute" />
      <div class="loader-element__circle loader-element__inner-circle absolute" />
    </div>
    <span class="loader-hidden-text">{{ $t("common.loading") }}</span>
  </div>
  <div
    v-else
    class="loader-element relative"
    :class="{ 'loader-element--block': block }"
    role="status"
    :style="sizeStyle"
  >
    <div class="loader-element__circle absolute" />
    <div class="loader-element__circle loader-element__inner-circle absolute" />
    <span class="loader-hidden-text">{{ $t("common.loading") }}</span>
  </div>
</template>

<script>
// One loader (docs/ui-components.md § P3 display): accent rings on a static track, a `role="status"` with a visually
// hidden "Ładowanie". Inline by default; `block` centres it where the data will appear; `overlay` veils the whole
// screen (`overlay-loading`) and replaces components/Loading.vue, `contained` keeps the veil inside the nearest
// positioned ancestor (a kit panel). `size` 32 · 64; `h` / `w` stay until plan 19.
const OVERLAY_SIZE = 64;

export default {
  props: {
    size: { type: Number, default: null, validator: (value) => [32, 64].includes(value) },
    h: { type: Number, default: 64 },
    w: { type: Number, default: 64 },
    block: { type: Boolean, default: false },
    overlay: { type: Boolean, default: false },
    contained: { type: Boolean, default: false },
  },
  computed: {
    sizeStyle() {
      const size = this.size ?? (this.overlay ? OVERLAY_SIZE : null);
      return size ? `height: ${size}px; width: ${size}px` : `height: ${this.h}px; width: ${this.w}px`;
    },
  },
};
</script>

<style lang="scss">
// On a static track, so a loading screen never reads as blank.
.loader-element {
  display: inline-block;
  flex-shrink: 0;
  border: 2px solid var(--border-subtle);
  border-radius: var(--radius-full);

  &--block {
    display: block;
    margin: var(--space-8) auto;
  }

  &__circle {
    border: 2px solid var(--accent);
    height: 100%;
    width: 100%;
    opacity: 1;
    border-radius: var(--radius-full);
    transform-origin: 50% 50%;
    animation: ripple 1s cubic-bezier(0, 0.2, 0.8, 1) infinite;
  }

  &__inner-circle {
    border: 3px solid var(--accent);
    animation-delay: -0.5s;
  }

  @keyframes ripple {
    0% {
      transform: scale(0);
      opacity: 1;
    }
    100% {
      transform: scale(1);
      opacity: 0;
    }
  }
}

.loader-overlay {
  position: fixed;
  inset: 0;
  z-index: 999;
  display: grid;
  place-items: center;
  background: var(--overlay-loading);
}

.loader-overlay--contained {
  position: absolute;
}

// Read by screen readers, never drawn.
.loader-hidden-text {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
}
</style>
