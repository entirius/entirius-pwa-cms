<template>
  <div class="action-bar flex ai-ct" role="group" :aria-label="$t('common.actions')">
    <div class="action-bar__actions flex ai-ct wrap">
      <template v-for="action in shown" :key="action.key">
        <IconButton
          v-if="action.role === 'utility'"
          :icon="action.icon"
          :label="action.label"
          :variant="action.variant || 'outline'"
          :disabled="action.disabled"
          :data-testid="action.testid"
          @click="action.onClick"
        />
        <BasicButton
          v-else
          :variant="action.role"
          :type="action.form ? 'submit' : 'button'"
          :form="action.form"
          :icon="action.icon"
          :disabled="action.disabled"
          :title="action.title"
          :loading="action.loading"
          :aria-expanded="action.expanded === undefined ? undefined : String(action.expanded)"
          :aria-pressed="action.pressed === undefined ? undefined : String(action.pressed)"
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
// the one primary rightmost. `actions` = [{ key, label, role, onClick?, form?, icon?, variant?, disabled?, loading?,
// expanded?, pressed?, title?, testid? }] (`onClick` or `form`) (`variant` = the IconButton variant of a utility, `outline` by default; `danger` for an icon-only delete;
// `expanded` = aria-expanded of a text button that shows or hides a section; `pressed` = aria-pressed of a text
// button that is a toggle (a list's view switch); `title` = why a disabled button is
// disabled ("Nothing to save"); `form` = the id of a form the button
// submits from outside it — native checks, the form's own submit handler, and Enter in a field presses it); a
// caller with its own controls passes them in the default slot, already in R5 order. On a phone the bar takes its own
// row and its text buttons share that row evenly; buttons that do not fit wrap, and every line fills the width, so the
// primary that wraps alone spans the row. No caption: the group is named for assistive tech only (aria-label). On a
// read-only page (useReadonly, plan 19) only the utilities stay — and of those not a `danger` one; `mutates`
// (true/false) overrides the role. The default slot is the caller's.
import { computed, watchEffect } from "vue";
import IconButton from "@/boots/IconButton/index.vue";
import { useReadonly } from "@/composables/useReadonly";

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

const readonly = useReadonly();
// `mutates` decides when the caller sets it (`false` keeps a Cancel or a section toggle on a read-only page).
const writes = (action) => action.mutates ?? (action.role !== "utility" || action.variant === "danger");

const shown = computed(() =>
  props.actions
    .filter((action) => !(readonly.value && writes(action)))
    .sort((a, b) => ROLES.indexOf(a.role) - ROLES.indexOf(b.role))
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

// A phone: one row of actions 8 px apart, left to right across the full width. Text buttons (the bar's own and a
// caller's slotted ones) grow from zero so they split the row evenly; their min-width keeps the whole label (a button
// clips its overflow, so the automatic minimum would be 0), and a line that cannot hold them wraps. Icon buttons keep
// their square. A disabled button that says why sits in a BasicTooltip: the wrapper takes the button's share instead.
@include max-tablet {
  .action-bar {
    flex-basis: 100%;
    width: 100%;
  }

  .action-bar__actions {
    flex: 1;
    justify-content: flex-start;
    gap: var(--space-2);
  }

  .action-bar__actions > :deep(.button-basic:not(.button-basic--icon)),
  .action-bar__actions > :deep(.basic-tooltip:has(> .button-basic:not(.button-basic--icon))) {
    flex: 1 1 0;
    justify-content: center;
    min-width: max-content;
  }

  .action-bar__actions > :deep(.basic-tooltip > .button-basic) {
    flex: 1;
    justify-content: center;
  }
}
</style>
