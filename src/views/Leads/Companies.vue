<template>
  <div class="ld-page" data-testid="leads-companies">
    <!-- embedded: search and Add share one row; alone: title + Add, the search below -->
    <div class="companies__head" :class="{ 'companies__head--embedded': embedded }">
      <!-- in the Inbox column the toggle above already says "Companies" -->
      <h2 v-if="!embedded" class="ld-title">{{ $t("leads.companies.title") }}</h2>
      <router-link :to="{ name: 'LeadsCompanyNew' }" class="ld-btn ld-btn--primary companies__add" data-testid="companies-add">
        {{ $t("leads.add.open") }}
      </router-link>
      <input
        v-model="search"
        class="ld-input companies__search"
        type="search"
        :placeholder="$t('leads.board.search')"
        data-testid="companies-search"
        @keyup.enter="load()"
      />
    </div>
    <p v-if="!loading && !companies.length" class="ld-muted" data-testid="companies-empty">
      {{ $t("leads.companies.empty") }}
    </p>
    <router-link
      v-for="company in companies"
      :key="company.id"
      :to="{ name: 'LeadsThread', params: { id: company.id } }"
      class="company-row"
      :class="{ 'company-row--active': isActive(company) }"
      active-class=""
      exact-active-class=""
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
import { useRoute } from "vue-router";
import { GET_Companies } from "@/api/leads/api";
import { formatTime } from "@/utils/leadsTime";

// Company list that works below 1024 px: the Leads entry when communicator (the Inbox) is absent, else the
// Companies side of the Inbox column (`embedded`), next to the card it opened.
defineProps({ embedded: { type: Boolean, default: false } });
const route = useRoute();
const isActive = (company) => route.name === "LeadsThread" && String(route.params.id) === String(company.id);
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
.companies__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-5);
}
.companies__head {
  flex-wrap: wrap;
}
.companies__search {
  order: 1;
  flex: 1 0 100%;
}
.companies__head--embedded {
  flex-wrap: nowrap;
}
.companies__head--embedded .companies__search {
  order: 0;
  flex: 1 1 auto;
  min-width: 0;
  min-height: 44px;
}
.companies__head--embedded .companies__add {
  order: 1;
  flex-shrink: 0;
  white-space: nowrap;
}
.companies__add {
  display: inline-flex;
  align-items: center;
  min-height: 44px;
  text-decoration: none;
}
.company-row {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  min-height: 44px;
  padding: var(--space-5);
  border-bottom: 1px solid var(--border-subtle);
  color: inherit;
  text-decoration: none;
}
.company-row--active {
  box-shadow: inset 3px 0 0 var(--focus-ring);
  background: var(--surface-raised);
}
.company-row__domain {
  font-weight: 600;
  overflow-wrap: anywhere;
}
</style>
