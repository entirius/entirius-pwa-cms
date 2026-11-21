import { defineStore } from "pinia";
import { ref } from "vue";

// The Inbox column's chip outlives a remount (Today or a settings page in between): the column comes back on it.
export const useLeadsThreadStore = defineStore("leadsThread", () => {
  const inboxFilter = ref(null);
  return { inboxFilter };
});
