<template>
  <ConfirmDialog
    :open="visible"
    :title="$t('unsaved.title')"
    :message="$t('unsaved.message')"
    :confirm-label="$t('unsaved.save_and_leave')"
    :discard-label="$t('unsaved.discard')"
    @confirm="$emit('save')"
    @discard="$emit('discard')"
    @cancel="$emit('stay')"
  />
</template>

<script>
// Transition wrapper over ConfirmDialog (plan 12) until the sweeps move the call sites (scripts/codemods/
// p3-overlays.mjs); plan 19 deletes it. Stay = cancel (also Esc and the backdrop), discard, save and leave = confirm.
import ConfirmDialog from "@/boots/ConfirmDialog/index.vue";

export default {
  name: "UnsavedChangesModal",
  components: { ConfirmDialog },
  props: {
    visible: {
      type: Boolean,
      default: false,
    },
  },
  emits: ["save", "discard", "stay"],
};
</script>
