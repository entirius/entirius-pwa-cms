<template>
  <Teleport to="body">
    <div class="basic-menu__backdrop" @pointerdown.self="pressed = true" @click.self="onClick">
      <slot />
    </div>
  </Teleport>
</template>

<script setup>
// BasicMenu's phone sheet backdrop (teleported to <body>, like BasicModal's), mounted only while a sheet is open.
// `dismiss` fires on a click that also started on the backdrop: closing on the press would let the tap's click land
// on the page under the finger.
const emit = defineEmits(["dismiss"]);
let pressed = false;

function onClick() {
  if (pressed) emit("dismiss");
  pressed = false;
}
</script>

<style lang="scss" scoped>
.basic-menu__backdrop {
  position: fixed;
  inset: 0;
  z-index: 200;
  background: var(--overlay-backdrop);
}
</style>
