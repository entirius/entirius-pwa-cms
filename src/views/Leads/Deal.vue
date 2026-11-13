<template>
  <PageLayout data-testid="leads-deal">
    <template #header>
      <PageHeader :title="deal?.title || $t('leads.deals.title')" wrap-title :back="{ name: 'LeadsDeals' }">
        <template v-if="deal" #meta>
          <StatusBadge :tone="dealKindTone(deal.stage.kind)" :label="dealKindLabel(deal.stage.kind)" data-testid="deal-kind" />
          <router-link class="t-accent" :to="{ name: 'LeadsThread', params: { id: deal.company.id } }" data-testid="deal-company">
            {{ deal.company.name || deal.company.domain }}
          </router-link>
          <BasicSelect
            class="deal__stage"
            :model-value="deal.stage.key"
            :options="stageOptions(stages)"
            :floating-label="isDesktop ? $t('leads.deal.stage') : undefined"
            :aria-label="$t('leads.deal.stage')"
            :disabled="readonly"
            data-testid="deal-move-stage"
            @update:model-value="move(deal, $event)"
          />
        </template>
        <template v-if="deal" #actions>
          <ActionBar :actions="actions" />
        </template>
      </PageHeader>
    </template>
    <EmptyState v-if="loadError" icon="empty" size="md" :title="loadError" data-testid="deal-not-found">
      <router-link class="t-accent" :to="{ name: 'LeadsDeals' }">{{ $t("leads.deals.title") }}</router-link>
    </EmptyState>
    <Loader v-else-if="!deal" block />
    <div v-else class="flex-column gap-8">
      <p v-if="deal.stage.kind === 'lost' && deal.lost_reason" class="m-0" data-testid="deal-lost-line">
        {{ $t("leads.deal.lost_reason_line", { reason: deal.lost_reason }) }}
      </p>
      <p v-if="deal.stage.kind === 'open' && !closable" class="t-warning m-0" data-testid="deals-cannot-close">{{ $t("leads.deals.cannot_close") }}</p>
      <DealDetails :deal="deal" :contacts="contacts" :fields="fields" @saved="deal = $event" />
      <ReadonlyArea v-if="tasksOn" :area="AREAS.TODO_TASKS">
        <TasksTab :key="deal.id" :company="company" :deal="deal" />
      </ReadonlyArea>
      <BasicCard :title="$t('leads.deal.history')" data-testid="deal-history">
        <ul class="deal__events flex-column gap-2 m-0">
          <li v-for="entry in history" :key="entry.id" data-testid="timeline-event">
            <span class="t-muted">{{ formatTime(entry.created_at) }}</span> {{ entry.text }}
          </li>
        </ul>
      </BasicCard>
    </div>
    <LostReasonDialog :move="lost" :stages="stages" @submit="submitLost" @cancel="cancelLost" />
    <ConfirmDialog
      :open="deleting"
      tone="danger"
      :title="$t('leads.deal.delete')"
      :message="$t('leads.deal.delete_confirm', { title: deal?.title || '' })"
      :confirm-label="$t('leads.common.delete')"
      :cancel-label="$t('leads.common.keep')"
      confirm-testid="deal-delete-confirm"
      @confirm="remove"
      @cancel="deleting = false"
    />
  </PageLayout>
</template>

<script setup>
import { computed, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { t } from "@/i18n";
import { DELETE_Deal, GET_Attributes, GET_Company, GET_Deal, GET_DealActivities, GET_DealStages } from "@/api/leads/api";
import { extractApiMessage } from "@/composables/useFormErrors";
import { useIsDesktop } from "@/composables/useIsDesktop";
import { ReadonlyArea, usePageReadonly } from "@/composables/useReadonly";
import { AREAS } from "@/configs/areas";
import { useAccessStore } from "@/stores/access";
import { useMuninStore } from "@/stores/munin";
import { useNotifyStore } from "@/stores/notify";
import { formatTime } from "@/utils/leadsTime";
import DealDetails from "./DealDetails.vue";
import LostReasonDialog from "./LostReasonDialog.vue";
import TasksTab from "./tabs/TasksTab.vue";
import { fieldsFromDefinitions } from "./customFields";
import { canClose, contactOptions, dealHistoryText, dealKindLabel, dealKindTone, firstStage, stageOptions } from "./deals";
import { useDealMove } from "./useDealMove";

// Deal card (ux/screens/deal-card.md): kind, company and stage in the header; Mark won (primary), Mark lost (the reason
// dialog), delete for an open deal, Reopen for a closed one; Details, Tasks (django-todo) and History below.
const route = useRoute();
const router = useRouter();
const notify = useNotifyStore();
const munin = useMuninStore();
const access = useAccessStore();
const isDesktop = useIsDesktop();
const readonly = usePageReadonly();
const deal = ref(null);
const loadError = ref("");
const stages = ref([]);
const company = ref({ id: null, name: "", contacts: [] });
const definitions = ref([]);
const activities = ref([]);
const deleting = ref(false);
const { lost, move, submitLost, cancelLost } = useDealMove(stages, { moved: afterMove });

const tasksOn = computed(() => munin.isModuleInstalled("todo") && access.can(AREAS.TODO_TASKS));
const fields = computed(() => fieldsFromDefinitions(definitions.value));
const contacts = computed(() => contactOptions(company.value.contacts));
const closable = computed(() => canClose(stages.value));
const history = computed(() => activities.value.map((entry) => ({ ...entry, text: dealHistoryText(entry, stages.value) })));
const actions = computed(() => (deal.value.stage.kind === "open" ? openActions() : [closedAction()].filter(Boolean)));

function openActions() {
  const won = firstStage(stages.value, "won");
  const lostStage = firstStage(stages.value, "lost");
  return [
    { key: "delete", label: t("leads.deal.delete"), role: "utility", icon: "delete", variant: "danger", mutates: true, testid: "deal-delete", onClick: () => (deleting.value = true) },
    lostStage && { key: "lost", label: t("leads.deal.mark_lost"), role: "secondary", mutates: true, testid: "deal-mark-lost", onClick: () => move(deal.value, lostStage.key) },
    won && { key: "won", label: t("leads.deal.mark_won"), role: "primary", mutates: true, testid: "deal-mark-won", onClick: () => move(deal.value, won.key) },
  ].filter(Boolean);
}

// Reopen goes to the first open stage; without one (or without the stages) it is not offered.
function closedAction() {
  const target = firstStage(stages.value, "open");
  if (!target) return null;
  const reopen = () => move(deal.value, target.key);
  return { key: "reopen", label: t("leads.deal.reopen"), role: "secondary", mutates: true, testid: "deal-reopen", onClick: reopen };
}

const KIND_TOASTS = { won: "leads.deal.won_toast", lost: "leads.deal.lost_toast" };

function afterMove(data) {
  deal.value = data;
  if (KIND_TOASTS[data.stage.kind]) notify.spawnNotification({ msg: t(KIND_TOASTS[data.stage.kind]), type: "positive" });
  loadHistory();
}

async function loadHistory() {
  activities.value = (await GET_DealActivities(deal.value.id).catch(() => ({ data: { results: [] } }))).data.results;
}

// Everything around the deal is optional: without it the card shows less, never fails.
async function loadAround() {
  const [stageRes, companyRes, attrRes] = await Promise.allSettled([GET_DealStages(), GET_Company(deal.value.company.id), GET_Attributes("deal")]);
  if (stageRes.status === "fulfilled") stages.value = stageRes.value.data.results;
  if (companyRes.status === "fulfilled") company.value = companyRes.value.data;
  else company.value = { id: deal.value.company.id, name: deal.value.company.name, contacts: [] };
  if (attrRes.status === "fulfilled") definitions.value = attrRes.value.data.results;
  await loadHistory();
}

async function open(id) {
  deal.value = null;
  loadError.value = "";
  try {
    deal.value = (await GET_Deal(id)).data;
  } catch (err) {
    loadError.value = err?.httpStatus === 404 ? t("leads.deal.not_found") : extractApiMessage(err, t("leads.common.error"));
    return;
  }
  await loadAround();
}

async function remove() {
  deleting.value = false;
  try {
    await DELETE_Deal(deal.value.id);
    router.push({ name: "LeadsDeals" });
  } catch (err) {
    notify.spawnNotification({ msg: extractApiMessage(err, t("leads.common.error")), type: "negative" });
  }
}

// Only this route's id: leaving for a company card (also `:id`) must not load a deal of that number.
watch(() => route.params.id, (id) => route.name === "LeadsDeal" && id && open(id), { immediate: true });
</script>

<style scoped>
.deal__stage {
  width: 14rem;
}
.deal__events {
  padding-left: var(--space-4);
}
</style>
