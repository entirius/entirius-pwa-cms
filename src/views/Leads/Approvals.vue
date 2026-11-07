<template>
  <PageLayout data-testid="leads-approvals">
    <template #header>
      <PageHeader :title="$t('leads.approvals.title')">
        <template #actions>
          <BasicButton variant="secondary" :loading="loading" data-testid="approvals-refresh" @click="reload">{{ $t("leads.inbox.refresh") }}</BasicButton>
        </template>
      </PageHeader>
    </template>
    <div class="approvals flex-column gap-5">
      <SegmentedControl v-model="view" :options="viewOptions" data-testid="approvals-view" />

      <template v-if="view === 'waiting'">
        <div class="approvals__filters" data-testid="approvals-filters">
          <BasicInput v-model="filters.q" type="search" icon="search" :placeholder="$t('leads.approvals.search')" data-testid="approvals-search" />
          <BasicSelect v-model="filters.channel" :options="channelOptions" :floating-label="$t('leads.approvals.channel')" data-testid="approvals-channel" @update:model-value="reload" />
          <BasicSelect v-model="filters.route" :options="routeFilterOptions" :floating-label="$t('leads.approvals.route')" data-testid="approvals-route" @update:model-value="reload" />
          <BasicInput v-model="filters.template" :placeholder="$t('leads.approvals.template')" :aria-label="$t('leads.approvals.template')" data-testid="approvals-template" />
          <BasicSelect v-model="filters.age" :options="ageOptions" :floating-label="$t('leads.approvals.age')" data-testid="approvals-age" @update:model-value="reload" />
        </div>

        <p v-if="loadError" class="t-negative m-0" role="alert" data-testid="approvals-error">{{ loadError }}</p>
        <p v-if="result" class="m-0" role="status" data-testid="approvals-result">{{ result }}</p>
        <ul v-if="failedNow.length" class="approvals__failed m-0" data-testid="approvals-failed">
          <li v-for="item in failedNow" :key="item.id" class="t-negative">#{{ item.id }}: {{ item.reason }}</li>
        </ul>

        <div v-if="rows.length" class="approvals__head flex ai-ct flex-wrap gap-4">
          <BasicCheckbox :model-value="allSelected" data-testid="approvals-select-all" @update:model-value="selectAll">
            {{ $t("leads.approvals.select_all", { count: approvableCount }) }}
          </BasicCheckbox>
          <span class="t-muted fs-200" data-testid="approvals-total">{{ $t("leads.approvals.total", { shown: rows.length, total }) }}</span>
          <span class="t-muted fs-200 approvals__keys" data-testid="approvals-keys">{{ $t("leads.approvals.keys") }}</span>
        </div>

        <ul v-if="rows.length" class="approvals__list m-0" data-testid="approvals-list">
          <li
            v-for="(row, index) in rows"
            :key="row.id"
            class="approval"
            :class="{ 'approval--cursor': index === cursor, 'approval--blocked': hasBlocker(row), 'approval--selected': selected.has(row.id) }"
            data-testid="approval-row"
            :data-id="row.id"
            :data-blocked="hasBlocker(row) ? 'yes' : 'no'"
            :aria-current="index === cursor ? 'true' : undefined"
            @click="cursor = index"
          >
            <BasicCheckbox :model-value="selected.has(row.id)" :aria-label="$t('leads.approvals.select_row', { to: row.recipient_email })" data-testid="approval-select" @update:model-value="toggle(row.id, $event)" />
            <div class="approval__main">
              <div class="approval__who">
                <strong class="approval__to" data-testid="approval-to">{{ row.recipient_email }}</strong>
                <span v-if="row.company" class="t-muted">{{ row.company }}</span>
              </div>
              <div class="approval__subject" data-testid="approval-subject">{{ row.subject || $t("leads.inbox.untitled") }}</div>
              <div class="approval__meta fs-200 t-muted">
                <span data-testid="approval-channel">{{ row.channel }}</span>
                <span data-testid="approval-route">{{ routeText(row) }}</span>
                <span v-if="row.template_key" data-testid="approval-template">{{ row.template_key }}<template v-if="row.template_version"> v{{ row.template_version }}</template></span>
                <span data-testid="approval-age">{{ ageText(row.age_hours) }}</span>
              </div>
              <p v-if="row.blocker" class="approval__blocker t-negative fs-200 m-0" data-testid="approval-blocker">
                <strong>{{ $t("leads.approvals.blocker") }}:</strong> {{ row.blocker }}
              </p>
              <p v-if="failures[row.id]" class="t-negative fs-200 m-0" data-testid="approval-failure">{{ failures[row.id] }}</p>
              <pre v-if="open.has(row.id)" class="approval__preview" data-testid="approval-preview">{{ row.body_preview }}</pre>
            </div>
            <div class="approval__tools">
              <BasicButton variant="ghost" size="sm" :aria-expanded="String(open.has(row.id))" data-testid="approval-preview-toggle" @click.stop="togglePreview(row.id)">
                {{ open.has(row.id) ? $t("leads.approvals.hide") : $t("leads.approvals.preview") }}
              </BasicButton>
              <router-link v-if="canOpen(row)" class="t-accent fs-200" :to="{ name: 'LeadsReview', params: { id: row.id } }" data-testid="approval-open" @click.stop>
                {{ $t("leads.approvals.open") }}
              </router-link>
            </div>
          </li>
        </ul>
        <EmptyState v-else-if="loaded && !loadError" icon="empty" size="sm" :title="$t('leads.approvals.empty')" data-testid="approvals-empty" />
        <Loader v-else-if="!loadError" block />

        <BasicButton v-if="next" variant="secondary" class="approvals__more" :loading="loading" data-testid="approvals-more" @click="loadMore">
          {{ $t("leads.board.more") }}
        </BasicButton>

        <div v-if="selected.size" class="approvals__bar" role="region" :aria-label="$t('leads.approvals.bar')" data-testid="approvals-bar">
          <span class="fw-600" data-testid="approvals-selected">{{ $t("leads.approvals.selected", { count: selected.size }) }}</span>
          <span v-if="targets.blocked.length" class="t-negative fs-200" data-testid="approvals-blocked-note">{{ $t("leads.approvals.blocked_note", { count: targets.blocked.length }) }}</span>
          <div class="approvals__actions">
            <BasicButton mutates variant="primary" :disabled="busy || !targets.approvable.length" :loading="busy && acting === 'approve'" data-testid="approvals-approve" @click="run('approve')">
              {{ $t("leads.approvals.approve", { count: targets.approvable.length }) }}
            </BasicButton>
            <BasicButton mutates variant="danger" :disabled="busy" data-testid="approvals-reject" @click="rejecting = true">
              {{ $t("leads.approvals.reject", { count: targets.all.length }) }}
            </BasicButton>
            <BasicButton variant="ghost" data-testid="approvals-clear" @click="selected = new Set()">{{ $t("common.bulk.clear_selection") }}</BasicButton>
          </div>
        </div>
      </template>

      <template v-else>
        <p class="t-muted m-0">{{ $t("leads.approvals.log_help") }}</p>
        <p v-if="logError" class="t-negative m-0" role="alert" data-testid="approvals-log-error">{{ logError }}</p>
        <p v-if="logLoaded && !log.length" class="t-muted m-0" data-testid="approvals-log-empty">{{ $t("leads.approvals.log_empty") }}</p>
        <ul class="approvals__log m-0" data-testid="approvals-log">
          <li v-for="entry in log" :key="entry.id" class="log-row" data-testid="approvals-log-row" :data-action="entry.action">
            <StatusBadge :tone="entry.action === 'approve' ? 'positive' : 'negative'" :dot="false" :label="$t(`leads.approvals.action.${entry.action}`)" />
            <span>{{ $t("leads.approvals.log_counts", { done: entry.done_ids.length, requested: entry.requested }) }}</span>
            <span class="t-muted fs-200">{{ formatDayTime(entry.created_at) }} · {{ entry.user_id == null ? $t("leads.approvals.log_system") : $t("leads.approvals.log_user", { id: entry.user_id }) }}</span>
            <span v-if="entry.reason" class="fs-200">{{ $t("leads.approvals.log_reason") }}: {{ entry.reason }}</span>
            <ul v-if="Object.keys(entry.failed || {}).length" class="m-0 fs-200 t-negative">
              <li v-for="item in failedList(entry.failed)" :key="item.id">#{{ item.id }}: {{ item.reason }}</li>
            </ul>
          </li>
        </ul>
        <BasicButton v-if="logNext" variant="secondary" class="approvals__more" data-testid="approvals-log-more" @click="loadLog(logPage + 1)">{{ $t("leads.board.more") }}</BasicButton>
      </template>
    </div>

    <ConfirmDialog
      :open="rejecting"
      :title="$t('leads.approvals.reject_title', { count: targets.all.length })"
      :message="$t('leads.approvals.reject_message')"
      :confirm-label="$t('leads.approvals.reject_confirm')"
      :cancel-label="$t('common.cancel')"
      tone="danger"
      :loading="busy"
      confirm-testid="approvals-reject-confirm"
      @confirm="run('reject')"
      @cancel="rejecting = false"
    >
      <p class="t-secondary m-0">{{ $t("leads.approvals.reject_message") }}</p>
      <FormField :label="$t('leads.approvals.reject_reason')">
        <BasicInput v-model="reason" data-testid="approvals-reject-reason" />
      </FormField>
    </ConfirmDialog>
  </PageLayout>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from "vue";
import { t } from "@/i18n";
import { GET_Approvals, GET_ApprovalsLog, POST_ApprovalsBulk } from "@/api/communicator/api";
import { extractApiMessage } from "@/composables/useFormErrors";
import { useSearchDebounce } from "@/composables/useSearchDebounce";
import { useLeadsChannelStore } from "@/stores/leadsChannel";
import { useApprovalsStore } from "@/stores/approvals";
import { formatDayTime } from "@/utils/leadsTime";
import { AGE_FILTERS, ageText, approvalKey, failedList, hasBlocker, splitSelection } from "@/utils/leadsOutbound";

// Leads → Approvals (Q11, A4): the one inbox of every draft waiting for a yes, across channels and sender routes.
// Built for ~20 mails a day: open it, skim the rows (oldest first), tick or press x, press a. A row with a blocker
// says why the server would refuse it (unknown sender route, missing legal footer): it cannot be approved from here,
// it can still be rejected. Bulk calls are logged with the user (second view). Keys: j/k move, x select, Enter preview,
// a approve (the selection, else the row under the cursor), r reject.
const ALL = "__all__";
const PAGE_SIZE = 50;
const BULK_MAX = 100;
const channelStore = useLeadsChannelStore();
const approvals = useApprovalsStore();
const { debouncedFetch: debounced } = useSearchDebounce();

const view = ref("waiting");
const viewOptions = computed(() => [
  { value: "waiting", label: t("leads.approvals.view_waiting"), testid: "approvals-view-waiting" },
  { value: "log", label: t("leads.approvals.view_log"), testid: "approvals-view-log" },
]);
const filters = reactive({ q: "", channel: ALL, route: ALL, template: "", age: ALL });
const rows = ref([]);
const total = ref(0);
const next = ref(null);
const page = ref(1);
const loaded = ref(false);
const loading = ref(false);
const loadError = ref("");
const selected = ref(new Set());
const open = ref(new Set());
const cursor = ref(0);
const failures = reactive({});
const failedNow = ref([]);
const result = ref("");
const busy = ref(false);
const acting = ref("");
const rejecting = ref(false);
const reason = ref("");
// Filter options are everything seen so far: a filtered answer carries counts of the filtered set only.
const seenChannels = reactive({});
const seenRoutes = reactive({});

const log = ref([]);
const logPage = ref(1);
const logNext = ref(null);
const logLoaded = ref(false);
const logError = ref("");

const countLabel = (label, count) => (count == null ? label : `${label} (${count})`);
const channelOptions = computed(() => [
  { value: ALL, label: t("leads.approvals.any_channel") },
  ...Object.keys(seenChannels).map((key) => ({ value: key, label: countLabel(key, seenChannels[key]) })),
]);
const routeFilterOptions = computed(() => [
  { value: ALL, label: t("leads.approvals.any_route") },
  ...Object.keys(seenRoutes).filter(Boolean).map((key) => ({ value: key, label: countLabel(key, seenRoutes[key]) })),
]);
const ageOptions = computed(() =>
  AGE_FILTERS.map((item) => ({ value: item.value || ALL, label: item.hours ? t("leads.approvals.older_than", { hours: item.hours }) : t("leads.approvals.any_age") }))
);

const routeText = (row) => row.sender_route || t("leads.approvals.route_default");
const canOpen = (row) => row.channel === channelStore.activeChannelIdx;
const approvableCount = computed(() => rows.value.filter((row) => !hasBlocker(row)).length);
const allSelected = computed(() => approvableCount.value > 0 && rows.value.every((row) => hasBlocker(row) || selected.value.has(row.id)));
// The ticked rows, split into those the server would accept and those with a blocker.
const targets = computed(() => splitSelection(rows.value, selected.value));

function params(nextPage) {
  const query = { page: nextPage, page_size: PAGE_SIZE };
  if (filters.q.trim()) query.q = filters.q.trim();
  if (filters.channel !== ALL) query.channel = filters.channel;
  if (filters.route !== ALL) query.sender_route = filters.route;
  if (filters.template.trim()) query.template = filters.template.trim();
  if (filters.age !== ALL) query.min_age_hours = Number(filters.age);
  return query;
}

// Every load numbers itself: an answer of an earlier filter never overwrites the one on screen.
let loads = 0;
async function load(nextPage = 1) {
  const mine = ++loads;
  loading.value = true;
  loadError.value = "";
  try {
    const { data } = await GET_Approvals(params(nextPage));
    if (mine !== loads) return;
    rows.value = nextPage > 1 ? [...rows.value, ...data.results] : data.results;
    total.value = data.counts?.total ?? data.count;
    next.value = data.next;
    page.value = nextPage;
    for (const [key, count] of Object.entries(data.counts?.by_channel || {})) seenChannels[key] = count;
    for (const [key, count] of Object.entries(data.counts?.by_route || {})) seenRoutes[key] = count;
    const ids = new Set(rows.value.map((row) => row.id));
    selected.value = new Set([...selected.value].filter((id) => ids.has(id)));
    cursor.value = Math.min(cursor.value, Math.max(rows.value.length - 1, 0));
  } catch (err) {
    if (mine === loads) loadError.value = extractApiMessage(err, t("leads.approvals.load_error"));
  } finally {
    if (mine === loads) {
      loading.value = false;
      loaded.value = true;
    }
  }
}
const reload = () => load(1);
const loadMore = () => load(page.value + 1);

async function loadLog(nextPage = 1) {
  logError.value = "";
  try {
    const { data } = await GET_ApprovalsLog({ page: nextPage, page_size: 20 });
    log.value = nextPage > 1 ? [...log.value, ...data.results] : data.results;
    logNext.value = data.next;
    logPage.value = nextPage;
  } catch (err) {
    logError.value = extractApiMessage(err, t("leads.approvals.load_error"));
  } finally {
    logLoaded.value = true;
  }
}

function toggle(id, on) {
  const copy = new Set(selected.value);
  if (on) copy.add(id);
  else copy.delete(id);
  selected.value = copy;
}
function selectAll(on) {
  selected.value = on ? new Set(rows.value.filter((row) => !hasBlocker(row)).map((row) => row.id)) : new Set();
}
function togglePreview(id) {
  const copy = new Set(open.value);
  if (copy.has(id)) copy.delete(id);
  else copy.add(id);
  open.value = copy;
}

const chunks = (ids) => Array.from({ length: Math.ceil(ids.length / BULK_MAX) }, (_, i) => ids.slice(i * BULK_MAX, (i + 1) * BULK_MAX));

// Approve sends the rows without a blocker, reject all of them; one id never blocks the rest (the API answers per id).
async function run(action) {
  if (busy.value) return;
  const ids = action === "approve" ? targets.value.approvable : targets.value.all;
  if (!ids.length) return;
  busy.value = true;
  acting.value = action;
  result.value = "";
  failedNow.value = [];
  Object.keys(failures).forEach((key) => delete failures[key]);
  let done = 0;
  const failed = {};
  try {
    for (const part of chunks(ids)) {
      const { data } = await POST_ApprovalsBulk(action, part, action === "reject" ? reason.value.trim() : "");
      done += data.done.length;
      Object.assign(failed, data.failed || {});
    }
    result.value = t(`leads.approvals.done_${action}`, { count: done });
  } catch (err) {
    result.value = extractApiMessage(err, t("leads.review.error"));
  } finally {
    busy.value = false;
    acting.value = "";
    rejecting.value = false;
    reason.value = "";
  }
  failedNow.value = failedList(failed);
  for (const item of failedNow.value) failures[item.id] = item.reason;
  selected.value = new Set();
  await Promise.all([load(1), approvals.refresh()]);
}

function onKey(event) {
  if (view.value !== "waiting" || rejecting.value) return;
  const action = approvalKey(event);
  if (!action) return;
  const row = rows.value[cursor.value];
  if (action === "next") cursor.value = Math.min(cursor.value + 1, rows.value.length - 1);
  else if (action === "prev") cursor.value = Math.max(cursor.value - 1, 0);
  else if (!row) return;
  else if (action === "toggle") toggle(row.id, !selected.value.has(row.id));
  else if (action === "preview") togglePreview(row.id);
  else if (action === "approve" || action === "reject") {
    if (!selected.value.size) toggle(row.id, true);
    if (action === "approve") run("approve");
    else rejecting.value = true;
  } else return;
  event.preventDefault();
  scrollToCursor();
}

function scrollToCursor() {
  requestAnimationFrame(() => document.querySelector(".approval--cursor")?.scrollIntoView?.({ block: "nearest" }));
}

watch(
  () => [filters.q, filters.template],
  () => debounced(reload)
);
watch(view, (value) => {
  if (value === "log" && !logLoaded.value) loadLog(1);
});

onMounted(() => {
  load(1);
  window.addEventListener("keydown", onKey);
});
onBeforeUnmount(() => window.removeEventListener("keydown", onKey));
</script>

<style lang="scss" scoped>
@import "@/assets/scss/utils/media-query";

.approvals {
  max-width: 1100px;
  padding-bottom: var(--space-12);
}
.approvals__filters {
  display: grid;
  grid-template-columns: 2fr repeat(4, minmax(0, 1fr));
  gap: var(--space-3);
}
.approvals__list,
.approvals__log {
  list-style: none;
  padding: 0;
}
.approval {
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: var(--space-4);
  padding: var(--space-3) var(--space-4);
  border-bottom: 1px solid var(--border-subtle);
  border-left: 3px solid transparent;
  min-width: 0;
}
.approval--cursor {
  border-left-color: var(--focus-ring);
  background: var(--surface-raised);
}
.approval--selected {
  background: var(--accent-subtle);
}
.approval__main {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  min-width: 0;
}
.approval__who {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-1) var(--space-3);
}
.approval__to,
.approval__subject {
  overflow-wrap: anywhere;
}
.approval__meta {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-1) var(--space-4);
}
.approval__preview {
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  margin: var(--space-2) 0 0;
  padding: var(--space-3);
  background: var(--surface-raised);
  border-radius: var(--radius-base);
  font-family: inherit;
  font-size: var(--fs-300);
}
.approval__tools {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: var(--space-2);
}
.approvals__more {
  align-self: flex-start;
}
.approvals__bar {
  position: sticky;
  bottom: calc(var(--bottom-bar-height, 0px) + var(--space-3));
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--space-3) var(--space-5);
  padding: var(--space-3) var(--space-5);
  background: var(--surface-raised);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-base);
  box-shadow: var(--shadow-md);
  z-index: 5;
}
.approvals__actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
  margin-left: auto;
}
.approvals__failed {
  padding-left: var(--space-5);
}
.log-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-2) var(--space-4);
  padding: var(--space-3) 0;
  border-bottom: 1px solid var(--border-subtle);
}
@include max-tablet {
  .approvals__filters {
    grid-template-columns: 1fr 1fr;
  }
  .approvals__filters > :first-child {
    grid-column: 1 / -1;
  }
  .approvals__keys {
    display: none;
  }
}
@media (hover: none) {
  .approvals__keys {
    display: none;
  }
}
</style>
