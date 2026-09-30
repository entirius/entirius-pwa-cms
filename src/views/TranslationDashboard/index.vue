<template>
  <div class="translation-panel h-100">
    <router-view class="fs-300 t-body" />
  </div>
</template>

<script>
export default {
  name: "TranslationPanel",
};
</script>

<style lang="scss" scoped>
.translation-panel {
  display: flex;
  flex-direction: column;
}
</style>
