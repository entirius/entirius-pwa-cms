<script setup>
defineProps({
  text: { type: String, required: true },
})
</script>

<template>
  <span class="help-tooltip" tabindex="0">
    <span class="help-tooltip__icon">?</span>
    <span class="help-tooltip__bubble">{{ text }}</span>
  </span>
</template>

<style lang="scss">
@import "@/assets/scss/utils/media-query";

.help-tooltip {
  position: relative;
  display: inline;
  cursor: help;
  margin-left: var(--space-1);

  &__icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 14px;
    height: 14px;
    border-radius: var(--radius-full);
    background: var(--surface-hover);
    color: var(--text-secondary);
    font-size: 9px;
    font-weight: 600;
    line-height: 1;
    user-select: none;
    vertical-align: text-bottom;
    position: relative;
    top: -1px;

    // A phone gets the 24 px minimum hit area around the 14 px glyph (the glyph does not grow). Larger would cover the
    // input 4 px below the label and the Switcher beside it, and take their taps.
    @include max-tablet {
      &::after {
        content: "";
        position: absolute;
        top: 50%;
        left: 50%;
        width: var(--space-6);
        height: var(--space-6);
        transform: translate(-50%, -50%);
      }
    }
  }

  &__bubble {
    display: none;
    position: absolute;
    bottom: calc(100% + 6px);
    left: 50%;
    transform: translateX(-50%);
    padding: var(--space-2) var(--space-3);
    background: var(--surface-inverse);
    color: var(--text-inverse);
    font-size: var(--fs-200);
    font-weight: 400;
    text-transform: none;
    letter-spacing: normal;
    line-height: 1.4;
    border-radius: var(--radius-base);
    white-space: normal;
    width: max-content;
    max-width: 260px;
    z-index: 10;
    box-shadow: var(--shadow-md);

    &::after {
      content: "";
      position: absolute;
      top: 100%;
      left: 50%;
      transform: translateX(-50%);
      border: 5px solid transparent;
      border-top-color: var(--border-strong);
    }
  }

  &:hover &__bubble,
  &:focus &__bubble,
  &:focus-within &__bubble {
    display: block;
  }
}
</style>
