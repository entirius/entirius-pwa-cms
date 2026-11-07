<template>
  <section class="pilot flex-column gap-5" data-testid="company-pilot">
    <p class="t-muted m-0">{{ $t("leads.pilot.help") }}</p>
    <p v-if="!pilots.length && !loading" class="t-muted m-0" data-testid="pilot-empty">{{ $t("leads.pilot.empty") }}</p>
    <div v-for="pilot in pilots" :key="pilot.id" class="pilot__row" data-testid="pilot-row" :data-pilot="pilot.id">
      <div class="flex-column gap-1">
        <span class="fw-600" data-testid="pilot-dates">{{ pilot.start_date }} → {{ pilot.end_date || $t("leads.pilot.no_end") }}</span>
        <span v-if="pilot.success_criterion" data-testid="pilot-criterion">{{ pilot.success_criterion }}</span>
        <span v-if="pilot.result_note" class="t-secondary" data-testid="pilot-note">{{ pilot.result_note }}</span>
        <span v-if="pilot.license_switch_date" class="t-muted fs-200" data-testid="pilot-switch-date">
          {{ $t("leads.pilot.license_switch_date") }}: {{ pilot.license_switch_date }}
        </span>
      </div>
      <StatusBadge :tone="RESULT_TONES[pilot.result] || 'neutral'" :label="$t(`leads.pilot.results.${pilot.result}`)" data-testid="pilot-result" />
      <div class="pilot__controls">
        <BasicButton mutates variant="secondary" data-testid="pilot-edit" @click="edit(pilot)">{{ $t("leads.pilot.edit") }}</BasicButton>
        <IconButton mutates icon="delete" variant="danger" :label="$t('leads.pilot.delete')" data-testid="pilot-delete" @click="remove(pilot)" />
      </div>
      <p v-if="errors[pilot.id]" class="pilot__error t-negative m-0" data-testid="pilot-error">{{ errors[pilot.id] }}</p>
    </div>

    <form class="pilot__form flex-column gap-4" data-testid="pilot-form" @submit.prevent="submit">
      <h3 class="m-0">{{ editingId ? $t("leads.pilot.edit_title") : $t("leads.pilot.add_title") }}</h3>
      <div class="pilot__dates">
        <FormField :label="$t('leads.pilot.start_date')" required>
          <BasicInput v-model="form.start_date" type="date" data-testid="pilot-start" />
        </FormField>
        <FormField :label="$t('leads.pilot.end_date')" :hint="$t('leads.pilot.end_date_help')">
          <BasicInput v-model="form.end_date" type="date" data-testid="pilot-end" />
        </FormField>
      </div>
      <FormField :label="$t('leads.pilot.criterion')">
        <BasicTextarea v-model="form.success_criterion" :rows="3" data-testid="pilot-criterion-input" />
      </FormField>
      <FormField :label="$t('leads.pilot.result')">
        <BasicSelect v-model="form.result" :options="resultOptions" data-testid="pilot-result-input" />
      </FormField>
      <FormField :label="$t('leads.pilot.note')">
        <BasicTextarea v-model="form.result_note" :rows="2" data-testid="pilot-note-input" />
      </FormField>
      <FormField :label="$t('leads.pilot.license_switch_date')" :hint="$t('leads.pilot.license_switch_help')">
        <BasicInput v-model="form.license_switch_date" type="date" data-testid="pilot-license" />
      </FormField>
      <p v-if="errors.form" class="t-negative m-0" role="alert" data-testid="pilot-form-error">{{ errors.form }}</p>
      <div class="flex jc-fe gap-3">
        <BasicButton v-if="editingId" variant="secondary" type="button" data-testid="pilot-cancel" @click="reset">{{ $t("common.cancel") }}</BasicButton>
        <BasicButton variant="primary" type="submit" data-testid="pilot-save">{{ editingId ? $t("leads.pilot.save") : $t("leads.pilot.start") }}</BasicButton>
      </div>
    </form>
  </section>
</template>

<script setup>
import { onMounted, reactive, ref } from "vue";
import { t } from "@/i18n";
import { DELETE_Pilot, GET_Pilots, PATCH_Pilot, POST_Pilot } from "@/api/leads/api";
import { extractApiMessage } from "@/composables/useFormErrors";

// Company card → Pilot (T3): the trial period with the company — dates, what counts as success, the result and the
// licence switch day. A result change writes a timeline note on the server. The Rules pattern: list, one form.
const props = defineProps({ company: { type: Object, required: true } });
const RESULTS = ["pending", "success", "failure", "cancelled"];
const RESULT_TONES = { pending: "info", success: "positive", failure: "negative", cancelled: "neutral" };
const resultOptions = RESULTS.map((value) => ({ value, label: t(`leads.pilot.results.${value}`) }));

const pilots = ref([]);
const loading = ref(true);
const errors = reactive({});
const editingId = ref(null);
const today = () => new Date().toISOString().slice(0, 10);
const blank = () => ({ start_date: today(), end_date: "", success_criterion: "", result: "pending", result_note: "", license_switch_date: "" });
const form = reactive(blank());

async function load() {
  pilots.value = (await GET_Pilots({ company: props.company.id })).data.results || [];
  loading.value = false;
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

function edit(pilot) {
  editingId.value = pilot.id;
  Object.assign(form, blank(), {
    start_date: pilot.start_date,
    end_date: pilot.end_date || "",
    success_criterion: pilot.success_criterion || "",
    result: pilot.result,
    result_note: pilot.result_note || "",
    license_switch_date: pilot.license_switch_date || "",
  });
}

function reset() {
  editingId.value = null;
  Object.assign(form, blank());
}

async function remove(pilot) {
  if (await attempt(pilot.id, () => DELETE_Pilot(pilot.id))) {
    if (editingId.value === pilot.id) reset();
    await load();
  }
}

async function submit() {
  delete errors.form;
  if (!form.start_date) {
    errors.form = t("leads.pilot.start_required");
    return;
  }
  const body = {
    start_date: form.start_date,
    success_criterion: form.success_criterion,
    result: form.result,
    result_note: form.result_note,
  };
  // An emptied date is null when editing (clears it), absent when creating.
  for (const key of ["end_date", "license_switch_date"]) {
    if (form[key]) body[key] = form[key];
    else if (editingId.value) body[key] = null;
  }
  const call = editingId.value ? () => PATCH_Pilot(editingId.value, body) : () => POST_Pilot({ ...body, company_id: props.company.id });
  if (await attempt("form", call)) {
    reset();
    await load();
  }
}

onMounted(load);
</script>

<style lang="scss" scoped>
@import "@/assets/scss/utils/media-query";

.pilot {
  max-width: 760px;
}
.pilot__row {
  display: grid;
  grid-template-columns: 1fr auto auto;
  align-items: center;
  gap: var(--space-5);
  padding-bottom: var(--space-4);
  border-bottom: 1px solid var(--border-subtle);
}
.pilot__controls {
  display: flex;
  gap: var(--space-2);
}
.pilot__error {
  grid-column: 1 / -1;
}
.pilot__form {
  max-width: 560px;
}
.pilot__dates {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-4);
}
@include max-tablet {
  .pilot__row {
    grid-template-columns: 1fr auto;
  }
  .pilot__row > :first-child {
    grid-column: 1 / -1;
  }
}
</style>
