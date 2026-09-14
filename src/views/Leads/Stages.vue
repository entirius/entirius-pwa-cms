<template>
  <div class="ld-page" data-testid="leads-stages">
    <h2 class="ld-title">{{ $t("leads.stages.title") }}</h2>
    <draggable :list="stages" item-key="id" handle=".stage__handle" class="ld-field" @end="saveOrder">
      <template #item="{ element, index }">
        <div class="stage" :data-stage="element.key" data-testid="stage-row">
          <FontAwesomeIcon icon="grip-vertical" class="stage__handle" />
          <input v-model="element.label" class="ld-input" :aria-label="$t('leads.stages.label')" @change="rename(element)" />
          <span class="ld-badge">{{ element.key }} · {{ element.kind }}</span>
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
          <button class="ld-btn ld-btn--danger" data-testid="stage-delete" @click="remove(element)">
            <FontAwesomeIcon icon="trash" /> {{ $t("leads.stages.delete") }}
          </button>
          <p v-if="errors[element.id]" class="ld-error" data-testid="stage-error">{{ errors[element.id] }}</p>
        </div>
      </template>
    </draggable>
    <form class="ld-row" data-testid="stage-add" @submit.prevent="add">
      <input v-model="draft.key" class="ld-input" required pattern="[-a-zA-Z0-9_]+" :placeholder="$t('leads.stages.key')" />
      <input v-model="draft.label" class="ld-input" required :placeholder="$t('leads.stages.label')" />
      <button class="ld-btn ld-btn--primary" type="submit">{{ $t("leads.stages.add") }}</button>
    </form>
    <p v-if="errors.add" class="ld-error">{{ errors.add }}</p>
  </div>
</template>

<script setup>
import { onMounted, reactive, ref } from "vue";
import draggable from "vuedraggable";
import { t } from "@/i18n";
import { DELETE_Stage, GET_Stages, PATCH_Stage, POST_Stage } from "@/api/leads/api";
import { extractApiMessage } from "@/composables/useFormErrors";

// Stages admin: order by drag or up/down (PATCH `order` per moved stage), rename inline, delete with the 409 inline (L-18).
const stages = ref([]);
const errors = reactive({});
const draft = reactive({ key: "", label: "" });

async function load() {
  stages.value = (await GET_Stages()).data.results;
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

async function saveOrder() {
  const moved = stages.value.map((stage, order) => ({ stage, order })).filter(({ stage, order }) => stage.order !== order);
  await Promise.all(moved.map(({ stage, order }) => attempt(stage.id, () => PATCH_Stage(stage.id, { order }))));
  await load();
}

function shift(index, delta) {
  const [stage] = stages.value.splice(index, 1);
  stages.value.splice(index + delta, 0, stage);
  return saveOrder();
}

const rename = (stage) => attempt(stage.id, () => PATCH_Stage(stage.id, { label: stage.label }));

async function remove(stage) {
  if (await attempt(stage.id, () => DELETE_Stage(stage.id))) await load();
}

async function add() {
  const order = stages.value.length;
  if (await attempt("add", () => POST_Stage({ key: draft.key, label: draft.label, order }))) {
    Object.assign(draft, { key: "", label: "" });
    await load();
  }
}

onMounted(load);
</script>

<style scoped>
.stage {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-200);
}
.stage__handle {
  cursor: grab;
}
</style>
