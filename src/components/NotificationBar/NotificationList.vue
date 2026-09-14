<template>
  <div class="notif-sheet" data-testid="notif-sheet">
    <div class="notif-sheet__backdrop" data-testid="notif-backdrop" @click="emit('close')"></div>
    <div class="notif-list" role="dialog" :aria-label="$t('notification_bar.title')" data-testid="notif-list">
      <div class="notif-list__head">
        <span class="notif-list__grip" aria-hidden="true"></span>
        <p class="notif-list__title">{{ $t("notification_bar.title") }}</p>
        <button class="notif-list__close" :aria-label="$t('notification_bar.close')" data-testid="notif-close" @click="emit('close')">
          <FontAwesomeIcon icon="xmark" />
        </button>
      </div>
      <p v-if="!store.items.length" class="notif-list__empty">{{ $t("notification_bar.empty") }}</p>
      <button
        v-for="item in store.items"
        :key="item.id"
        class="notif-row"
        :class="`notif-row--${item.severity}`"
        data-testid="notif-row"
        @click="openItem(item)"
      >
        <span class="notif-row__dot" aria-hidden="true"></span>
        <span class="notif-row__text">
          <span class="notif-row__title">{{ item.title }}</span>
          <span class="notif-row__age">{{ formatAge(item.created_at) }}</span>
        </span>
      </button>
    </div>
  </div>
</template>

<script setup>
import { useRouter } from "vue-router";
import { useNotificationsStore } from "@/stores/notifications";

// Bottom sheet: the rows sit in thumb reach on a phone; the same sheet serves desktop.
const emit = defineEmits(["close"]);
const store = useNotificationsStore();
const router = useRouter();

async function openItem(item) {
  const route = await store.open(item);
  if (!route) return;
  emit("close");
  router.push(route);
}

function formatAge(iso) {
  return new Date(iso).toLocaleString([], { dateStyle: "short", timeStyle: "short" });
}
</script>

<style scoped>
.notif-sheet__backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.32);
  z-index: 90;
}
.notif-list {
  position: fixed;
  left: 50%;
  bottom: 0;
  transform: translateX(-50%);
  width: min(32rem, 100vw);
  max-height: 70vh;
  overflow-y: auto;
  padding-bottom: max(0.75rem, env(safe-area-inset-bottom));
  background: var(--c-basic-100);
  border-radius: 1rem 1rem 0 0;
  box-shadow: 0 -8px 24px rgba(0, 0, 0, 0.16);
  z-index: 91;
}
.notif-list__head {
  position: sticky;
  top: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 0.5rem 0.5rem 1rem;
  background: var(--c-basic-100);
  border-bottom: 1px solid var(--c-basic-300);
}
.notif-list__grip {
  position: absolute;
  top: 0.35rem;
  left: 50%;
  width: 2.5rem;
  height: 0.25rem;
  margin-left: -1.25rem;
  border-radius: 999px;
  background: var(--c-basic-300);
}
.notif-list__title {
  margin: 0;
  font-weight: 600;
}
.notif-list__close {
  width: 44px;
  height: 44px;
  border: none;
  border-radius: 8px;
  background: none;
  color: var(--c-basic-600);
  cursor: pointer;
}
.notif-list__empty {
  margin: 0;
  padding: 1rem;
  color: var(--c-basic-500);
}
.notif-row {
  display: flex;
  gap: 0.75rem;
  align-items: flex-start;
  width: 100%;
  min-height: 3rem;
  padding: 0.75rem 1rem;
  background: none;
  border: none;
  border-bottom: 1px solid var(--c-basic-200);
  text-align: left;
  color: var(--c-basic-800);
  cursor: pointer;
}
.notif-row:hover {
  background: var(--c-basic-200);
}
.notif-row__dot {
  flex-shrink: 0;
  width: 0.5rem;
  height: 0.5rem;
  margin-top: 0.4rem;
  border-radius: 50%;
  background: var(--c-support-400);
}
.notif-row--high .notif-row__dot {
  background: var(--c-negative-300);
}
.notif-row__text {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  min-width: 0;
}
.notif-row__title {
  overflow-wrap: anywhere;
}
.notif-row__age {
  font-size: var(--fs-100);
  color: var(--c-basic-500);
}
</style>
