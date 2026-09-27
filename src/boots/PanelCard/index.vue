<template>
  <component
    :is="locked ? 'div' : 'button'"
    :type="locked ? null : 'button'"
    class="panel-card flex-column"
    :class="{ 'panel-card--locked': locked }"
    :aria-disabled="locked ? 'true' : null"
    data-fid="panel-card"
    @click="!locked && $emit('click')"
  >
    <span class="panel-card__icon inline-flex jc-ct ai-ct">
      <FontAwesomeIcon :icon="icon" aria-hidden="true" />
    </span>
    <span class="panel-card__title type-title">{{ title }}</span>
    <span v-if="locked" class="panel-card__text inline-flex ai-ct gap-1">
      <FontAwesomeIcon :icon="$icons.lock" aria-hidden="true" />
      {{ lockedText }}
    </span>
    <span v-else-if="description" class="panel-card__text">{{ description }}</span>
  </component>
</template>

<script setup>
// A Home panel tile (Figma S1/S2): the named `card` gradient, `--radius-3xl`, 20 px padding and gap; icon, title
// (Lexend Deca), description. `locked` (panel off for this user) = opacity .5, a lock and `lockedText` in place of
// the description, not focusable, no click. `icon` is the panel's glyph from the nav model (configs/access.js),
// not a meaning. Root class `panel-card` and `data-fid="panel-card"` are the e2e and landmarks hooks.
defineProps({
  icon: { type: String, required: true },
  title: { type: String, required: true },
  description: { type: String, default: "" },
  locked: { type: Boolean, default: false },
  lockedText: { type: String, default: "" },
});
defineEmits(["click"]);
</script>

<style lang="scss">
.panel-card {
  box-sizing: border-box;
  width: 100%;
  gap: var(--space-5);
  padding: var(--space-5);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-3xl);
  background: var(--surface-card);
  color: inherit;
  font: inherit;
  text-align: left;
  cursor: pointer;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;

  &:hover:not(.panel-card--locked) {
    border-color: var(--border-default);
    box-shadow: var(--shadow-sm);
  }

  &__icon {
    width: var(--space-10);
    height: var(--space-10);
    border-radius: var(--radius-xl);
    background: var(--surface-raised);
    color: var(--text-accent);
    font-size: var(--fs-500);
  }

  &__title {
    color: var(--text-strong);
  }

  &__text {
    font-size: var(--fs-250);
    line-height: 1.4;
    color: var(--text-muted);
  }
}

.panel-card--locked {
  opacity: 0.5;
  cursor: default;
}
</style>
