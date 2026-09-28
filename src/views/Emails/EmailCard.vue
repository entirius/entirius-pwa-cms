<template>
  <BasicCard class="email-card">
    <component :is="`h${level}`" class="email-card__title flex ai-ct gap-3 fs-400 fw-600">
      <slot name="icon" />
      <router-link :to="to" class="email-card__link" :data-testid="testid">{{ title }}</router-link>
    </component>
    <slot />
  </BasicCard>
</template>

<script setup>
// An Emails dashboard tile (channel, template type, template, language config): a BasicCard whose title is the
// link to the record. The link's `::after` covers the card, so the whole card opens it by pointer, and the link is
// the one tab stop (Enter opens it). The default slot takes the muted lines under the title; `icon` sits before it.
// `level` is the title's heading level (3 under a section h2, 2 right under the page h1). `.email-cards` lays the
// tiles out in the views.
defineProps({
  to: { type: [String, Object], required: true },
  title: { type: String, required: true },
  testid: { type: String, default: undefined },
  level: { type: Number, default: 3 },
});
</script>

<style lang="scss" scoped>
.email-card {
  position: relative;
}

.email-card__title {
  margin: 0;
  min-width: 0;
  color: var(--text-strong);
}

.email-card__link {
  min-width: 0;
  color: inherit;
  text-decoration: none;
  overflow-wrap: anywhere;

  &::after {
    content: "";
    position: absolute;
    inset: 0;
    border-radius: var(--radius-3xl);
  }

  &:hover {
    color: var(--accent);
  }

  &:focus-visible {
    outline: none;

    &::after {
      outline: 2px solid var(--accent);
      outline-offset: 2px;
    }
  }
}
</style>

<style lang="scss">
.email-cards {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: var(--space-4);
}
</style>
