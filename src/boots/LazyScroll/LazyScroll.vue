<template>
  <div v-lazy class="lazy-container">
    <slot></slot>
  </div>
</template>

<script>
import { debounce } from "lodash";
export default {
  props: {
    prevent: {
      type: Boolean,
      require: false,
      default: false,
    },
  },
  directives: {
    lazy: {
      bind: (el, binding, vNode) => {
        if (!binding.hasOwnProperty("value") || binding.value) {
          el.addEventListener(
            "scroll",
            debounce(() => {
              if (
                el.scrollHeight - el.scrollTop - el.clientHeight < 5 &&
                !vNode.context.prevent
              ) {
                vNode.context.$emit("onLazy");
              }
            }, 500)
          );
        }
      },
      unbind: (el, binding, vNode) => {
        if (!binding.hasOwnProperty("value") || binding.value) {
          document.removeEventListener("scroll", el.lazy);
        }
      },
    },
  },
};
</script>

<style lang="scss">
.lazy-container {
  max-height: 100%;
  overflow-x: hidden;
  overflow-y: auto;
}
</style>
