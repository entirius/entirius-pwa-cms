<template>
  <ConfirmDialog
    v-if="!$slots.footer"
    :open="visible"
    :tone="destructive ? 'danger' : 'default'"
    @confirm="accept"
    @cancel="reject"
  >
    <template v-if="$slots.header" #title><slot name="header" /></template>
    <slot name="description" />
  </ConfirmDialog>
  <BasicModal v-else :open="visible" size="sm" @update:open="onClose">
    <template v-if="$slots.header" #title><slot name="header" /></template>
    <slot name="description" />
    <template #footer><slot name="footer" /></template>
  </BasicModal>
</template>

<script>
// Transition wrapper over ConfirmDialog (plan 12) until the sweeps move the call sites (scripts/codemods/
// p3-overlays.mjs); plan 19 deletes it. Old API kept: `visible`, `destructive`, `accept` / `reject`, slots `header`,
// `description`, `footer` (a custom footer makes it a plain BasicModal). The confirm button's test id is
// `confirm-dialog-confirm`.
import BasicModal from "@/boots/BasicModal/index.vue";
import ConfirmDialog from "@/boots/ConfirmDialog/index.vue";

export default {
  name: "ConfirmationModal",
  components: { BasicModal, ConfirmDialog },
  props: {
    visible: {
      type: Boolean,
      default: false,
    },
    // Opt-in: a delete, remove or flush passes `destructive` and gets the filled danger confirm (C6); every other
    // confirm is primary.
    destructive: {
      type: Boolean,
      default: false,
    },
  },
  emits: ["accept", "reject"],
  methods: {
    accept() {
      this.$emit("accept");
    },
    reject() {
      this.$emit("reject");
    },
    onClose(open) {
      if (!open) this.reject();
    },
  },
};
</script>
