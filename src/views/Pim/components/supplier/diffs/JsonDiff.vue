<template>
  <div class="json-diff">
    <div class="json-diff__col">
      <div class="json-diff__label t-basic-500">{{ $t("pim.supplier.diff.before") }}</div>
      <pre class="json-diff__value json-diff__value--before">{{ format(before) }}</pre>
    </div>
    <div class="json-diff__col">
      <div class="json-diff__label t-basic-500">{{ $t("pim.supplier.diff.after") }}</div>
      <pre class="json-diff__value json-diff__value--after">{{ format(after) }}</pre>
    </div>
  </div>
</template>

<script>
export default {
  name: "JsonDiff",
  props: {
    before: { default: null },
    after: { default: null },
  },
  methods: {
    format(v) {
      if (v == null) return "—";
      try {
        return JSON.stringify(v, null, 2);
      } catch {
        return String(v);
      }
    },
  },
};
</script>

<style lang="scss" scoped>
.json-diff {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-200);
}
.json-diff__label {
  font-size: var(--fs-100);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: var(--space-100);
}
.json-diff__value {
  padding: var(--space-200);
  border-radius: var(--radius-sm);
  background: var(--c-basic-200);
  font-family: var(--font-mono, monospace);
  font-size: var(--fs-100);
  white-space: pre-wrap;
  word-break: break-word;
  max-height: 240px;
  overflow-y: auto;
  margin: 0;
}
.json-diff__value--before {
  border-left: 2px solid var(--c-negative-300);
}
.json-diff__value--after {
  border-left: 2px solid var(--c-positive-300);
}

@media (max-width: 640px) {
  .json-diff {
    grid-template-columns: 1fr;
  }
}
</style>
