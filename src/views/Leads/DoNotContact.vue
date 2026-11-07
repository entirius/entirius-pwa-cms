<template>
  <PageLayout data-testid="leads-dnc">
    <template #header>
      <PageHeader :title="$t('leads.dnc.title')" :back="{ name: 'LeadsSettings' }">
        <template #actions>
          <BasicButton mutates variant="danger" data-testid="dnc-add" @click="adding = true">{{ $t("leads.dnc.add") }}</BasicButton>
        </template>
      </PageHeader>
    </template>
    <div class="dnc flex-column gap-6">
      <p class="t-muted m-0">{{ $t("leads.dnc.help") }}</p>
      <p v-if="notice" class="m-0" role="status" data-testid="dnc-notice">{{ notice }}</p>
      <p v-if="error" class="t-negative m-0" role="alert" data-testid="dnc-load-error">{{ error }}</p>
      <template v-if="list">
        <section v-for="part in parts" :key="part.key" class="flex-column gap-2" :data-testid="`dnc-${part.key}`">
          <h2 class="fs-500 fw-600 m-0">{{ part.title }} ({{ part.rows.length }})</h2>
          <p v-if="!part.rows.length" class="t-muted m-0">{{ $t("leads.dnc.none") }}</p>
          <ul class="dnc__list m-0">
            <li v-for="(row, index) in part.rows" :key="`${part.key}-${index}`" class="dnc__row" data-testid="dnc-row">
              <strong class="dnc__value">{{ row.value }}</strong>
              <span class="t-muted fs-200">{{ row.note }}</span>
            </li>
          </ul>
        </section>
      </template>
      <Loader v-else-if="!error" block />
    </div>
    <DoNotContactDialog :open="adding" @close="adding = false" @done="onDone" />
  </PageLayout>
</template>

<script setup>
import { computed, onMounted, ref } from "vue";
import { t } from "@/i18n";
import { GET_DoNotContact } from "@/api/leads/api";
import { extractApiMessage } from "@/composables/useFormErrors";
import { formatDayTime } from "@/utils/leadsTime";
import DoNotContactDialog from "./DoNotContactDialog.vue";

// Leads → Settings → Do not contact (Q7): the one shared list — opted-out addresses, blocked domains (companies) and the
// communicator suppressions of every channel. Add only: the API has no way to take an entry off, on purpose.
const list = ref(null);
const error = ref("");
const notice = ref("");
const adding = ref(false);

const parts = computed(() => [
  {
    key: "contacts",
    title: t("leads.dnc.addresses"),
    rows: (list.value?.contacts || []).map((row) => ({ value: row.email, note: [row.channel, row.opt_out_at && formatDayTime(row.opt_out_at)].filter(Boolean).join(" · ") })),
  },
  {
    key: "companies",
    title: t("leads.dnc.domains"),
    rows: (list.value?.companies || []).map((row) => ({ value: row.domain, note: row.channel || "" })),
  },
  {
    key: "suppressions",
    title: t("leads.dnc.suppressions"),
    rows: (list.value?.suppressions || []).map((row) => ({ value: row.value, note: [row.kind, row.channel, row.reason].filter(Boolean).join(" · ") })),
  },
]);

async function load() {
  try {
    list.value = (await GET_DoNotContact()).data;
    error.value = "";
  } catch (err) {
    error.value = extractApiMessage(err, t("leads.dnc.load_error"));
  }
}

async function onDone(done) {
  adding.value = false;
  notice.value = t("leads.dnc.done_counts", { target: done.email || done.domain, contacts: done.contacts ?? 0, companies: done.companies ?? 0 });
  await load();
}

onMounted(load);
</script>

<style scoped>
.dnc {
  max-width: 900px;
}
.dnc__list {
  list-style: none;
  padding: 0;
}
.dnc__row {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: var(--space-1) var(--space-4);
  padding: var(--space-2) 0;
  border-bottom: 1px solid var(--border-subtle);
}
.dnc__value {
  overflow-wrap: anywhere;
}
</style>
