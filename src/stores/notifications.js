import { defineStore } from "pinia";
import { ref } from "vue";
import {
  GET_Notifications,
  GET_UnreadCount,
  POST_MarkRead,
} from "@/api/notifications/api";
import { routeForSubjectRef } from "@/utils/subjectRef";

// Notification bar (django-notifications) — not the toast store (`notify`).
const POLL_MS = 30000;

export const useNotificationsStore = defineStore("notifications", () => {
  const unread = ref(0);
  const items = ref([]);
  let timer = null;

  async function poll() {
    if (document.visibilityState !== "visible") return;
    try {
      const { data } = await GET_UnreadCount();
      unread.value = data.unread;
    } catch (err) {
      console.warn("Notification count unavailable:", err.message || err);
    }
  }

  async function loadItems() {
    const { data } = await GET_Notifications({ unread: 1 });
    items.value = data.results || [];
  }

  function start() {
    if (timer) return;
    poll();
    timer = setInterval(poll, POLL_MS);
  }

  function stop() {
    clearInterval(timer);
    timer = null;
    unread.value = 0;
    items.value = [];
  }

  async function markRead(id) {
    await POST_MarkRead(id);
    items.value = items.value.filter((item) => item.id !== id);
    unread.value = Math.max(0, unread.value - 1);
  }

  // Opening a row marks it read; returns the route to jump to (null = no link).
  async function open(item) {
    await markRead(item.id);
    return routeForSubjectRef(item.subject_ref);
  }

  return { unread, items, poll, loadItems, start, stop, markRead, open };
});
