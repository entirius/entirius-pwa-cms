<template>
  <PageLayout data-testid="leads-deal-stages">
    <template #header>
      <PageHeader :title="$t('leads.deal_stages.title')" :description="$t('leads.deal_stages.description')" :back="{ name: 'LeadsSettings' }" />
    </template>
    <Loader v-if="loading" block />
    <div v-else class="flex-column gap-8">
      <p v-if="stages.length && !closable" class="t-warning m-0" data-testid="deal-stages-cannot-close">{{ $t("leads.deals.cannot_close") }}</p>
      <BasicCard :title="$t('leads.deal_stages.stages')">
        <EmptyState v-if="!stages.length" icon="empty" size="sm" :title="$t('leads.deal_stages.empty')" data-testid="deal-stages-empty" />
        <draggable
          v-else
          :list="stages"
          :disabled="readonly"
          :force-fallback="true"
          fallback-class="drag-ghost"
          item-key="id"
          handle=".stage__handle"
          class="flex-column gap-3"
          @end="saveOrder"
        >
          <template #item="{ element, index }">
            <div class="stage" :data-key="element.key" data-testid="deal-stage-row">
              <FontAwesomeIcon :icon="$icons.drag" class="stage__handle" />
              <FormField :label="$t('leads.deal_stages.label')">
                <BasicInput v-model="element.label" :maxlength="128" data-testid="deal-stage-label" />
              </FormField>
              <FormField :label="$t('leads.deal_stages.kind')">
                <BasicSelect v-model="element.kind" :options="kinds" data-testid="deal-stage-kind" />
              </FormField>
              <div class="stage__controls">
                <StatusBadge :tone="dealKindTone(element.kind)" size="sm" :dot="false" :label="kindLabel(element.kind)" />
                <BasicButton v-if="dirty(element)" mutates size="sm" data-testid="deal-stage-save" @click="saveRow(element)">{{ $t("leads.company.save") }}</BasicButton>
                <IconButton mutates icon="moveUp" variant="outline" :label="$t('leads.stages.up')" :disabled="index === 0" data-testid="deal-stage-up" @click="shift(index, -1)" />
                <IconButton mutates icon="moveDown" variant="outline" :label="$t('leads.stages.down')" :disabled="index === stages.length - 1" data-testid="deal-stage-down" @click="shift(index, 1)" />
                <IconButton icon="delete" variant="danger" :label="$t('leads.stages.delete')" data-testid="deal-stage-delete" @click="confirming = element" />
              </div>
              <p v-if="errors[element.id]" class="stage__error t-negative m-0" data-testid="deal-stage-error">{{ errors[element.id] }}</p>
            </div>
          </template>
        </draggable>
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
    <ConfirmDialog
      :open="Boolean(confirming)"
      tone="danger"
      :title="$t('leads.stages.delete')"
      :message="$t('leads.deal_stages.delete_confirm', { label: confirming?.label || '' })"
      :confirm-label="$t('leads.common.delete')"
      :cancel-label="$t('leads.common.keep')"
      confirm-testid="deal-stage-delete-confirm"
      @confirm="remove(confirming)"
      @cancel="confirming = null"
    />
  </PageLayout>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from "vue";
import draggable from "vuedraggable";
import { t } from "@/i18n";
import { DELETE_DealStage, GET_DealStages, PATCH_DealStage, POST_DealStage } from "@/api/leads/api";
import { extractApiMessage } from "@/composables/useFormErrors";
import { usePageReadonly } from "@/composables/useReadonly";
import { useNotifyStore } from "@/stores/notify";
import { canClose, dealKindTone, stageKindOptions } from "./deals";

// Settings → Deal stages (ux/screens/settings-deal-stages.md, modelled on Stages.vue): label and kind per row with a
// Save while the row is dirty, order by drag or up/down (one PATCH per moved row), delete with the 409 inline.
const ORDER_STEP = 10;
const notify = useNotifyStore();
const readonly = usePageReadonly();
const stages = ref([]);
const loading = ref(true);
const errors = reactive({});
const draft = reactive({ key: "", label: "", kind: "open" });
const confirming = ref(null);
let saved = {}; // id → { label, kind } as the server holds them

const kinds = stageKindOptions();
const kindLabel = (kind) => kinds.find((option) => option.value === kind)?.label || kind;
const closable = computed(() => canClose(stages.value));
const dirty = (stage) => saved[stage.id] && (saved[stage.id].label !== stage.label || saved[stage.id].kind !== stage.kind);

async function load() {
  try {
    stages.value = (await GET_DealStages()).data.results;
    saved = Object.fromEntries(stages.value.map(({ id, label, kind }) => [id, { label, kind }]));
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
  if (await attempt(stage.id, () => PATCH_DealStage(stage.id, body))) saved[stage.id] = { ...body };
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

async function remove(stage) {
  confirming.value = null;
  if (await attempt(stage.id, () => DELETE_DealStage(stage.id), "leads.deal_stages.in_use")) await load();
}

// A refused key (taken: 409, malformed: 400) shows on Key; any other refusal under the card.
async function add() {
  ["key", "label", "add"].forEach((key) => delete errors[key]);
  if (!draft.key) errors.key = t("leads.stages.key_invalid");
  if (!draft.label.trim()) errors.label = t("leads.stages.label_required");
  if (errors.key || errors.label) return;
  const order = Math.max(-ORDER_STEP, ...stages.value.map((stage) => stage.order)) + ORDER_STEP;
  try {
    await POST_DealStage({ key: draft.key, label: draft.label.trim(), kind: draft.kind, order });
    Object.assign(draft, { key: "", label: "", kind: "open" });
    await load();
  } catch (err) {
    const onKey = [400, 409].includes(err?.httpStatus);
    errors[onKey ? "key" : "add"] = extractApiMessage(err, t("leads.common.error"));
  }
}

onMounted(load);
</script>

<style lang="scss" scoped>
@import "@/assets/scss/utils/media-query";

.stage {
  display: grid;
  grid-template-columns: auto minmax(8rem, 1fr) minmax(0, 12rem) auto;
  align-items: end;
  gap: var(--space-5);
}
.stage__handle {
  align-self: center;
  cursor: grab;
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
/* Below tablet: the fields stack beside the handle, the controls under them, right-aligned */
@include max-tablet {
  .stage {
    grid-template-columns: auto minmax(0, 1fr);
    row-gap: var(--space-2);
  }
  .stage > :not(.stage__handle) {
    grid-column: 2;
  }
  .stage__controls {
    justify-content: flex-end;
    flex-wrap: wrap;
  }
}
</style>
