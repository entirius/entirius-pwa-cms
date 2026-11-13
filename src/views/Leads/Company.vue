<template>
  <!-- One card on a phone and at a desk (ux/screens/company-card.md); a phone opens it on History -->
  <PageLayout data-testid="company-card">
    <template #header>
      <PageHeader :title="company?.name || $t('leads.company.title')" wrap-title :back="{ name: 'LeadsCompanies' }">
        <template v-if="company" #meta>
          <span class="t-muted" data-testid="company-domain">{{ company.domain }}</span>
          <span class="visually-hidden" data-testid="thread-company">{{ company.name }}</span>
          <StatusBadge
            v-if="company.do_not_contact"
            tone="negative"
            :label="$t('leads.company.do_not_contact')"
            data-testid="company-dnc-badge"
          />
          <BasicSelect
            class="company__select"
            :model-value="company.stage.key"
            :options="stageOptions"
            :floating-label="isDesktop ? $t('leads.company.stage') : undefined"
            :aria-label="$t('leads.company.stage')"
            :disabled="readonly"
            data-testid="company-stage"
            @update:model-value="transition"
          />
          <BasicSelect
            class="company__select"
            :model-value="company.lead_type"
            :options="typeOptions"
            :floating-label="isDesktop ? $t('leads.company.type') : undefined"
            :aria-label="$t('leads.company.type')"
            :disabled="readonly"
            data-testid="company-lead-type"
            @update:model-value="retype"
          />
        </template>
        <template v-if="company" #actions>
          <CompanyActions :company="company" @changed="reload" @compose="composeOpen = true" />
        </template>
      </PageHeader>
    </template>
    <EmptyState v-if="loadError" icon="empty" size="md" :title="loadError" data-testid="company-load-error">
      <router-link class="t-accent" :to="{ name: 'LeadsCompanies' }">{{ $t("leads.companies.title") }}</router-link>
    </EmptyState>
    <Loader v-else-if="!company" block />
    <template v-else>
      <AiToolboxHint />
      <BasicTabs class="company__tabs" id-prefix="company" :options="tabOptions" :model-value="tab" @update:model-value="openTab" />
      <div :id="`company-panel-${tab}`" role="tabpanel" :aria-labelledby="`company-tab-${tab}`">
        <section v-if="tab === 'overview'" class="flex-column gap-8">
          <template v-if="crm">
            <CompanyDetails :company="company" :fields="fields" @saved="company = $event" />
            <ScoreCard :key="company.id" :company="company" />
          </template>
          <OverviewTab :company="company" />
        </section>
        <IntelTab v-else-if="tab === 'intel'" :company="company" />
        <ContactsTab v-else-if="tab === 'contacts'" :company="company" @changed="reload" />
        <ReadonlyArea v-else-if="tab === 'tasks'" :area="AREAS.TODO_TASKS">
          <TasksTab :key="company.id" :company="company" @count="taskCount = $event" />
        </ReadonlyArea>
        <section v-else class="flex-column gap-6">
          <Thread />
          <ul v-if="company.activities.length" class="company__events flex-column gap-2 m-0" data-testid="company-events">
            <li v-for="activity in company.activities" :key="activity.id" data-testid="timeline-event">
              <span class="t-muted">{{ formatTime(activity.created_at) }}</span> {{ activityText(activity.message) }}
            </li>
          </ul>
        </section>
      </div>
      <ComposeDialog v-if="crm" v-model:open="composeOpen" :company="company" @sent="reload" />
    </template>
  </PageLayout>
</template>

<script setup>
import { computed, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { t } from "@/i18n";
import { GET_Attributes, GET_Company, GET_Stages, PATCH_Company, POST_Transition } from "@/api/leads/api";
import { extractApiMessage } from "@/composables/useFormErrors";
import { useIsDesktop } from "@/composables/useIsDesktop";
import { ReadonlyArea, usePageReadonly } from "@/composables/useReadonly";
import { AREAS } from "@/configs/areas";
import { useAccessStore } from "@/stores/access";
import { useMuninStore } from "@/stores/munin";
import { activityText } from "@/utils/leadsLabels";
import { outboundOn } from "@/utils/leadsOutbound";
import { formatTime } from "@/utils/leadsTime";
import { companySubjectRef } from "@/utils/subjectRef";
import { GET_Tasks } from "@/api/todo/api";
import { useLeadTypesStore } from "@/stores/leadTypes";
import { useNotifyStore } from "@/stores/notify";
import AiToolboxHint from "@/components/ConfigHealth/AiToolboxHint.vue";
import CompanyActions from "./CompanyActions.vue";
import CompanyDetails from "./CompanyDetails.vue";
import ComposeDialog from "./ComposeDialog.vue";
import { fieldsFromDefinitions } from "./customFields";
import ScoreCard from "./ScoreCard.vue";
import TasksTab from "./tabs/TasksTab.vue";
import Thread from "./Thread.vue";
import ContactsTab from "./tabs/ContactsTab.vue";
import IntelTab from "./tabs/IntelTab.vue";
import OverviewTab from "./tabs/OverviewTab.vue";

// Company card: the page frame (name as H1, domain, stage and lead-type selects in the meta, actions), the tabs. Leads
// CRM (leads >= 0.5.0): Details and Score on Overview, Tasks (django-todo), Write mail; History = the mail thread and
// the company's events.
const TABS = ["overview", "contacts", "timeline", "tasks", "intel"];
const route = useRoute();
const router = useRouter();
const notify = useNotifyStore();
const isDesktop = useIsDesktop();
const company = ref(null);
const loadError = ref("");
const stages = ref([]);
const leadTypes = useLeadTypesStore();
// The active types, plus the company's own type when it was deactivated since (it still reads, it is not offered).
const typeOptions = computed(() => {
  const code = company.value?.lead_type;
  const own = code && code !== "UNKNOWN" && !leadTypes.active.some((type) => type.code === code);
  const types = own ? [...leadTypes.active, { code, label: leadTypes.label(code) }] : leadTypes.active;
  return [
    { value: "UNKNOWN", label: t("leads.lead_types.unknown") },
    ...types.map((type) => ({ value: type.code, label: type.label })),
  ];
});
const stageOptions = computed(() => stages.value.map((stage) => ({ value: stage.key, label: stage.label })));

const munin = useMuninStore();
const access = useAccessStore();
const readonly = usePageReadonly();
const crm = computed(() => outboundOn(munin, "leads"));
const tasksOn = computed(() => crm.value && munin.isModuleInstalled("todo") && access.can(AREAS.TODO_TASKS));
const definitions = ref([]);
const fields = computed(() => fieldsFromDefinitions(definitions.value));
const composeOpen = ref(false);
const taskCount = ref(null);
const tabs = computed(() => TABS.filter((value) => value !== "tasks" || tasksOn.value));
const tab = computed(() => {
  if (tabs.value.includes(route.query.tab)) return route.query.tab;
  return isDesktop.value ? "overview" : "timeline";
});
const tabOptions = computed(() =>
  tabs.value.map((value) => ({
    value,
    label: t(`leads.company.tabs.${value}`),
    count: value === "tasks" ? taskCount.value : null,
    testid: `company-tab-${value}`,
  }))
);

function openTab(value) {
  router.replace({ query: { ...route.query, tab: value } });
}

// Every open() numbers the card (plan 61c): an answer of an earlier open — another company, or this one opened again
// meanwhile — is dropped, so it never shows or acts under the URL the user is on now.
let opened = 0;
const isCurrent = (opening) => opening === opened;

async function load() {
  const opening = opened;
  const [companyRes, stageRes] = await Promise.all([GET_Company(route.params.id), GET_Stages(), leadTypes.load()]);
  if (!isCurrent(opening)) return;
  company.value = companyRes.data;
  stages.value = stageRes.data.results;
  if (crm.value) loadFields();
  if (tasksOn.value) countTasks();
}

// The Tasks tab's badge: the open tasks of the company (one row asked, the count read).
async function countTasks() {
  try {
    taskCount.value = (await GET_Tasks({ subject_ref: companySubjectRef(route.params.id), status: "open", page_size: 1 })).data.count;
  } catch {
    taskCount.value = null;
  }
}

// Custom field definitions: without them the Details card shows owner and origin only.
async function loadFields() {
  try {
    definitions.value = (await GET_Attributes("company")).data.results;
  } catch {
    definitions.value = [];
  }
}

// A reload of the open card (after an action or a refused change): a failure leaves the card as it was and says the
// card could not be refreshed — the action itself went through.
async function reload() {
  const opening = opened;
  try {
    await load();
  } catch (err) {
    if (!isCurrent(opening)) return;
    notify.spawnNotification({ msg: extractApiMessage(err, t("leads.company.refresh_failed")), type: "negative" });
  }
}

// A stage move or a type change: its answer replaces the card while the card is still open; a refusal reloads it.
async function change(request, failedMessage) {
  const opening = opened;
  try {
    const { data } = await request();
    if (isCurrent(opening)) company.value = data;
  } catch (err) {
    if (!isCurrent(opening)) return;
    notify.spawnNotification({ msg: extractApiMessage(err, failedMessage), type: "negative" });
    await reload();
  }
}

function transition(stageKey) {
  if (stageKey === company.value.stage.key) return; // the current stage picked again: no move
  return change(() => POST_Transition(company.value.id, stageKey), t("leads.board.move_failed"));
}

function retype(code) {
  if (code === company.value.lead_type) return;
  return change(() => PATCH_Company(company.value.id, { lead_type: code }), t("leads.review.error"));
}

// The header stands while the card loads and when it fails; only its actions wait for the company.
// Another company: the previous one's card and header actions go until the new one arrives.
async function open() {
  const opening = ++opened;
  company.value = null;
  loadError.value = "";
  try {
    await load();
  } catch (err) {
    if (!isCurrent(opening)) return;
    loadError.value = err?.httpStatus === 404 ? t("leads.company.not_found") : extractApiMessage(err, t("leads.review.error"));
  }
}

watch(
  () => route.params.id,
  (id) => {
    taskCount.value = null;
    if (id) open();
  },
  { immediate: true }
);
</script>

<style scoped>
.company__select {
  width: 14rem;
}
.company__tabs {
  margin-bottom: var(--space-6);
}
.company__events {
  padding-left: var(--space-4);
}
</style>
