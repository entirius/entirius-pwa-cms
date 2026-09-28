<template>
  <div class="action-bar flex ai-ct" role="group" :aria-label="$t('common.actions')">
    <span class="action-bar__label fs-200 t-muted" aria-hidden="true">{{ $t("common.actions") }}</span>
    <div class="action-bar__actions flex ai-ct wrap">
      <template v-for="action in ordered" :key="action.key">
        <IconButton
          v-if="action.role === 'utility'"
          :icon="action.icon"
          :label="action.label"
          variant="outline"
          :disabled="action.disabled"
          :data-testid="action.testid"
          @click="action.onClick"
        />
        <BasicButton
          v-else
          :variant="action.role"
          :icon="action.icon"
          :disabled="action.disabled"
          :loading="action.loading"
          :data-testid="action.testid"
          @click="action.onClick"
        >
          {{ action.label }}
        </BasicButton>
      </template>
      <slot />
    </div>
  </div>
</template>

<script>
// R5 order, left to right; module scope so defineProps can read it. A non-utility role is its BasicButton variant.
const ROLES = ["utility", "secondary", "danger", "primary"];
</script>

<script setup>
// Page and dialog actions in R5 order (docs/ui-rules.md): icon utilities · secondary · danger · primary, right-aligned,
// the one primary rightmost. `actions` = [{ key, label, role, onClick, icon?, disabled?, loading?, testid? }]; a
// caller with its own controls passes them in the default slot, already in R5 order. Below the shell breakpoint the
// bar takes its own row with the visible label "Akcje" (Figma S7).
import { computed, watchEffect } from "vue";
import IconButton from "@/boots/IconButton/index.vue";

const props = defineProps({
  actions: {
    type: Array,
    default: () => [],
    // A utility is an IconButton: it needs its icon.
    validator: (value) =>
      value.every(
        (action) =>
          action.key && action.label && ROLES.includes(action.role) && (action.role !== "utility" || action.icon)
      ),
  },
});

const ordered = computed(() =>
  [...props.actions].sort((a, b) => ROLES.indexOf(a.role) - ROLES.indexOf(b.role))
);

watchEffect(() => {
  const primaries = props.actions.filter((action) => action.role === "primary").length;
  if (process.env.NODE_ENV !== "production" && primaries > 1) {
    console.warn(`ActionBar: ${primaries} primary actions, one at most (docs/ui-rules.md R5).`);
  }
});
</script>

<style lang="scss" scoped>
@import "@/assets/scss/utils/media-query";

.action-bar {
  justify-content: flex-end;
}

.action-bar__actions {
  justify-content: flex-end;
  gap: var(--space-3);
}

.action-bar__label {
  display: none;
}

// Figma S7: the label on its own line, 12 px above one left-aligned row of actions 8 px apart.
@include max-tablet {
  .action-bar {
    flex-basis: 100%;
    flex-direction: column;
    align-items: flex-start;
    width: 100%;
    gap: var(--space-3);
  }

  .action-bar__label {
    display: inline;
  }

  .action-bar__actions {
    justify-content: flex-start;
    gap: var(--space-2);
  }
}
</style>
