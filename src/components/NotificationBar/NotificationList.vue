<template>
  <div class="notif-list" role="dialog" :aria-label="$t('notification_bar.title')" data-testid="notif-list">
    <p class="notif-list__head">{{ $t("notification_bar.title") }}</p>
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
</template>

<script setup>
import { useRouter } from "vue-router";
import { useNotificationsStore } from "@/stores/notifications";

const emit = defineEmits(["navigate"]);
const store = useNotificationsStore();
const router = useRouter();

async function openItem(item) {
  const route = await store.open(item);
  if (!route) return;
  emit("navigate");
  router.push(route);
}

function formatAge(iso) {
  return new Date(iso).toLocaleString([], { dateStyle: "short", timeStyle: "short" });
}
</script>

<style scoped>
.notif-list {
  position: absolute;
  right: 0;
  top: calc(100% + 0.5rem);
  width: min(22rem, calc(100vw - 1rem));
  max-height: 70vh;
  overflow-y: auto;
  background: var(--c-basic-100);
  border: 1px solid var(--c-basic-300);
  border-radius: 0.5rem;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
  z-index: 50;
}
.notif-list__head {
  margin: 0;
  padding: 0.75rem 1rem;
  font-weight: 600;
  border-bottom: 1px solid var(--c-basic-300);
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
