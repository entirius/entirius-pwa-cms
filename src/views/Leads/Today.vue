<template>
  <PageLayout data-testid="leads-today">
    <template #header>
      <PageHeader :title="$t('leads.today.title')">
        <template #meta>
          <span class="t-muted">{{ todayLabel }}</span>
        </template>
        <template v-if="tasksOn" #actions>
          <ReadonlyArea :area="AREAS.TODO_TASKS">
            <ActionBar :actions="headerActions" />
          </ReadonlyArea>
        </template>
      </PageHeader>
    </template>
    <template v-if="tasksOn" #toolbar>
      <div class="flex ai-ct flex-wrap gap-5">
        <div class="filter-chip-row">
          <FilterChip
            v-for="key in CHIPS"
            :key="key"
            :label="$t(`leads.today.chip_${key}`)"
            :count="key === 'due' ? dueCount : null"
            :active="chip === key"
            :data-testid="`today-chip-${key}`"
            @click="pick(key)"
          />
        </div>
        <MobileFilterPanel :active-count="owner === 'me' ? 0 : 1" :trigger-label="$t('leads.today.filters')">
          <BasicSelect v-model="owner" :floating-label="$t('leads.today.owner')" :options="ownerOptions" data-testid="today-owner" />
        </MobileFilterPanel>
      </div>
    </template>

    <div class="flex-column gap-8">
      <BasicCard v-if="countersOn" :title="$t('leads.today.waiting')" data-testid="today-waiting">
        <div class="today__counters flex flex-wrap gap-6">
          <template v-for="counter in counters" :key="counter.key">
            <router-link v-if="counter.count" class="t-accent flex ai-ct gap-2" :to="counter.to" :data-testid="counter.testid">
              {{ counter.label }} <CountBadge :count="counter.count" />
            </router-link>
            <span v-else-if="counter.count === 0" class="t-muted" :data-testid="counter.testid">{{ counter.empty }}</span>
          </template>
        </div>
      </BasicCard>

      <ReadonlyArea v-if="tasksOn" :area="AREAS.TODO_TASKS">
        <Loader v-if="loading" block />
        <EmptyState
          v-else-if="chip === 'due' && !rows.length"
          icon="success"
          size="md"
          :title="$t('leads.today.empty_title')"
          :message="upcoming !== null ? $t('leads.today.empty_message', { count: upcoming }) : ''"
          data-testid="today-empty"
        >
          <FilterChip :label="$t('leads.today.chip_upcoming')" @click="pick('upcoming')" />
        </EmptyState>
        <DataTable
          v-else
          :columns="columns"
          :rows="rows"
          row-key="id"
          :row-attrs="rowAttrs"
          :empty-text="$t('leads.today.empty_list')"
          data-testid="today-tasks"
        >
          <template #cell-due="{ row }">
            <StatusBadge :tone="row.due.tone" :label="row.due.label" data-testid="task-due" />
          </template>
          <template #cell-title="{ row }">
            <router-link v-if="row.to" class="t-accent" :to="row.to" :title="row.title">{{ row.title }}</router-link>
            <span v-else :title="row.title">{{ row.title }}</span>
          </template>
          <template #cell-subject="{ row }">
            <router-link v-if="row.to" :to="row.to" data-testid="task-subject">{{ row.subject_label }}</router-link>
            <span v-else data-testid="task-subject">{{ row.subject_label }}</span>
          </template>
          <template #cell-actions="{ row }">
            <BasicButton v-if="row.status === 'done'" mutates size="sm" data-testid="task-reopen" @click="reopen(row)">
              {{ $t("leads.task.reopen") }}
            </BasicButton>
            <BasicButton v-else mutates size="sm" data-testid="task-done" @click="openDialog('done', row)">
              {{ $t("leads.task.mark_done") }}
            </BasicButton>
          </template>
        </DataTable>
      </ReadonlyArea>

      <EmptyState v-else-if="!countersOn" icon="empty" size="md" :title="$t('leads.today.nothing')" data-testid="today-empty">
        <router-link v-if="leadsOn" class="t-accent" :to="{ name: 'LeadsCompanies' }">{{ $t("leads.companies.title") }}</router-link>
      </EmptyState>
      <EmptyState v-else icon="empty" size="sm" :title="$t('leads.today.no_tasks_module')" data-testid="today-no-tasks" />
    </div>
    <template v-if="tasksOn && chip !== 'due'" #footer>
      <Pagination v-model:page="page" :pages="pages" />
    </template>

    <TaskDialog v-model:open="dialogOpen" :mode="dialogMode" :task="dialogTask" @saved="load" />
  </PageLayout>
</template>

<script setup>
import { computed, onMounted, ref, watch } from "vue";
import { t } from "@/i18n";
import { GET_Conversations, GET_Replies } from "@/api/communicator/api";
import { GET_Tasks, GET_Today, POST_TaskReopen } from "@/api/todo/api";
import { extractApiMessage } from "@/composables/useFormErrors";
import { ReadonlyArea } from "@/composables/useReadonly";
import { AREAS } from "@/configs/areas";
import { useAccessStore } from "@/stores/access";
import { useMuninStore } from "@/stores/munin";
import { useNotifyStore } from "@/stores/notify";
import { formatDay } from "@/utils/format";
import { pluralKey } from "@/utils/plural";
import { routeForSubjectRef } from "@/utils/subjectRef";
import TaskDialog from "./TaskDialog.vue";
import { taskDue } from "./tasks";

// Today (ux/screens/today.md): the panel root. The caller's tasks by chip and owner (django-todo), and the drafts and
// replies that wait (communicator). Every block gates itself: no todo → the counters only; no communicator → no
// counters; neither → a link to Companies.
const CHIPS = ["due", "upcoming", "none", "done"];
const PAGE_SIZE = 20;
const CHIP_QUERY = { upcoming: { status: "open", due: "upcoming" }, none: { status: "open", due: "none" }, done: { status: "done" } };

const munin = useMuninStore();
const access = useAccessStore();
const notify = useNotifyStore();
const tasksOn = computed(() => munin.isModuleInstalled("todo") && access.can(AREAS.TODO_TASKS));
const leadsOn = computed(() => munin.isModuleEnabled("leads"));
const commOn = computed(() => munin.isModuleEnabled("communicator"));
const countersOn = computed(() => commOn.value && (drafts.value !== null || replies.value !== null));
const todayLabel = formatDay(new Date().toISOString());

const chip = ref("due");
const owner = ref("me");
const page = ref(1);
const pages = ref(1);
const tasks = ref([]);
const upcoming = ref(null);
const dueCount = ref(null);
const loading = ref(true);
const drafts = ref(null);
const replies = ref(null);
const dialogOpen = ref(false);
const dialogMode = ref("add");
const dialogTask = ref(null);

const ownerOptions = [
  { value: "me", label: t("leads.today.owner_me") },
  { value: "none", label: t("leads.today.owner_none") },
  { value: "all", label: t("leads.today.owner_all") },
];
const headerActions = computed(() => [
  { key: "add", label: t("leads.task.add"), role: "primary", testid: "today-add-task", onClick: () => openDialog("add", null) },
]);
const columns = computed(() =>
  [
    { key: "due", label: t("leads.today.col_due"), width: "max-content" },
    { key: "title", label: t("leads.today.col_task"), width: "1fr" },
    { key: "subject", label: t("leads.today.col_subject"), priority: 2 },
    { key: "kind", label: t("leads.today.col_kind"), priority: 3 },
    owner.value !== "me" && { key: "owner", label: t("leads.today.col_owner"), priority: 3 },
    { key: "actions", label: "", actions: true },
  ].filter(Boolean)
);

// A company task opens the card on its Tasks tab; any other subject its own route.
function subjectRoute(ref) {
  const route = routeForSubjectRef(ref);
  return route?.name === "LeadsThread" ? { ...route, query: { tab: "tasks" } } : route;
}

const rows = computed(() =>
  tasks.value.map((task) => ({
    ...task,
    due: taskDue(task),
    to: subjectRoute(task.subject_ref),
    kind: t(`leads.task_kind.${task.kind}`),
    owner: task.owner ? task.owner.name || task.owner.username : t("leads.today.owner_none"),
  }))
);
const rowAttrs = (row) => ({ "data-testid": "task-row", "data-task": row.id });

const counters = computed(() => [
  {
    key: "drafts",
    count: drafts.value,
    label: t(`leads.today.drafts_${pluralKey(drafts.value)}`, { count: drafts.value }),
    empty: t("leads.today.no_drafts"),
    to: { name: "LeadsInbox", query: { filter: "draft" } },
    testid: "today-drafts",
  },
  {
    key: "replies",
    count: replies.value,
    label: t(`leads.today.replies_${pluralKey(replies.value)}`, { count: replies.value }),
    empty: t("leads.today.no_replies"),
    to: { name: "LeadsInbox", query: { filter: "replied" } },
    testid: "today-replies",
  },
]);

const ownerParam = () => (owner.value === "all" ? {} : { owner: owner.value });

async function loadDue() {
  if (owner.value === "me") {
    const { data } = await GET_Today();
    upcoming.value = data.upcoming_7d;
    dueCount.value = data.overdue + data.today;
    return data.results;
  }
  const query = { ...ownerParam(), status: "open", page_size: 100 };
  const answers = await Promise.all([GET_Tasks({ ...query, due: "overdue" }), GET_Tasks({ ...query, due: "today" })]);
  upcoming.value = null;
  dueCount.value = answers.reduce((sum, { data }) => sum + data.count, 0);
  return answers.flatMap(({ data }) => data.results);
}

async function loadChip() {
  const { data } = await GET_Tasks({ ...ownerParam(), ...CHIP_QUERY[chip.value], page: page.value, page_size: PAGE_SIZE });
  pages.value = Math.max(1, Math.ceil(data.count / PAGE_SIZE));
  return data.results;
}

// A failure keeps the last rows (toast only).
async function load() {
  if (!tasksOn.value) return (loading.value = false);
  try {
    tasks.value = chip.value === "due" ? await loadDue() : await loadChip();
  } catch (err) {
    notify.spawnNotification({ msg: extractApiMessage(err, t("leads.task.error")), type: "negative" });
  } finally {
    loading.value = false;
  }
}

// A counter that fails or is not readable stays hidden.
async function loadCounters() {
  if (!commOn.value) return;
  const [conv, rep] = await Promise.allSettled([
    access.can(AREAS.COMMUNICATOR_REVIEW) ? GET_Conversations({ page_size: 1 }) : Promise.reject(),
    access.can(AREAS.COMMUNICATOR_CONVERSATIONS) ? GET_Replies({ needs_review: true, page_size: 1 }) : Promise.reject(),
  ]);
  drafts.value = conv.status === "fulfilled" ? conv.value.data.counts?.draft ?? 0 : null;
  replies.value = rep.status === "fulfilled" ? rep.value.data.count ?? 0 : null;
}

function pick(key) {
  chip.value = key;
  page.value = 1;
}

function openDialog(mode, task) {
  dialogMode.value = mode;
  dialogTask.value = task;
  dialogOpen.value = true;
}

async function reopen(task) {
  try {
    await POST_TaskReopen(task.id);
    await load();
  } catch (err) {
    notify.spawnNotification({ msg: extractApiMessage(err, t("leads.task.error")), type: "negative" });
  }
}

watch(owner, () => (page.value = 1));
watch([chip, owner, page], () => {
  loading.value = true;
  load();
});
watch(tasksOn, (on) => on && load());
onMounted(() => Promise.all([load(), loadCounters()]));
</script>

<style scoped>
.today__counters {
  row-gap: var(--space-3);
}
</style>
