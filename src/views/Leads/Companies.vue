<template>
  <div class="ld-page" data-testid="leads-companies">
    <h2 class="ld-title">{{ $t("leads.companies.title") }}</h2>
    <input
      v-model="search"
      class="ld-input"
      type="search"
      :placeholder="$t('leads.board.search')"
      data-testid="companies-search"
      @keyup.enter="load()"
    />
    <p v-if="!loading && !companies.length" class="ld-muted" data-testid="companies-empty">
      {{ $t("leads.companies.empty") }}
    </p>
    <router-link
      v-for="company in companies"
      :key="company.id"
      :to="{ name: 'LeadsThread', params: { id: company.id } }"
      class="company-row"
      data-testid="companies-item"
    >
      <span class="company-row__domain">{{ company.name || company.domain }}</span>
      <span class="ld-muted">{{ company.stage?.label }} · {{ formatTime(company.last_activity_at) || "—" }}</span>
    </router-link>
    <button v-if="next" class="ld-btn" :disabled="loading" data-testid="companies-more" @click="load(page + 1)">
      {{ $t("leads.board.more") }}
    </button>
  </div>
</template>

<script setup>
import { onMounted, ref } from "vue";
import { GET_Companies } from "@/api/leads/api";
import { formatTime } from "@/utils/leadsTime";

// Company list that works below 1024 px: the Leads entry when communicator (the Inbox) is absent.
const companies = ref([]);
const search = ref("");
const page = ref(1);
const next = ref(null);
const loading = ref(false);

async function load(nextPage = 1) {
  loading.value = true;
  try {
    const { data } = await GET_Companies({ search: search.value, sort: "-last_activity_at", page: nextPage });
    companies.value = nextPage > 1 ? [...companies.value, ...data.results] : data.results;
    next.value = data.next;
    page.value = nextPage;
  } finally {
    loading.value = false;
  }
}

onMounted(() => load());
</script>

<style src="./desktop.css"></style>
<style scoped>
.company-row {
  display: flex;
  flex-direction: column;
  gap: var(--space-100);
  min-height: 44px;
  padding: var(--space-200);
  border-bottom: 1px solid var(--c-basic-300);
  color: inherit;
  text-decoration: none;
}
.company-row__domain {
  font-weight: 600;
  overflow-wrap: anywhere;
}
</style>
