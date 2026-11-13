<template>
  <PageLayout data-testid="leads-automatic-moves">
    <template #header>
      <PageHeader :title="$t('leads.moves.title')" :back="{ name: 'LeadsSettings' }" :description="$t('leads.moves.description')">
        <template v-if="!loading" #actions>
          <StatusBadge v-if="isDirty" tone="warning" :dot="false" :label="$t('unsaved.changes')" />
          <ActionBar :actions="actions" />
        </template>
      </PageHeader>
    </template>

    <Loader v-if="loading" block />
    <p v-else-if="error" class="t-negative m-0" role="alert" data-testid="moves-error">{{ error }}</p>
    <div v-else class="flex-column gap-8">
      <p v-if="!stages.length" class="m-0" data-testid="moves-no-stages">
        {{ $t("leads.moves.no_stages") }} ·
        <router-link :to="{ name: 'LeadsStages' }" class="t-accent">{{ $t("nav.leads_stages") }}</router-link>
      </p>
      <BasicCard v-for="event in EVENTS" :key="event" :title="eventTitle(event)" data-testid="moves-card" :data-event="event">
        <template v-if="typeOf(event) || canReset(event)" #actions>
          <div class="flex ai-ct gap-3">
            <StatusBadge v-if="typeOf(event)" :tone="replyTone(typeOf(event))" :label="$t(`leads.reply_type.${typeOf(event)}`)" />
            <BasicButton v-if="canReset(event)" mutates data-testid="moves-default" @click="useDefault(event)">{{ $t("leads.moves.use_default") }}</BasicButton>
          </div>
        </template>
        <div class="form-grid">
          <FormField :label="$t('leads.moves.move_to')">
            <BasicSelect v-model="cards[event].target" :options="targetOptions(event, stages)" :disabled="!stages.length" data-testid="moves-target" />
          </FormField>
          <BasicSwitch v-model="cards[event].forward_only" :label="$t('leads.moves.forward_only')" :disabled="!stages.length" data-testid="moves-forward" />
          <ReadonlyArea v-if="plans[typeOf(event)]" :area="AREAS.COMMUNICATOR_SETTINGS">
            <div class="form-grid__wide form-grid">
            <FormField :label="$t('leads.moves.sequence')">
              <BasicInput v-if="typeOf(event) === 'unsubscribe'" readonly :model-value="$t('leads.moves.seq_unsubscribe')" data-testid="moves-sequence" />
              <BasicSelect v-else v-model="plans[typeOf(event)].sequence" :options="sequenceOptions(typeOf(event))" data-testid="moves-sequence" />
            </FormField>
            <FormField :label="$t('leads.moves.alert')">
              <BasicSelect v-model="plans[typeOf(event)].notify" :options="alertOptions()" data-testid="moves-alert" />
            </FormField>
            <BasicCheckbox v-model="plans[typeOf(event)].needs_review" data-testid="moves-needs-review">{{ $t("leads.moves.needs_review") }}</BasicCheckbox>
            </div>
          </ReadonlyArea>
          <p v-if="cardErrors[event]" class="form-grid__wide t-negative m-0" role="alert">{{ cardErrors[event] }}</p>
        </div>
      </BasicCard>
    </div>
  </PageLayout>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from "vue";
import { t } from "@/i18n";
import { DELETE_ReplyClassPlan, GET_ReplyClassPlans, PUT_ReplyClassPlan } from "@/api/communicator/api";
import { DELETE_StageEvent, GET_StageEvents, GET_Stages, PUT_StageEvent } from "@/api/leads/api";
import { AREAS } from "@/configs/areas";
import { extractApiMessage } from "@/composables/useFormErrors";
import { ReadonlyArea } from "@/composables/useReadonly";
import { useUnsavedChanges } from "@/composables/useUnsavedChanges";
import { resetReplyPlans } from "@/utils/leadsReplyPlans";
import { useAccessStore } from "@/stores/access";
import { useMuninStore } from "@/stores/munin";
import { useNotifyStore } from "@/stores/notify";
import { outboundOn, replyTone } from "@/utils/leadsOutbound";
import {
  EVENTS, alertOptions, changed, eventTitle, planBody, sequenceOptions, stageBody, stagePart, targetOptions, typeOf,
} from "./automaticMoves";

// What happens on its own: the stage a company moves to per event (leads), and per reply type what happens to the
// sequence, the alert and the review flag (communicator, shown only with communicator >= 0.5.0 and read on its
// settings). One Save sends one request per changed event and plan, then reloads; a failed card keeps its error.
const munin = useMuninStore();
const access = useAccessStore();
const notify = useNotifyStore();
const loading = ref(true);
const error = ref("");
const saving = ref(false);
const stages = ref([]);
const entries = ref({}); // event → API entry
const cards = reactive({});
const plans = reactive({}); // type → editable plan
const storedPlans = ref({}); // type → API plan
const cardErrors = reactive({});
const savedCards = ref({});

const withPlans = computed(() => outboundOn(munin, "communicator") && access.can(AREAS.COMMUNICATOR_SETTINGS));
const { snapshot, track, isDirty } = useUnsavedChanges();
track(reactive({ cards, plans }));
const actions = computed(() => [
  { key: "save", role: "primary", label: t("common.save"), loading: saving.value, testid: "moves-save", onClick: save },
]);

const planSnapshot = () => Object.fromEntries(Object.entries(storedPlans.value).map(([type, plan]) => [type, planBody(plan)]));
const canReset = (event) => entries.value[event]?.configured || storedPlans.value[typeOf(event)]?.is_default === false;

async function loadPlans() {
  if (!withPlans.value) return {};
  const { data } = await GET_ReplyClassPlans();
  return Object.fromEntries((data.results || []).map((plan) => [plan.intent, plan]));
}

// The edits of the cards in `keep` survive the reload (a card whose save failed, the other cards on "Use default").
const clone = (value) => (value === undefined ? undefined : JSON.parse(JSON.stringify(value)));

function restore(kept) {
  for (const { event, card, plan } of kept) {
    cards[event] = card;
    if (plan) plans[typeOf(event)] = plan;
  }
}

async function load(keep = []) {
  error.value = "";
  const kept = keep.map((event) => ({ event, card: clone(cards[event]), plan: clone(plans[typeOf(event)]) }));
  try {
    const [events, stageList, planMap] = await Promise.all([GET_StageEvents(), GET_Stages(), loadPlans()]);
    stages.value = stageList.data.results || [];
    entries.value = Object.fromEntries((events.data.results || []).map((entry) => [entry.event, entry]));
    EVENTS.forEach((event) => (cards[event] = stagePart(entries.value[event])));
    savedCards.value = JSON.parse(JSON.stringify(cards));
    storedPlans.value = planMap;
    Object.keys(plans).forEach((type) => delete plans[type]);
    Object.entries(planMap).forEach(([type, plan]) => (plans[type] = planBody(plan)));
    snapshot({ cards: savedCards.value, plans: planSnapshot() });
    restore(kept);
  } catch (err) {
    error.value = extractApiMessage(err, t("leads.moves.load_error"));
  } finally {
    loading.value = false;
  }
}

// The requests of one card: its stage part and its plan, each only when it changed.
function requestsOf(event) {
  const calls = [];
  if (changed(cards[event], savedCards.value[event])) {
    const body = stageBody(cards[event]);
    if (body) calls.push(() => PUT_StageEvent(event, body));
    else if (entries.value[event]?.configured) calls.push(() => DELETE_StageEvent(event));
  }
  const type = typeOf(event);
  if (plans[type] && changed(plans[type], planBody(storedPlans.value[type]))) calls.push(() => PUT_ReplyClassPlan(type, plans[type]));
  return calls;
}

async function runCard(event, calls) {
  delete cardErrors[event];
  try {
    for (const call of calls) await call();
    return true;
  } catch (err) {
    cardErrors[event] = extractApiMessage(err, t("leads.common.error"));
    return false;
  }
}

async function save() {
  saving.value = true;
  const results = await Promise.all(EVENTS.map((event) => runCard(event, requestsOf(event))));
  const failed = results.filter((ok) => !ok).length;
  if (failed) notify.spawnNotification({ msg: t("leads.moves.partial", { n: failed }), type: "negative" });
  saving.value = false;
  resetReplyPlans(); // the conversation's "Next" line reads the plans again
  await load(EVENTS.filter((event, i) => !results[i]));
}

async function useDefault(event) {
  const type = typeOf(event);
  const calls = [];
  if (entries.value[event]?.configured) calls.push(() => DELETE_StageEvent(event));
  if (storedPlans.value[type]?.is_default === false) calls.push(() => DELETE_ReplyClassPlan(type));
  if (!(await runCard(event, calls))) return;
  resetReplyPlans();
  await load(EVENTS.filter((other) => other !== event));
}

onMounted(load);
</script>
