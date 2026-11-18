<template>
  <div class="mail-preview flex-column gap-2">
    <p class="mail-preview__title m-0">{{ title }}</p>
    <!-- unsaved HTML is not sanitised yet: the preview runs in an empty sandbox (no scripts, no same origin) -->
    <iframe class="mail-preview__frame" sandbox="" :srcdoc="doc" :title="title" :data-testid="testid"></iframe>
  </div>
</template>

<script setup>
import { computed } from "vue";

// A piece of mail HTML (the footer, a mailbox signature) as the recipient sees it. The mail is read on a white canvas
// whatever the CMS theme, so the white belongs to the previewed document.
const props = defineProps({
  title: { type: String, required: true },
  html: { type: String, default: "" },
  testid: { type: String, default: "mail-preview" },
});
const doc = computed(() => `<!doctype html><html><body style="font-family:sans-serif;margin:8px;background:#fff">${props.html}</body></html>`);
</script>

<style scoped>
.mail-preview__title {
  font-weight: 600;
}
.mail-preview__frame {
  width: 100%;
  min-height: 220px;
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-lg);
  background: var(--surface-base);
}
</style>
