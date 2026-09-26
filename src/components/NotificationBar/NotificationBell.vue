<template>
  <div class="relative">
    <button
      ref="bell"
      class="notif-bell"
      :class="{ 'notif-bell--active': isOpen }"
      :aria-label="$t('notification_bar.open')"
      data-testid="notif-bell"
      @click="toggle"
    >
      <FontAwesomeIcon icon="bell" />
      <span v-if="store.unread" class="notif-bell__count" data-testid="notif-count">
        {{ store.unread > 99 ? "99+" : store.unread }}
      </span>
    </button>
    <Teleport to="body">
      <NotificationList v-if="isOpen" :anchor="anchor" @close="isOpen = false" />
    </Teleport>
  </div>
</template>

<script setup>
import { ref } from "vue";
import { useNotificationsStore } from "@/stores/notifications";
import NotificationList from "./NotificationList.vue";

const store = useNotificationsStore();
const isOpen = ref(false);
const bell = ref(null);
const anchor = ref(null);

function toggle() {
  isOpen.value = !isOpen.value;
  const rect = bell.value.getBoundingClientRect();
  anchor.value = { top: Math.round(rect.bottom + 8), right: Math.round(window.innerWidth - rect.right) };
  if (isOpen.value) store.loadItems();
}
</script>

<style scoped>
.notif-bell {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: var(--radius-lg);
  border: none;
  background: none;
  color: var(--text-muted);
  cursor: pointer;
  font-size: var(--fs-250);
}
.notif-bell:hover,
.notif-bell--active {
  background: var(--surface-raised);
  color: var(--text-body);
}
.notif-bell__count {
  position: absolute;
  top: 0;
  right: 0;
  min-width: 1.1rem;
  height: 1.1rem;
  padding: 0 var(--space-1);
  border-radius: var(--radius-full);
  background: var(--negative-fill);
  color: var(--text-on-status-fill);
  font-size: var(--fs-100);
  font-weight: 600;
  line-height: 1.1rem;
  text-align: center;
}
</style>
