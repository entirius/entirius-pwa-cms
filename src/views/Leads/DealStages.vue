<template>
  <PageLayout data-testid="leads-deal-stages">
    <template #header>
      <PageHeader :title="$t('leads.deal_stages.title')" :description="$t('leads.deal_stages.description')" :back="{ name: 'LeadsSettings' }">
        <template v-if="!loading && stages.length" #actions>
          <StatusBadge v-if="anyDirty" tone="warning" :dot="false" :label="$t('unsaved.changes')" data-testid="deal-stages-unsaved" />
          <ActionBar :actions="actions" />
        </template>
      </PageHeader>
    </template>
    <Loader v-if="loading" block />
    <div v-else class="flex-column gap-8">
      <p v-if="stages.length && !closable" class="t-warning m-0" data-testid="deal-stages-cannot-close">{{ $t("leads.deals.cannot_close") }}</p>
      <BasicCard :title="$t('leads.deal_stages.stages')">
        <EmptyState v-if="!stages.length" icon="empty" size="sm" :title="$t('leads.deal_stages.empty')" data-testid="deal-stages-empty" />
        <div v-else class="flex-column gap-3">
          <template v-for="(element, index) in stages" :key="element.id">
            <div class="stage" :data-key="element.key" data-testid="deal-stage-row">
              <FormField :label="$t('leads.deal_stages.label')">
                <BasicInput v-model="element.label" :maxlength="128" data-testid="deal-stage-label" />
              </FormField>
              <FormField :label="$t('leads.deal_stages.kind')">
                <BasicSelect v-model="element.kind" :options="kinds" data-testid="deal-stage-kind" />
              </FormField>
              <div class="stage__controls">
                <IconButton mutates icon="moveUp" variant="outline" :label="$t('leads.stages.up')" :disabled="index === 0" data-testid="deal-stage-up" @click="shift(index, -1)" />
                <IconButton mutates icon="moveDown" variant="outline" :label="$t('leads.stages.down')" :disabled="index === stages.length - 1" data-testid="deal-stage-down" @click="shift(index, 1)" />
                <IconButton mutates icon="delete" variant="danger" :label="$t('leads.stages.delete')" data-testid="deal-stage-delete" @click="askDelete(element)" />
              </div>
              <p v-if="errors[element.id]" class="stage__error t-negative m-0" data-testid="deal-stage-error">{{ errors[element.id] }}</p>
            </div>
          </template>
        </div>
      </BasicCard>
      <BasicCard v-if="!readonly" :title="$t('leads.deal_stages.add_title')">
        <form class="flex ai-st flex-wrap gap-5" @submit.prevent="add">
          <FormField :label="$t('leads.deal_stages.key')" required :error="errors.key || ''">
            <BasicInput v-model="draft.key" format="key" :maxlength="64" data-testid="deal-stage-new-key" />
          </FormField>
          <FormField :label="$t('leads.deal_stages.label')" required :error="errors.label || ''">
            <BasicInput v-model="draft.label" :maxlength="128" data-testid="deal-stage-new-label" />
          </FormField>
          <FormField :label="$t('leads.deal_stages.kind')">
            <BasicSelect v-model="draft.kind" :options="kinds" data-testid="deal-stage-new-kind" />
          </FormField>
          <BasicButton class="stage__submit" mutates type="submit" data-testid="deal-stage-add">{{ $t("leads.deal_stages.add") }}</BasicButton>
        </form>
        <p v-if="errors.add" class="t-negative m-0" data-testid="deal-stage-add-error">{{ errors.add }}</p>
      </BasicCard>
    </div>
    <!-- T8 (walk 4): the dialog says up front whether the stage can go — with deals only Close -->
    <BasicModal
      :open="Boolean(confirming)"
      :title="$t('leads.stages.delete')"
      size="sm"
      :actions="deleteActions"
      data-testid="deal-stage-delete-dialog"
      @update:open="confirming = null"
    >
      <p class="m-0" data-testid="deal-stage-delete-message">{{ deleteMessage }}</p>
    </BasicModal>
  </PageLayout>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from "vue";
import { t } from "@/i18n";
import { DELETE_DealStage, GET_Deals, GET_DealStages, PATCH_DealStage, POST_DealStage } from "@/api/leads/api";
import { apiFieldErrors, missingFields } from "@/utils/leadsForm";
import { extractApiMessage } from "@/composables/useFormErrors";
import { usePageReadonly } from "@/composables/useReadonly";
import { useUnsavedChanges } from "@/composables/useUnsavedChanges";
import { useNotifyStore } from "@/stores/notify";
import { canClose, stageKindOptions } from "./deals";
import { pluralKey } from "@/utils/plural";
import { saveAction } from "./saveAction";

// Settings → Deal stages (ux/screens/settings-deal-stages.md, modelled on Stages.vue): label and kind per row with a
// one page Save for the changed rows (a toast says it landed), order by up/down (one PATCH per moved row), delete
// with the 409 inline. Kind shows once (the select), order changes one way (the arrows).
const ORDER_STEP = 10;
const notify = useNotifyStore();
const readonly = usePageReadonly();
const stages = ref([]);
const loading = ref(true);
const errors = reactive({});
const draft = reactive({ key: "", label: "", kind: "open" });
const confirming = ref(null);
const saved = ref({}); // id → { label, kind } as the server holds them
const saving = ref(false);

const kinds = stageKindOptions();
const deleteMessage = computed(() => {
  const { stage, count } = confirming.value || {};
  if (count === null) return t("leads.deal_stages.delete_confirm", { label: stage?.label || "" });
  return count ? t(`leads.deal_stages.delete_busy_${pluralKey(count)}`, { count }) : t("leads.deal_stages.delete_empty");
});
const deleteActions = computed(() =>
  confirming.value?.count
    ? [{ key: "close", label: t("common.close"), role: "secondary", testid: "deal-stage-delete-close", onClick: () => (confirming.value = null) }]
    : [
        { key: "keep", label: t("leads.common.keep"), role: "secondary", onClick: () => (confirming.value = null) },
        { key: "delete", label: t("leads.common.delete"), role: "danger", mutates: true, testid: "deal-stage-delete-confirm", onClick: remove },
      ]
);
const closable = computed(() => canClose(stages.value));
const dirty = (stage) => saved.value[stage.id] && (saved.value[stage.id].label !== stage.label || saved.value[stage.id].kind !== stage.kind);
// The page's unsaved state (badge, Save, the browser's leave prompt) is the stage list against the server's.
const { snapshot, track, isDirty: anyDirty } = useUnsavedChanges();
const actions = computed(() => [
  saveAction({ dirty: anyDirty.value, saving: saving.value, testid: "deal-stages-save", onClick: saveAll }),
]);

// A reload (after a move, a delete or an add) keeps the label and kind edits not saved yet.
async function load() {
  const pending = Object.fromEntries(stages.value.filter(dirty).map(({ id, label, kind }) => [id, { label, kind }]));
  try {
    const fresh = (await GET_DealStages()).data.results;
    saved.value = Object.fromEntries(fresh.map(({ id, label, kind }) => [id, { label, kind }]));
    snapshot(fresh);
    stages.value = fresh.map((stage) => ({ ...stage, ...pending[stage.id] }));
    track(stages.value);
  } finally {
    loading.value = false;
  }
}

async function attempt(errorKey, call, conflictKey = "") {
  delete errors[errorKey];
  try {
    await call();
    return true;
  } catch (err) {
    const conflict = conflictKey && err?.httpStatus === 409;
    errors[errorKey] = conflict ? t(conflictKey) : extractApiMessage(err, t("leads.common.error"));
    return false;
  }
}

async function saveRow(stage) {
  const body = { label: stage.label.trim(), kind: stage.kind };
  const ok = await attempt(stage.id, () => PATCH_DealStage(stage.id, body));
  if (!ok) return false;
  stage.label = body.label;
  saved.value = { ...saved.value, [stage.id]: { ...body } };
  return true;
}

// Every changed row, one PATCH each; a refused row keeps its error inline and the toast comes only when all landed.
async function saveAll() {
  saving.value = true;
  const results = [];
  try {
    for (const stage of stages.value.filter(dirty)) results.push(await saveRow(stage));
  } finally {
    saving.value = false;
  }
  if (!results.every(Boolean)) return;
  snapshot(stages.value);
  notify.spawnNotification({ msg: t("leads.deal_stages.saved"), type: "positive" });
}

// Renumbers in steps of 10, one PATCH at a time; the first refusal stops the run and reloads the server order.
async function saveOrder() {
  const moved = stages.value.map((stage, index) => ({ stage, order: index * ORDER_STEP })).filter(({ stage, order }) => stage.order !== order);
  try {
    for (const { stage, order } of moved) await PATCH_DealStage(stage.id, { order });
  } catch (err) {
    notify.spawnNotification({ msg: extractApiMessage(err, t("leads.stages.order_failed")), type: "negative" });
  }
  await load();
}

function shift(index, delta) {
  const [stage] = stages.value.splice(index, 1);
  stages.value.splice(index + delta, 0, stage);
  return saveOrder();
}

// The deals of the stage, archived ones too (the API refuses while any stands there); null = could not count.
async function dealsIn(stage) {
  const count = (archived) => GET_Deals({ stage: stage.key, archived, page_size: 1 }).then(({ data }) => data.count || 0);
  return Promise.all([count(false), count(true)]).then(([open, archived]) => open + archived, () => null);
}

// One count at a time: a second click while the first is read opens nothing more.
let counting = false;
async function askDelete(stage) {
  if (counting) return;
  counting = true;
  try {
    confirming.value = { stage, count: await dealsIn(stage) };
  } finally {
    counting = false;
  }
}

async function remove() {
  const { stage } = confirming.value;
  confirming.value = null;
  if (await attempt(stage.id, () => DELETE_DealStage(stage.id), "leads.deal_stages.in_use")) await load();
}

// T7 (walk 4): an empty field is named before the request. A taken key (409) shows on Key; a field error of the API on
// its field in words; any other refusal under the card.
async function add() {
  ["key", "label", "add"].forEach((key) => delete errors[key]);
  Object.assign(errors, missingFields(draft, ["key", "label"]));
  if (errors.key || errors.label) return;
  const order = Math.max(-ORDER_STEP, ...stages.value.map((stage) => stage.order)) + ORDER_STEP;
  try {
    await POST_DealStage({ key: draft.key, label: draft.label.trim(), kind: draft.kind, order });
    Object.assign(draft, { key: "", label: "", kind: "open" });
    await load();
  } catch (err) {
    refusedNew(err);
  }
}

function refusedNew(err) {
  const fields = err?.httpStatus === 409 ? { key: t("leads.form.api.taken") } : apiFieldErrors(err, ["key", "label"]);
  Object.assign(errors, fields);
  if (!Object.keys(fields).length) errors.add = extractApiMessage(err, t("leads.common.error"));
}

onMounted(load);
</script>

<style lang="scss" scoped>
@import "@/assets/scss/utils/media-query";

.stage {
  display: grid;
  grid-template-columns: minmax(8rem, 1fr) minmax(0, 12rem) auto;
  align-items: end;
  gap: var(--space-5);
}
.stage__controls {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}
.stage__submit {
  margin-top: var(--space-5);
}
.stage__error {
  grid-column: 1 / -1;
}
/* Below tablet: the fields stack, the controls under them, right-aligned */
@include max-tablet {
  .stage {
    grid-template-columns: minmax(0, 1fr);
    row-gap: var(--space-2);
  }
  .stage__controls {
    justify-content: flex-end;
    flex-wrap: wrap;
  }
}
</style>
