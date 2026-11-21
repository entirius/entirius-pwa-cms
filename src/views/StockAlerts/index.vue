<template>
  <div class="stock-alerts-panel h-100">
    <router-view />
  </div>
</template>

<script>
export default {
  name: "StockAlertsPanel",
};
</script>

<style lang="scss" scoped>
.stock-alerts-panel {
  display: flex;
  flex-direction: column;
}
</style>
