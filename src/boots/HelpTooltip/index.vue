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
.help-tooltip {
  position: relative;
  display: inline;
  cursor: help;
  margin-left: 4px;

  &__icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 14px;
    height: 14px;
    border-radius: 50%;
    background: var(--c-basic-300);
    color: var(--c-basic-600);
    font-size: 9px;
    font-weight: 700;
    line-height: 1;
    user-select: none;
    vertical-align: text-bottom;
    position: relative;
    top: -1px;
  }

  &__bubble {
    display: none;
    position: absolute;
    bottom: calc(100% + 6px);
    left: 50%;
    transform: translateX(-50%);
    padding: 8px 12px;
    background: var(--c-basic-800);
    color: var(--c-basic-100);
    font-size: var(--fs-200);
    font-weight: 400;
    text-transform: none;
    letter-spacing: normal;
    line-height: 1.4;
    border-radius: var(--radius-sm);
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
      border-top-color: var(--c-basic-800);
    }
  }

  &:hover &__bubble,
  &:focus &__bubble,
  &:focus-within &__bubble {
    display: block;
  }
}
</style>
