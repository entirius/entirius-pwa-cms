<template>
  <div
    class="hover_text_wrapper"
    @mouseenter="handle_mouse_enter"
    @mousemove="handle_mouse_move"
    @mouseleave="handle_mouse_leave"
  >
    <slot></slot>

    <Teleport to="body">
      <transition name="fade">
        <div
          v-show="is_visible"
          class="hover_text pl-100 pr-100 pt-50 pb-50 bg-basic-600 t-basic-100 br-50 fs-100 lc-1"
          :style="position_style"
          ref="tooltip"
        >
          {{ text }}
        </div>
      </transition>
    </Teleport>
  </div>
</template>

<script>
export default {
  name: "hover_text",

  props: {
    text: {
      type: String,
      required: true,
    },
  },

  data() {
    return {
      is_visible: false,
      position_style: {
        top: "0px",
        left: "0px",
      },
    };
  },

  methods: {
    handle_mouse_enter() {
      this.is_visible = true;
    },

    handle_mouse_leave() {
      this.is_visible = false;
    },

    handle_mouse_move(event) {
      if (!this.$refs.tooltip) return;

      const tooltip_rect = this.$refs.tooltip.getBoundingClientRect();

      let x = event.clientX + 10;
      let y = event.clientY + 10;

      if (x + tooltip_rect.width > window.innerWidth) {
        x = event.clientX - tooltip_rect.width - 10;
      }

      if (y + tooltip_rect.height > window.innerHeight) {
        y = event.clientY - tooltip_rect.height - 10;
      }

      this.position_style = {
        top: `${y}px`,
        left: `${x}px`,
      };
    },
  },
};
</script>

<style scoped>
.hover_text_wrapper {
  position: relative;
  display: inline-block;
}

.hover_text {
  position: fixed;
  pointer-events: none;
  z-index: 1000;
  white-space: nowrap;
  box-shadow: var(--shadow-sm);
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s;
}

.fade-enter,
.fade-leave-to {
  opacity: 0;
}
</style>
