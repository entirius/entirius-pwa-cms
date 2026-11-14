<template>
  <PageLayout data-testid="leads-deal">
    <template #header>
      <PageHeader :title="deal?.title || $t('leads.deals.title')" wrap-title :back="{ name: 'LeadsDeals' }">
        <template v-if="deal" #meta>
          <StatusBadge :tone="dealKindTone(deal.stage.kind)" :label="dealKindLabel(deal.stage.kind)" data-testid="deal-kind" />
          <StatusBadge v-if="deal.archived_at" tone="neutral" :label="$t('leads.deal.archived')" data-testid="deal-archived" />
          <router-link class="t-accent" :to="{ name: 'LeadsThread', params: { id: deal.company.id } }" data-testid="deal-company">
            {{ deal.company.name || deal.company.domain }}
          </router-link>
        </template>
        <!-- open: the more menu (Delete deal) · Mark lost · Mark won, the one primary (N19); closed: the more menu
             (Archive) · Reopen; archived: Restore only -->
        <template v-if="deal" #actions>
          <ActionBar v-if="deal.archived_at" :actions="archivedActions" />
          <ActionBar v-else>
            <BasicMenu v-if="!readonly && moreItems.length" :items="moreItems" :label="$t('leads.company.more')" placement="bottom-end" @select="onMore">
              <template #trigger>
                <IconButton icon="more" variant="outline" :label="$t('leads.company.more')" data-testid="deal-more" />
              </template>
            </BasicMenu>
            <template v-if="deal.stage.kind === 'open'">
              <BasicButton v-if="lostStage" mutates data-testid="deal-mark-lost" @click="move(deal, lostStage.key)">{{ $t("leads.deal.mark_lost") }}</BasicButton>
              <BasicButton v-if="wonStage" variant="primary" mutates data-testid="deal-mark-won" @click="move(deal, wonStage.key)">
                {{ $t("leads.deal.mark_won") }}
              </BasicButton>
            </template>
            <!-- Reopen goes to the first open stage; without one (or without the stages) it is not offered -->
            <BasicButton v-else-if="openStage" mutates data-testid="deal-reopen" @click="move(deal, openStage.key)">{{ $t("leads.deal.reopen") }}</BasicButton>
          </ActionBar>
        </template>
      </PageHeader>
    </template>
    <EmptyState v-if="loadError" icon="empty" size="md" :title="loadError" data-testid="deal-not-found">
      <router-link class="t-accent" :to="{ name: 'LeadsDeals' }">{{ $t("leads.deals.title") }}</router-link>
    </EmptyState>
    <Loader v-else-if="!deal" block />
    <div v-else class="flex-column gap-8">
      <!-- its own labelled line under the title: no label is drawn over the kind badge (N17) -->
      <BasicSelect
        class="deal__stage"
        :model-value="deal.stage.key"
        :options="stageOptions(stages)"
        :floating-label="$t('leads.deal.stage')"
        :aria-label="$t('leads.deal.stage')"
        :disabled="readonly || Boolean(deal.archived_at)"
        data-testid="deal-move-stage"
        @update:model-value="move(deal, $event)"
      />
      <p v-if="deal.stage.kind === 'lost' && deal.lost_reason" class="m-0" data-testid="deal-lost-line">
        {{ $t("leads.deal.lost_reason_line", { reason: deal.lost_reason }) }}
      </p>
      <p v-if="deal.stage.kind === 'open' && !closable" class="t-warning m-0" data-testid="deals-cannot-close">{{ $t("leads.deals.cannot_close") }}</p>
      <DealDetails :deal="deal" :contacts="contacts" :fields="fields" @saved="deal = $event" />
      <ReadonlyArea v-if="tasksOn" :area="AREAS.TODO_TASKS">
        <TasksTab :key="deal.id" :company="company" :deal="deal" />
      </ReadonlyArea>
      <BasicCard :title="$t('leads.deal.history')" gap data-testid="deal-history">
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
import { DELETE_Deal, GET_Attributes, GET_Company, GET_Deal, GET_DealActivities, GET_DealStages, POST_DealArchive, POST_DealRestore } from "@/api/leads/api";
import { extractApiMessage } from "@/composables/useFormErrors";
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
// dialog), delete for an open deal, Reopen and Archive for a closed one, Restore for an archived one (read-only);
// Details, Tasks (django-todo) and History below.
const route = useRoute();
const router = useRouter();
const notify = useNotifyStore();
const munin = useMuninStore();
const access = useAccessStore();
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
const wonStage = computed(() => firstStage(stages.value, "won"));
const lostStage = computed(() => firstStage(stages.value, "lost"));
const openStage = computed(() => firstStage(stages.value, "open"));
const archiving = ref(false);
// An older backend (no `archived_at` in the deal) archives nothing: a closed deal then has no more menu.
const moreItems = computed(() => {
  if (deal.value.stage.kind === "open") return [{ key: "delete", label: t("leads.deal.delete"), danger: true, testid: "deal-delete" }];
  return "archived_at" in deal.value ? [{ key: "archive", label: t("leads.deal.archive"), testid: "deal-archive" }] : [];
});
const restore = () => setArchived(POST_DealRestore, "leads.deal.restored_toast");
const archivedActions = computed(() => [
  { key: "restore", label: t("leads.deal.restore"), role: "primary", mutates: true, loading: archiving.value, testid: "deal-restore", onClick: restore },
]);

function onMore({ key }) {
  if (key === "archive") setArchived(POST_DealArchive, "leads.deal.archived_toast");
  else deleting.value = true;
}

// Archive and Restore answer with the deal: the card stays and turns into its other state; a 409 is said as its sentence.
async function setArchived(call, toast) {
  if (archiving.value) return; // a second click would only earn a 409
  archiving.value = true;
  try {
    deal.value = (await call(deal.value.id)).data;
    notify.spawnNotification({ msg: t(toast), type: "positive" });
    loadHistory();
  } catch (err) {
    notify.spawnNotification({ msg: extractApiMessage(err, t("leads.common.error")), type: "negative" });
  } finally {
    archiving.value = false;
  }
}

function afterMove(data) {
  deal.value = data;
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
  max-width: 14rem;
}
.deal__events {
  padding-left: var(--space-4);
}
</style>
