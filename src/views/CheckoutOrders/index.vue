<template>
  <div class="orders-panel h-100">
    <div class="orders-panel__toolbar flex ai-ct jc-sb bg-basic-200 fs-300">
      <div id="checkout-orders-toolbar-left" class="flex ai-ct gap-200"></div>
      <div id="checkout-orders-toolbar-right" class="flex ai-ct gap-200"></div>
    </div>
    <router-view />
  </div>
</template>

<script>
export default {
  name: "CheckoutOrdersPanel",
};
</script>

<style lang="scss" scoped>
.orders-panel {
  display: flex;
  flex-direction: column;
}

.orders-panel__toolbar {
  padding: 8px 20px;
  border-bottom: 1px solid var(--c-basic-300);
  flex-shrink: 0;
}
</style>
