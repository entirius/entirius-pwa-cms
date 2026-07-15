<template>
  <!-- Focused: teleported overlay + sliding panel -->
  <Teleport to="body" v-if="mode === 'focused'">
    <Transition name="side-drawer-focused">
      <div
        v-if="visible"
        class="side-drawer-overlay"
        @click.self="$emit('close')"
      >
        <div class="side-drawer-panel" :style="{ width: effectiveWidth }">
          <header class="side-drawer__header flex ai-ct jc-sb mb-300">
            <span class="fs-300 fw-600 t-basic-800">{{ title }}</span>
            <button
              class="side-drawer__close t-basic-500 pointer"
              @click="$emit('close')"
            >
              <FontAwesomeIcon icon="xmark" />
            </button>
          </header>
          <div class="side-drawer__body">
            <slot />
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>

  <!-- Sticky: position-sticky sidebar pinned in scroll container -->
  <Transition v-else name="side-drawer-sticky">
    <div
      v-if="visible"
      class="side-drawer-sticky"
      :style="{ width: effectiveWidth, minWidth: effectiveWidth }"
    >
      <header
        v-if="title || closable"
        class="side-drawer__header flex ai-ct jc-sb mb-300"
      >
        <span v-if="title" class="fs-300 fw-600 t-basic-800">{{ title }}</span>
        <button
          v-if="closable"
          class="side-drawer__close t-basic-500 pointer"
          @click="$emit('close')"
        >
          <FontAwesomeIcon icon="xmark" />
        </button>
      </header>
      <div class="side-drawer__body">
        <slot />
      </div>
    </div>
  </Transition>
</template>

<script setup>
import { computed, onMounted, onBeforeUnmount } from "vue";

const props = defineProps({
  visible: {
    type: Boolean,
    required: true,
  },
  mode: {
    type: String,
    default: "focused",
    validator: (v) => ["focused", "sticky"].includes(v),
  },
  title: {
    type: String,
    default: "",
  },
  width: {
    type: String,
    default: "",
  },
  closable: {
    type: Boolean,
    default: true,
  },
});

const emit = defineEmits(["close"]);

const effectiveWidth = computed(() => {
  if (props.width) return props.width;
  return props.mode === "focused" ? "50rem" : "340px";
});

function onKeydown(e) {
  if (e.key === "Escape" && props.visible && props.mode === "focused") {
    emit("close");
  }
}

onMounted(() => {
  document.addEventListener("keydown", onKeydown);
});

onBeforeUnmount(() => {
  document.removeEventListener("keydown", onKeydown);
});
</script>

<style lang="scss">
/* Focused mode: full-screen overlay */
.side-drawer-overlay {
  position: fixed;
  inset: 0;
  background-color: var(--overlay-handy);
  z-index: 100;
  cursor: pointer;
}

.side-drawer-panel {
  height: 100vh;
  position: absolute;
  right: 0;
  top: 0;
  cursor: default;
  background: var(--c-basic-100);
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  padding: var(--space-300);
  @media only screen and (max-width: 768px) {
    width: 100% !important;
  }
}

/* Sticky mode: full-height sidebar */
.side-drawer-sticky {
  padding: var(--space-300);
  border-left: 1px solid var(--c-basic-300);
  overflow-y: auto;
  display: flex;
  flex-direction: column;
}

/* Shared header */
.side-drawer__header {
  flex-shrink: 0;
}

.side-drawer__close {
  background: none;
  border: none;
  font-size: 16px;
  line-height: 1;
  padding: 4px;
  &:hover {
    color: var(--c-basic-700);
  }
}

.side-drawer__body {
  flex: 1;
  min-height: 0;
}

/* Focused transitions */
.side-drawer-focused-enter-active,
.side-drawer-focused-leave-active {
  transition: opacity 0.25s ease;
  .side-drawer-panel {
    transition: transform 0.25s ease;
  }
}
.side-drawer-focused-enter-from,
.side-drawer-focused-leave-to {
  opacity: 0;
  .side-drawer-panel {
    transform: translateX(100%);
  }
}

/* Sticky transitions */
.side-drawer-sticky-enter-active,
.side-drawer-sticky-leave-active {
  transition: transform 0.25s ease, opacity 0.25s ease;
}
.side-drawer-sticky-enter-from,
.side-drawer-sticky-leave-to {
  transform: translateX(100%);
  opacity: 0;
}
</style>
