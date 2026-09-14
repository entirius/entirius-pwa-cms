<template>
  <div class="relative">
    <button
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
      <NotificationList v-if="isOpen" @close="isOpen = false" />
    </Teleport>
  </div>
</template>

<script setup>
import { ref } from "vue";
import { useNotificationsStore } from "@/stores/notifications";
import NotificationList from "./NotificationList.vue";

const store = useNotificationsStore();
const isOpen = ref(false);

function toggle() {
  isOpen.value = !isOpen.value;
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
  border-radius: 8px;
  border: none;
  background: none;
  color: var(--c-basic-500);
  cursor: pointer;
  font-size: 13px;
}
.notif-bell:hover,
.notif-bell--active {
  background: var(--c-basic-200);
  color: var(--c-basic-700);
}
.notif-bell__count {
  position: absolute;
  top: 0;
  right: 0;
  min-width: 1.1rem;
  height: 1.1rem;
  padding: 0 0.25rem;
  border-radius: 999px;
  background: var(--c-negative-300);
  color: var(--c-basic-100);
  font-size: 0.65rem;
  font-weight: 700;
  line-height: 1.1rem;
  text-align: center;
}
</style>
