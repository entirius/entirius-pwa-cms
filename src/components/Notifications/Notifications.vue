<template>
  <div class="notifications">
    <transition-group name="alert" tag="ul" appear class="notifications__list">
      <li
        v-for="notification in notifications"
        :key="notification.uuid"
        class="notification flex jc-sb ai-ct mb-100 p-200 br-50 shadow-down"
        :class="`bg-${notification.type}-100 t-${notification.type}-300 notification--${notification.type}`"
        :role="severityRole(notification.type)"
        :aria-live="severityAriaLive(notification.type)"
        @mouseenter="notify.pauseTimer(notification.uuid)"
        @mouseleave="notify.resumeTimer(notification.uuid)"
      >
        <div class="notification__msg">
          <p
            v-if="notification.title"
            class="fs-300 fw-600"
            :class="notification.msg ? 'mb-50' : ''"
            v-text="notification.title"
          />
          <p v-if="notification.msg" class="fs-200" v-text="notification.msg" />
        </div>
        <button
          type="button"
          class="notification__close"
          :aria-label="$t('common.dismiss')"
          @click="notify.hideNotification(notification.uuid)"
        >
          ×
        </button>
      </li>
    </transition-group>
  </div>
</template>

<script>
import { useNotifyStore } from "@/stores/notify";
export default {
  setup() {
    const notify = useNotifyStore();
    return { notify };
  },
  computed: {
    notifications() {
      return this.notify.notifications;
    },
  },
  methods: {
    severityRole(type) {
      return type === "negative" || type === "warning" ? "alert" : "status";
    },
    severityAriaLive(type) {
      return type === "negative" || type === "warning" ? "assertive" : "polite";
    },
  },
};
</script>

<style lang="scss">
@media screen and (max-width: 768px) {
  .notifications {
    top: 0;
    right: 0;
    left: 0;
    width: 100%;
  }
  .notification {
    width: 100%;
  }
}
.notifications {
  position: fixed;
  z-index: 101;
  top: 4rem;
  right: 4rem;
  width: 28em;
}
.notifications__list {
  list-style: none;
  padding: 0;
  margin: 0;
}
.notification {
  width: 28em;
  border-left: 3px solid currentColor;
}
.notification--positive {
  border-left-color: var(--c-positive-300);
}
.notification--negative {
  border-left-color: var(--c-negative-300);
}
.notification--informative {
  border-left-color: var(--c-informative-300);
}
.notification--warning {
  border-left-color: var(--c-warning-300);
}
.notification__close {
  background: transparent;
  border: 0;
  color: inherit;
  font-size: 1.25rem;
  line-height: 1;
  cursor: pointer;
  padding: 0 var(--space-50);
  margin-left: var(--space-100);
  opacity: 0.7;
  transition: opacity 120ms ease;
}
.notification__close:hover {
  opacity: 1;
}
.notification__close:focus-visible {
  opacity: 1;
  outline: 2px solid var(--c-support-400);
  outline-offset: 2px;
}
</style>
