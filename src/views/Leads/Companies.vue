<template>
  <!-- alone: a page (PageHeader + Add); in the Inbox column the toggle above already says "Companies" -->
  <component :is="embedded ? 'div' : PageLayout" class="companies" data-testid="leads-companies">
    <template v-if="!embedded" #header>
      <PageHeader :title="$t('leads.companies.title')">
        <template #actions>
          <ActionBar :actions="[addAction]" />
        </template>
      </PageHeader>
    </template>
    <div class="companies__body">
      <!-- C-18: the search takes its own full-width row, so its placeholder is never cut -->
      <div class="flex ai-ct jc-fe flex-wrap gap-3">
        <BasicButton v-if="embedded" variant="primary" data-testid="companies-add" @click="addAction.onClick">
          {{ addAction.label }}
        </BasicButton>
        <label class="companies__search">
          <span class="visually-hidden">{{ $t("leads.board.search") }}</span>
          <ReadonlyOff>
            <BasicInput
              v-model="search"
              type="search"
              icon="search"
              :placeholder="$t('leads.board.search')"
              data-testid="companies-search"
              @on-key-down="load()"
            />
          </ReadonlyOff>
        </label>
      </div>
      <!-- Q11: pick companies and move them to another sender route (needs routes: communicator on) -->
      <div v-if="routes.length" class="flex ai-ct flex-wrap gap-3" data-testid="companies-route-tools">
        <BasicSelect v-model="routeFilter" :options="filterOptions" :floating-label="$t('leads.companies.route_filter')" data-testid="companies-route-filter" @update:model-value="load()" />
        <BasicButton variant="secondary" :aria-pressed="String(selecting)" data-testid="companies-select-mode" @click="toggleSelecting">
          {{ selecting ? $t("leads.companies.select_done") : $t("leads.companies.select") }}
        </BasicButton>
      </div>
      <div v-if="selecting" class="companies__bulk" role="region" :aria-label="$t('leads.companies.bulk')" data-testid="companies-bulk">
        <BasicButton variant="ghost" size="sm" data-testid="companies-select-all" @click="selectAllLoaded">{{ $t("leads.companies.select_all", { count: companies.length }) }}</BasicButton>
        <span class="fw-600" data-testid="companies-selected">{{ $t("leads.companies.selected", { count: picked.size }) }}</span>
        <BasicSelect v-model="targetRoute" :options="targetOptions" :floating-label="$t('leads.companies.move_to')" data-testid="companies-bulk-route" />
        <BasicButton mutates variant="primary" :disabled="!picked.size || bulkBusy" :loading="bulkBusy" data-testid="companies-bulk-apply" @click="applyRoute">
          {{ $t("leads.companies.move", { count: picked.size }) }}
        </BasicButton>
      </div>
      <p v-if="bulkMessage" class="m-0" :class="{ 't-negative': bulkFailed }" role="status" data-testid="companies-bulk-message">{{ bulkMessage }}</p>
      <EmptyState
        v-if="!loading && !companies.length"
        icon="empty"
        size="sm"
        :title="$t('leads.companies.empty')"
        data-testid="companies-empty"
      />
      <div class="companies__list">
        <template v-for="company in companies" :key="company.id">
          <label v-if="selecting" class="company-row company-row--pick" data-testid="companies-pick-row" :data-company="company.id">
            <BasicCheckbox :model-value="picked.has(company.id)" :aria-label="company.name || company.domain" data-testid="companies-pick" @update:model-value="pick(company.id, $event)" />
            <span class="company-row__text">
              <span class="company-row__domain">{{ company.name || company.domain }}</span>
              <span class="t-muted fs-200">{{ company.stage?.label }} · {{ routeText(company) }}</span>
            </span>
          </label>
          <router-link
            v-else
            :to="{ name: 'LeadsThread', params: { id: company.id } }"
            class="company-row"
            :class="{ 'company-row--active': isActive(company) }"
            active-class=""
            exact-active-class=""
            data-testid="companies-item"
          >
            <span class="company-row__domain">{{ company.name || company.domain }}</span>
            <span class="t-muted fs-200">{{ company.stage?.label }} · {{ formatTime(company.last_activity_at) || "—" }}<template v-if="company.sender_route"> · {{ company.sender_route }}</template></span>
          </router-link>
        </template>
      </div>
      <BasicButton v-if="next" class="companies__more" :loading="loading" data-testid="companies-more" @click="load(page + 1)">
        {{ $t("leads.board.more") }}
      </BasicButton>
    </div>
  </component>
</template>

<script setup>
import { computed, onMounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import PageLayout from "@/boots/PageLayout/index.vue";
import { t } from "@/i18n";
import { GET_Companies, POST_BulkSenderRoute } from "@/api/leads/api";
import { GET_Routes } from "@/api/communicator/api";
import { extractApiMessage } from "@/composables/useFormErrors";
import { useMuninStore } from "@/stores/munin";
import { formatTime } from "@/utils/leadsTime";
import { ReadonlyOff } from "@/composables/useReadonly";

// Company list that works below 1024 px: the Leads entry when communicator (the Inbox) is absent, else the
// Companies side of the Inbox column (`embedded`), next to the card it opened.
defineProps({ embedded: { type: Boolean, default: false } });
const route = useRoute();
const router = useRouter();
const addAction = computed(() => ({
  key: "add",
  label: t("leads.add.open"),
  role: "primary",
  testid: "companies-add",
  onClick: () => router.push({ name: "LeadsCompanyNew" }),
}));
const isActive = (company) => route.name === "LeadsThread" && String(route.params.id) === String(company.id);
const companies = ref([]);
const search = ref("");
const page = ref(1);
const next = ref(null);
const loading = ref(false);

// Q11 — sender routes: filter the list by route, pick companies, move them to another route (or back to the default)
const ANY = "__any__";
const munin = useMuninStore();
const routes = ref([]);
const routeFilter = ref(ANY);
const targetRoute = ref("");
const selecting = ref(false);
const picked = ref(new Set());
const bulkBusy = ref(false);
const bulkMessage = ref("");
const bulkFailed = ref(false);
const filterOptions = computed(() => [{ value: ANY, label: t("leads.companies.any_route") }, ...routes.value.map((route) => ({ value: route.key, label: route.name || route.key }))]);
const targetOptions = computed(() => [{ value: "", label: t("leads.companies.route_default") }, ...routes.value.filter((route) => route.is_active).map((route) => ({ value: route.key, label: route.name || route.key }))]);
const routeText = (company) => company.sender_route || t("leads.companies.route_default");

function toggleSelecting() {
  selecting.value = !selecting.value;
  picked.value = new Set();
  bulkMessage.value = "";
}
function pick(id, on) {
  const copy = new Set(picked.value);
  if (on) copy.add(id);
  else copy.delete(id);
  picked.value = copy;
}
const selectAllLoaded = () => (picked.value = new Set(companies.value.map((company) => company.id)));

async function applyRoute() {
  bulkBusy.value = true;
  bulkMessage.value = "";
  bulkFailed.value = false;
  try {
    const { data } = await POST_BulkSenderRoute([...picked.value], targetRoute.value);
    bulkMessage.value = t("leads.companies.moved", { count: data.updated });
    picked.value = new Set();
    await load();
  } catch (err) {
    bulkFailed.value = true;
    bulkMessage.value = extractApiMessage(err, t("leads.review.error"));
  } finally {
    bulkBusy.value = false;
  }
}

async function loadRoutes() {
  if (!munin.isModuleEnabled("communicator")) return;
  try {
    routes.value = (await GET_Routes()).data.results || [];
  } catch {
    routes.value = []; // no routes, no route tools; the list works as before
  }
}

async function load(nextPage = 1) {
  loading.value = true;
  try {
    const query = { search: search.value, sort: "-last_activity_at", page: nextPage };
    if (routeFilter.value !== ANY) query.sender_route = routeFilter.value;
    const { data } = await GET_Companies(query);
    companies.value = nextPage > 1 ? [...companies.value, ...data.results] : data.results;
    next.value = data.next;
    page.value = nextPage;
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  load();
  loadRoutes();
});
</script>

<style scoped>
.companies__body {
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
}
div.companies {
  padding: var(--space-8);
}
.companies__more {
  align-self: flex-start;
}
.companies__search {
  flex: 1 1 100%;
  min-width: 0;
}
.companies__list {
  display: flex;
  flex-direction: column;
}
.company-row {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  min-height: 44px;
  padding: var(--space-3) var(--space-4);
  border-bottom: 1px solid var(--border-subtle);
  color: inherit;
  text-decoration: none;
}
/* The open card's row: a 3 px accent edge inside the row's own padding, so the text does not move. */
.company-row--active {
  padding-left: calc(var(--space-4) - 3px);
  border-left: 3px solid var(--focus-ring);
  background: var(--surface-raised);
}
.company-row--pick {
  flex-direction: row;
  align-items: center;
  cursor: pointer;
}
.company-row__text {
  display: flex;
  flex-direction: column;
  min-width: 0;
}
.companies__bulk {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-3);
  background: var(--accent-subtle);
  border-radius: var(--radius-base);
}
.company-row__domain {
  font-weight: 600;
  overflow-wrap: anywhere;
}
</style>
