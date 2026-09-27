<template>
  <span class="tag inline-flex ai-ct gap-1" :class="{ 'tag--removable': removable }" :title="label">
    <span class="tag__label">{{ label }}</span>
    <IconButton
      v-if="removable"
      icon="close"
      size="sm"
      :label="`${$t('common.delete')}: ${label}`"
      @click="$emit('remove')"
    />
  </span>
</template>

<script setup>
// A value chip (a picked entity, a media tag), never a state (StatusBadge) or a number (CountBadge). `removable`
// adds a close IconButton named "Usuń: <label>" that emits `remove`.
import IconButton from "@/boots/IconButton/index.vue";

defineProps({
  label: { type: String, required: true },
  removable: { type: Boolean, default: false },
});
defineEmits(["remove"]);
</script>

<style lang="scss">
.tag {
  box-sizing: border-box;
  max-width: 100%;
  min-width: 0;
  height: var(--space-6);
  padding: 0 var(--space-2);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-base);
  background: var(--surface-raised);
  color: var(--text-body);
  font-size: var(--fs-200);
  font-weight: 500;
  white-space: nowrap;

  &__label {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
  }
}

// The close button sits flush with the right edge.
.tag--removable {
  padding-right: 0;
}
</style>
