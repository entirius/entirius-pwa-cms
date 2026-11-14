<template>
  <PageLayout data-testid="leads-lead-types">
    <template #header>
      <PageHeader :title="$t('leads.lead_types.title')" :back="{ name: 'LeadsSettings' }">
        <!-- one Save for renames, switches and moves, as on every settings page (N27) -->
        <template #actions>
          <StatusBadge v-if="dirty" tone="warning" :dot="false" :label="$t('unsaved.changes')" data-testid="lead-types-unsaved" />
          <ActionBar :actions="actions" />
        </template>
      </PageHeader>
    </template>
    <div class="lead-types flex-column gap-8">
      <p class="t-muted m-0">{{ $t("leads.lead_types.help") }}</p>
      <div class="flex-column gap-3">
        <div
          v-for="(type, index) in types"
          :key="type.id"
          class="lead-type"
          :data-code="type.code"
          data-testid="lead-type-row"
        >
          <label class="lead-type__label">
            <span class="visually-hidden">{{ $t("leads.lead_types.label") }}</span>
            <BasicInput v-model="type.label" :maxlength="128" data-testid="lead-type-label" />
          </label>
          <StatusBadge class="lead-type__code" tone="neutral" size="sm" :dot="false" :label="type.code" />
          <BasicSwitch v-model="type.is_active" :label="activeLabel(type.is_active)" data-testid="lead-type-active" />
          <div class="lead-type__controls">
            <IconButton mutates
              icon="moveUp"
              variant="outline"
              :label="$t('leads.stages.up')"
              :disabled="index === 0"
              @click="shift(index, -1)"
            />
            <IconButton mutates
              icon="moveDown"
              variant="outline"
              :label="$t('leads.stages.down')"
              :disabled="index === types.length - 1"
              @click="shift(index, 1)"
            />
            <IconButton mutates
              icon="delete"
              variant="danger"
              :label="$t('leads.stages.delete')"
              data-testid="lead-type-delete"
              @click="remove(type)"
            />
          </div>
          <p v-if="errors[type.id]" class="lead-type__error t-negative m-0" data-testid="lead-type-error">
            {{ errors[type.id] }}
          </p>
        </div>
      </div>
      <p v-if="errors.order" class="t-negative m-0" data-testid="lead-type-order-error">{{ errors.order }}</p>
      <form v-if="!readonly" class="flex ai-st flex-wrap gap-5" data-testid="lead-type-add" @submit.prevent="add">
        <FormField :label="$t('leads.lead_types.code')" hint-level="important" :hint="$t('leads.lead_types.code_help')" required :error="errors.code || ''">
          <BasicInput
            :model-value="draft.code"
            :maxlength="32"
            data-testid="lead-type-new-code"
            @update:model-value="draft.code = $event.toUpperCase()"
          />
        </FormField>
        <FormField :label="$t('leads.lead_types.label')" required :error="errors.label || ''">
          <BasicInput v-model="draft.label" :maxlength="128" data-testid="lead-type-new-label" />
        </FormField>
        <BasicButton class="lead-type__submit" variant="primary" type="submit" mutates data-testid="lead-type-save">
          {{ $t("leads.lead_types.add") }}
        </BasicButton>
      </form>
      <p v-if="errors.add" class="t-negative m-0" data-testid="lead-type-add-error">{{ errors.add }}</p>
    </div>
  </PageLayout>
</template>

<script setup>
import { activeLabel } from "@/utils/leadsLabels";
import { computed, onMounted, reactive, ref } from "vue";
import { t } from "@/i18n";
import { DELETE_LeadType, GET_LeadTypes, PATCH_LeadType, POST_LeadType } from "@/api/leads/api";
import { apiFieldErrors, missingFields } from "@/utils/leadsForm";
import { extractApiMessage } from "@/composables/useFormErrors";
import { usePageReadonly } from "@/composables/useReadonly";
import { useLeadTypesStore } from "@/stores/leadTypes";
import { saveAction } from "./saveAction";

// Leads → Settings → Lead types (UX-004), the Stages pattern: rename, (de)activate and reorder inline, all kept until
// the header's Save (one PATCH per changed type, then `order` per moved row); deactivate (a type in use stays on its
// companies), delete refused inline while companies carry the code. The code is fixed after create — companies and
// template audiences hold it.
const ORDER_STEP = 10;
const CODE_PATTERN = /^[A-Za-z0-9_]+$/;
const store = useLeadTypesStore();
const readonly = usePageReadonly();
const types = ref([]);
const errors = reactive({});
const draft = reactive({ code: "", label: "" });
const saved = ref({}); // id → { label, is_active } as the server holds them
const saving = ref(false);

const bodyOf = (type) => {
  const was = saved.value[type.id] || {};
  return Object.fromEntries(["label", "is_active"].filter((key) => type[key] !== was[key]).map((key) => [key, type[key]]));
};
const edited = () => types.value.filter((type) => Object.keys(bodyOf(type)).length);
const savedOrder = ref([]); // the ids in the order loaded: a gap in `order` (after a delete) is no move
const reordered = () => types.value.map((type) => type.id).join() !== savedOrder.value.join();
const dirty = computed(() => edited().length > 0 || reordered());
const actions = computed(() => [saveAction({ dirty: dirty.value, saving: saving.value, testid: "lead-types-save", onClick: saveAll })]);

// A reload (after an add, a delete or the order) keeps the edits not saved yet.
async function load() {
  const edits = Object.fromEntries(edited().map((type) => [type.id, bodyOf(type)]));
  types.value = (await GET_LeadTypes()).data.results || [];
  saved.value = Object.fromEntries(types.value.map((type) => [type.id, { label: type.label, is_active: type.is_active }]));
  savedOrder.value = types.value.map((type) => type.id);
  types.value.forEach((type) => Object.assign(type, edits[type.id]));
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

async function update(type) {
  const body = bodyOf(type);
  const ok = await attempt(type.id, () => PATCH_LeadType(type.id, body));
  if (ok) saved.value = { ...saved.value, [type.id]: { ...saved.value[type.id], ...body } };
  return ok;
}

// The changed types first (a refusal stays on its row with the edit), then the order — which reads the list again.
async function saveAll() {
  saving.value = true;
  try {
    const results = await Promise.all(edited().map(update));
    if (results.every(Boolean) && reordered()) await saveOrder();
  } finally {
    saving.value = false;
  }
}

async function saveOrder() {
  const changed = types.value.map((type, index) => ({ type, order: index * ORDER_STEP })).filter(({ type, order }) => type.order !== order);
  await attempt("order", async () => {
    for (const { type, order } of changed) await PATCH_LeadType(type.id, { order });
  });
  await load();
}

function shift(index, delta) {
  const [type] = types.value.splice(index, 1);
  types.value.splice(index + delta, 0, type);
}

async function remove(type) {
  if (await attempt(type.id, () => DELETE_LeadType(type.id))) await load();
}

// T7 (walk 4): an empty or malformed field is named on it before the request; a field error of the API stands on its
// field in words, any other refusal under the form.
function checkNew() {
  ["add", "code", "label"].forEach((key) => delete errors[key]);
  const missing = missingFields(draft, ["code", "label"]);
  if (!missing.code && !CODE_PATTERN.test(draft.code)) missing.code = t("leads.lead_types.code_invalid");
  Object.assign(errors, missing);
  return !Object.keys(missing).length;
}

async function add() {
  if (!checkNew()) return;
  const order = Math.max(-ORDER_STEP, ...types.value.map((type) => type.order)) + ORDER_STEP;
  try {
    await POST_LeadType({ code: draft.code, label: draft.label, order });
    Object.assign(draft, { code: "", label: "" });
    await load();
  } catch (err) {
    const fields = apiFieldErrors(err, ["code", "label"]);
    Object.assign(errors, fields);
    if (!Object.keys(fields).length) errors.add = extractApiMessage(err, t("leads.review.error"));
  }
}

onMounted(load);
</script>

<style lang="scss" scoped>
@import "@/assets/scss/utils/media-query";

.lead-types {
  max-width: 900px;
}
.lead-type {
  display: grid;
  grid-template-columns: minmax(8rem, 1fr) 12rem auto auto;
  align-items: center;
  gap: var(--space-5);
}
.lead-type__controls {
  display: flex;
  gap: var(--space-2);
}
.lead-type__error {
  grid-column: 1 / -1;
}
.lead-type__submit {
  margin-top: var(--space-5);
}
/* The code column has one width down the list, so the fields and controls line up whatever the code is long. */
.lead-type__code {
  justify-self: start;
}
/* Below tablet: label on its own line, the rest wraps below it */
@include max-tablet {
  .lead-type {
    grid-template-columns: 1fr auto;
  }
  .lead-type__label {
    grid-column: 1 / -1;
  }
}
</style>
