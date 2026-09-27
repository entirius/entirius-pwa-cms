<template>
  <div class="orders-panel h-100">
    <div class="panel-toolbar bg-raised fs-300">
      <div id="checkout-orders-toolbar-left" class="flex ai-ct gap-5"></div>
      <div id="checkout-orders-toolbar-right" class="flex ai-ct gap-5"></div>
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
</style>
