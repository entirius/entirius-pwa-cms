<template>
  <div class="ld-page" data-testid="leads-lead-types">
    <p class="ld-muted">{{ $t("leads.lead_types.help") }}</p>
    <div v-for="(type, index) in types" :key="type.id" class="lead-type" :data-code="type.code" data-testid="lead-type-row">
      <input v-model="type.label" class="ld-input" :aria-label="$t('leads.lead_types.label')" @change="save(type, { label: type.label })" />
      <span class="ld-badge lead-type__code">{{ type.code }}</span>
      <label class="lead-type__active">
        <input type="checkbox" :checked="type.is_active" data-testid="lead-type-active" @change="save(type, { is_active: $event.target.checked })" />
        {{ $t("leads.lead_types.active") }}
      </label>
      <div class="lead-type__controls">
        <button
          class="ld-btn ld-btn--icon"
          :disabled="shifting || index === 0"
          :aria-label="$t('leads.stages.up')"
          :title="$t('leads.stages.up')"
          @click="shift(index, -1)"
        >
          <FontAwesomeIcon icon="arrow-up" />
        </button>
        <button
          class="ld-btn ld-btn--icon"
          :disabled="shifting || index === types.length - 1"
          :aria-label="$t('leads.stages.down')"
          :title="$t('leads.stages.down')"
          @click="shift(index, 1)"
        >
          <FontAwesomeIcon icon="arrow-down" />
        </button>
        <button
          class="ld-btn ld-btn--danger ld-btn--icon"
          :aria-label="$t('leads.stages.delete')"
          :title="$t('leads.stages.delete')"
          data-testid="lead-type-delete"
          @click="remove(type)"
        >
          <FontAwesomeIcon icon="trash-can" />
        </button>
      </div>
      <p v-if="errors[type.id]" class="ld-error lead-type__error" data-testid="lead-type-error">{{ errors[type.id] }}</p>
    </div>
    <p v-if="errors.order" class="ld-error" data-testid="lead-type-order-error">{{ errors.order }}</p>
    <form class="ld-row lead-type__add" data-testid="lead-type-add" @submit.prevent="add">
      <label class="ld-field"><span>{{ $t("leads.lead_types.code") }}</span>
        <input v-model="draft.code" class="ld-input" required pattern="[A-Za-z0-9_]+" data-testid="lead-type-new-code" @input="draft.code = draft.code.toUpperCase()" />
        <span class="ld-muted">{{ $t("leads.lead_types.code_help") }}</span>
      </label>
      <label class="ld-field"><span>{{ $t("leads.lead_types.label") }}</span>
        <input v-model="draft.label" class="ld-input" required data-testid="lead-type-new-label" />
      </label>
      <button class="ld-btn ld-btn--primary" type="submit" data-testid="lead-type-save">{{ $t("leads.lead_types.add") }}</button>
    </form>
    <p v-if="errors.add" class="ld-error" data-testid="lead-type-add-error">{{ errors.add }}</p>
  </div>
</template>

<script setup>
import { onMounted, reactive, ref } from "vue";
import { t } from "@/i18n";
import { DELETE_LeadType, GET_LeadTypes, PATCH_LeadType, POST_LeadType } from "@/api/leads/api";
import { extractApiMessage } from "@/composables/useFormErrors";
import { useLeadTypesStore } from "@/stores/leadTypes";

// Leads → Settings → Lead types (UX-004), the Stages pattern: rename inline, reorder by PATCH `order` per moved
// row, deactivate (a type in use stays on its companies), delete refused inline while companies carry the code.
// The code is fixed after create — companies and template audiences hold it.
const ORDER_STEP = 10;
const store = useLeadTypesStore();
const types = ref([]);
const errors = reactive({});
const draft = reactive({ code: "", label: "" });
const shifting = ref(false); // one move at a time: the PATCHes of a move run one after another

async function load() {
  types.value = (await GET_LeadTypes()).data.results || [];
  store.load(true); // the chips, selects and labels elsewhere read the new list
}

async function attempt(key, call) {
  delete errors[key];
  try {
    await call();
    return true;
  } catch (err) {
    errors[key] = extractApiMessage(err, t("leads.review.error"));
    return false;
  }
}

async function save(type, body) {
  if (await attempt(type.id, () => PATCH_LeadType(type.id, body))) await load();
}

async function shift(index, delta) {
  if (shifting.value) return;
  shifting.value = true;
  const [moved] = types.value.splice(index, 1);
  types.value.splice(index + delta, 0, moved);
  const changed = types.value.map((type, i) => ({ type, order: i * ORDER_STEP })).filter(({ type, order }) => type.order !== order);
  await attempt("order", async () => {
    for (const { type, order } of changed) await PATCH_LeadType(type.id, { order });
  });
  try {
    await load();
  } finally {
    shifting.value = false;
  }
}

async function remove(type) {
  if (await attempt(type.id, () => DELETE_LeadType(type.id))) await load();
}

async function add() {
  const order = Math.max(-ORDER_STEP, ...types.value.map((type) => type.order)) + ORDER_STEP;
  if (await attempt("add", () => POST_LeadType({ code: draft.code, label: draft.label, order }))) {
    Object.assign(draft, { code: "", label: "" });
    await load();
  }
}

onMounted(load);
</script>

<style src="./desktop.css"></style>
<style scoped>
.ld-page {
  max-width: 900px;
}
.lead-type {
  display: grid;
  grid-template-columns: minmax(8rem, 1fr) auto auto auto;
  align-items: center;
  gap: var(--space-5);
}
.lead-type__code {
  font-family: monospace;
}
.lead-type__active {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  min-height: 44px;
}
.lead-type__controls {
  display: flex;
  gap: var(--space-2);
}
.lead-type__error {
  grid-column: 1 / -1;
}
.lead-type__add {
  align-items: flex-start;
}
/* A phone: label on its own line, the rest wraps below it */
@media (max-width: 599px) {
  .lead-type {
    grid-template-columns: 1fr auto;
  }
  .lead-type .ld-input {
    grid-column: 1 / -1;
  }
}
</style>
