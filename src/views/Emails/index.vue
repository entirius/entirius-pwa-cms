<template>
  <div class="emails-panel h-100">
    <router-view />
  </div>
</template>

<script>
export default {
  name: "EmailsPanel",
};
</script>

<style lang="scss" scoped>
.emails-panel {
  display: flex;
  flex-direction: column;
}
</style>
