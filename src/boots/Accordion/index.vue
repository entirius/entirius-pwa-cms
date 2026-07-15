<template>
  <div class="accordion pointer">
    <div
      class="accordion-head grid grid-col-2 grid-col-2-m ai-ct"
      @click="
        () => {
          open = !open;
          $emit('onOpen');
        }
      "
    >
      <div class="accordion-label">
        <span class="ml-100" v-if="header">{{ header }}</span>
        <slot v-if="!header" name="accordion-custom-head"></slot>
      </div>
      <i :class="`icon-${!open ? 'plus' : 'minus'}`" class="js-fe mr-100"></i>
    </div>
    <div class="accordion-body" v-if="open">
      <slot name="accordion-custom-body"></slot>
    </div>
  </div>
</template>

<script>
export default {
  props: {
    header: {
      type: String,
      require: false,
    },
    force_open: {
      type: Boolean,
      default: false,
    },
  },
  data() {
    return {
      open: false,
    };
  },
  created() {
    if (this.force_open) this.open = true;
  },
};
</script>

<style lang="scss" scoped>
.accordion {
  .lh-reset {
    line-height: initial;
  }

  .accordion-head {
    height: var(--elem-height);
    color: inherit;
  }
}
</style>
