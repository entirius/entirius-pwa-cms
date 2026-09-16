<template>
  <div class="ld-page" data-testid="leads-stages">
    <p class="ld-muted" data-testid="stages-help">{{ $t("leads.stages.help") }}</p>
    <draggable :list="stages" item-key="id" handle=".stage__handle" class="ld-field" @end="saveOrder">
      <template #item="{ element, index }">
        <div class="stage" :data-stage="element.key" data-testid="stage-row">
          <FontAwesomeIcon icon="grip-vertical" class="stage__handle" />
          <input v-model="element.label" class="ld-input" :aria-label="$t('leads.stages.label')" @change="rename(element)" />
          <span class="stage__tags">
            <span class="ld-badge stage__key" :title="$t('leads.stages.key_help')">
              {{ element.key }} · {{ stageKindLabel(element.kind) }}
            </span>
            <span
              v-if="rulesByStage[element.id]"
              class="ld-badge"
              :title="rulesText(rulesByStage[element.id])"
              data-testid="stage-rules"
            >
              {{ $t(`leads.board.rules_${pluralKey(rulesByStage[element.id].length)}`, { count: rulesByStage[element.id].length }) }}
            </span>
          </span>
          <div class="stage__controls">
            <button class="ld-btn" :disabled="index === 0" :aria-label="$t('leads.stages.up')" @click="shift(index, -1)">
              <FontAwesomeIcon icon="arrow-up" />
            </button>
            <button
              class="ld-btn"
              :disabled="index === stages.length - 1"
              :aria-label="$t('leads.stages.down')"
              @click="shift(index, 1)"
            >
              <FontAwesomeIcon icon="arrow-down" />
            </button>
            <button class="ld-btn ld-btn--danger" data-testid="stage-delete" @click="askDelete(element)">
              <FontAwesomeIcon icon="trash" /> {{ $t("leads.stages.delete") }}
            </button>
          </div>
          <p v-if="errors[element.id]" class="ld-error" data-testid="stage-error">{{ errors[element.id] }}</p>
        </div>
      </template>
    </draggable>
    <form class="ld-row stage__add" data-testid="stage-add" @submit.prevent="add">
      <label class="ld-field">{{ $t("leads.stages.key") }}
        <input v-model="draft.key" class="ld-input" required pattern="[-a-zA-Z0-9_]+" />
        <span class="ld-muted">{{ $t("leads.stages.key_help") }}</span>
      </label>
      <label class="ld-field">{{ $t("leads.stages.label") }}
        <input v-model="draft.label" class="ld-input" required />
        <span class="ld-muted">{{ $t("leads.stages.label_help") }}</span>
      </label>
      <button class="ld-btn ld-btn--primary" type="submit">{{ $t("leads.stages.add") }}</button>
    </form>
    <p v-if="errors.add" class="ld-error">{{ errors.add }}</p>
    <ConfirmSheet
      v-if="confirming"
      :title="$t('leads.stages.delete_title')"
      :message="confirming.message"
      :confirm-label="$t('leads.stages.delete')"
      :cancel-label="$t('leads.review.cancel')"
      @confirm="remove(confirming.stage)"
      @cancel="confirming = null"
    />
  </div>
</template>

<script setup>
import { onMounted, reactive, ref } from "vue";
import draggable from "vuedraggable";
import { t } from "@/i18n";
import { DELETE_Stage, GET_Companies, GET_Rules, GET_Stages, PATCH_Stage, POST_Stage } from "@/api/leads/api";
import { extractApiMessage } from "@/composables/useFormErrors";
import { useNotifyStore } from "@/stores/notify";
import { stageKindLabel } from "@/utils/leadsLabels";
import { pluralKey } from "@/utils/plural";
import ConfirmSheet from "./ConfirmSheet.vue";

// Stages admin: order by drag or up/down (PATCH `order` per moved stage), rename inline, delete with the 409 inline (L-18).
const ORDER_STEP = 10;
const notify = useNotifyStore();
const stages = ref([]);
const errors = reactive({});
const draft = reactive({ key: "", label: "" });
const confirming = ref(null); // { stage, message } while the delete sheet is open
const rulesByStage = ref({});

async function load() {
  stages.value = (await GET_Stages()).data.results;
}

// The rules the Board badges, shown here too (the stages payload carries none).
async function loadRules() {
  const rules = ((await GET_Rules()).data.results || []).filter((rule) => rule.is_active);
  rulesByStage.value = rules.reduce((acc, rule) => ({ ...acc, [rule.stage_id]: [...(acc[rule.stage_id] || []), rule] }), {});
}

const rulesText = (rules) => rules.map((rule) => `${rule.action} ${rule.template_key}`).join("\n");

// The question names how many companies the stage holds — a stage that holds any cannot be deleted.
async function askDelete(stage) {
  const { data } = await GET_Companies({ stage: stage.key, page_size: 1 }).catch(() => ({ data: {} }));
  const count = data.count || 0;
  const key = count ? `leads.stages.delete_busy_${pluralKey(count)}` : "leads.stages.delete_confirm";
  confirming.value = { stage, message: t(key, { label: stage.label, count }) };
}

async function attempt(errorKey, call) {
  delete errors[errorKey];
  try {
    await call();
    return true;
  } catch (err) {
    errors[errorKey] = extractApiMessage(err, t("leads.review.error"));
    return false;
  }
}

// Renumbers in steps of 10, one PATCH at a time; the first refusal stops the run and reloads the server order.
async function saveOrder() {
  const moved = stages.value
    .map((stage, index) => ({ stage, order: index * ORDER_STEP }))
    .filter(({ stage, order }) => stage.order !== order);
  try {
    for (const { stage, order } of moved) await PATCH_Stage(stage.id, { order });
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

const rename = (stage) => attempt(stage.id, () => PATCH_Stage(stage.id, { label: stage.label }));

async function remove(stage) {
  confirming.value = null;
  if (await attempt(stage.id, () => DELETE_Stage(stage.id))) await load();
}

async function add() {
  const order = Math.max(-ORDER_STEP, ...stages.value.map((stage) => stage.order)) + ORDER_STEP;
  if (await attempt("add", () => POST_Stage({ key: draft.key, label: draft.label, order }))) {
    Object.assign(draft, { key: "", label: "" });
    await load();
  }
}

onMounted(() => Promise.all([load(), loadRules().catch(() => {})]));
</script>

<style scoped>
/* A grid, not a flex row: the controls line up down the list whatever the key tag is long. */
.stage {
  display: grid;
  grid-template-columns: auto minmax(8rem, 1fr) minmax(0, 20rem) auto;
  align-items: center;
  gap: var(--space-200);
}
.stage__handle {
  cursor: grab;
}
.stage__tags {
  display: flex;
  gap: var(--space-100);
  min-width: 0;
}
.stage__add {
  align-items: flex-start;
}
.stage__key {
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}
.stage__controls {
  display: flex;
  gap: var(--space-200);
}
.stage .ld-error {
  grid-column: 1 / -1;
}
</style>
