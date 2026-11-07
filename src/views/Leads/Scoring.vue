<template>
  <PageLayout data-testid="leads-scoring">
    <template #header>
      <PageHeader :title="$t('leads.scoring.title')" :back="{ name: 'LeadsSettings' }" />
    </template>
    <div class="scoring flex-column gap-8">
      <p class="t-muted m-0">{{ $t("leads.scoring.help") }}</p>
      <div class="flex-column gap-3">
        <p v-if="!profiles.length" class="t-muted m-0" data-testid="scoring-empty">{{ $t("leads.scoring.empty") }}</p>
        <div v-for="profile in profiles" :key="profile.id" class="profile" data-testid="scoring-row" :data-profile="profile.id">
          <span class="profile__summary">
            <strong>{{ profile.key || `#${profile.id}` }}</strong> · {{ $t("leads.scoring.summary", profile.thresholds) }} ·
            {{ $t("leads.scoring.counts.rules", { count: profile.rules.length }) }},
            {{ $t("leads.scoring.counts.disqualifiers", { count: profile.disqualifiers.length }) }}
          </span>
          <BasicSwitch
            :model-value="profile.is_active"
            :label="$t('leads.scoring.active')"
            data-testid="scoring-active"
            @update:model-value="toggle(profile, $event)"
          />
          <div class="profile__controls">
            <BasicButton mutates variant="secondary" data-testid="scoring-edit" @click="edit(profile)">{{ $t("leads.scoring.edit") }}</BasicButton>
            <IconButton mutates icon="delete" variant="danger" :label="$t('leads.stages.delete')" data-testid="scoring-delete" @click="remove(profile)" />
          </div>
          <p v-if="errors[profile.id]" class="profile__error t-negative m-0" data-testid="scoring-error">{{ errors[profile.id] }}</p>
        </div>
      </div>

      <form class="scoring-form flex-column gap-4" data-testid="scoring-form" @submit.prevent="submit">
        <h2 class="m-0">{{ editingId ? $t("leads.scoring.edit_title") : $t("leads.scoring.add_title") }}</h2>
        <FormField :label="$t('leads.scoring.key')" :hint="$t('leads.scoring.key_help')">
          <BasicInput v-model="form.key" :maxlength="64" data-testid="scoring-key" />
        </FormField>
        <fieldset class="thresholds">
          <legend class="fw-600">{{ $t("leads.scoring.thresholds") }}</legend>
          <p class="t-muted fs-200 m-0">{{ $t("leads.scoring.thresholds_help") }}</p>
          <div class="thresholds__grid">
            <FormField v-for="key in ['S', 'M', 'L']" :key="key" :label="key">
              <BasicInput v-model="form.thresholds[key]" type="number" :data-testid="`scoring-threshold-${key}`" />
            </FormField>
          </div>
        </fieldset>

        <section v-for="group in groups" :key="group.name" class="flex-column gap-3" :data-testid="`scoring-${group.name}`">
          <h3 class="m-0">{{ $t(`leads.scoring.${group.name}`) }}</h3>
          <p v-if="group.help" class="t-muted fs-200 m-0">{{ $t(group.help) }}</p>
          <div v-for="(row, i) in form[group.name]" :key="i" class="cond" data-testid="scoring-cond">
            <BasicSelect v-model="row.field" :options="fieldOptions" :floating-label="$t('leads.scoring.field')" data-testid="cond-field" />
            <BasicSelect v-model="row.op" :options="opOptions" :floating-label="$t('leads.scoring.op')" data-testid="cond-op" />
            <FormField :label="$t('leads.scoring.value')" :hint="row.op === 'in' ? $t('leads.scoring.value_help_in') : ''">
              <BasicInput v-model="row.value" data-testid="cond-value" />
            </FormField>
            <FormField :label="$t('leads.scoring.label')">
              <BasicInput v-model="row.label" :maxlength="120" data-testid="cond-label" />
            </FormField>
            <FormField v-if="group.points" :label="$t('leads.scoring.points')">
              <BasicInput v-model="row.points" type="number" data-testid="cond-points" />
            </FormField>
            <IconButton icon="delete" variant="danger" :label="$t('leads.scoring.remove_row')" data-testid="cond-remove" @click="form[group.name].splice(i, 1)" />
          </div>
          <div>
            <BasicButton variant="secondary" type="button" :data-testid="`scoring-add-${group.name}`" @click="form[group.name].push(blankCondition())">
              {{ $t(group.add) }}
            </BasicButton>
          </div>
        </section>

        <BasicSwitch v-model="form.is_active" :label="$t('leads.scoring.active')" data-testid="scoring-form-active" />
        <p v-if="errors.form" class="t-negative m-0" role="alert" data-testid="scoring-form-error">{{ errors.form }}</p>
        <div class="flex jc-fe gap-3">
          <BasicButton v-if="editingId" variant="secondary" type="button" data-testid="scoring-cancel" @click="reset">{{ $t("common.cancel") }}</BasicButton>
          <BasicButton variant="primary" type="submit" data-testid="scoring-save">{{ editingId ? $t("leads.scoring.save") : $t("leads.scoring.add") }}</BasicButton>
        </div>
      </form>
    </div>
  </PageLayout>
</template>

<script setup>
import { onMounted, reactive, ref } from "vue";
import { t } from "@/i18n";
import { DELETE_ScoringProfile, GET_ScoringProfiles, PATCH_ScoringProfile, POST_ScoringProfile } from "@/api/leads/api";
import { extractApiMessage } from "@/composables/useFormErrors";
import { blankCondition, buildProfileBody, SCORE_FIELDS, SCORE_OPS, toRow } from "@/utils/leadsScoring";

// Leads → Settings → Scoring (T3): the profile that turns facts about a company into points and a segment S1–S4.
// The Rules pattern: a list with an active switch and delete, one form below to add or edit. The API keeps one active
// profile per channel (activating one is the server's call); rows are edited as text and typed on save.
const fieldOptions = SCORE_FIELDS.map((value) => ({ value, label: t(`leads.scoring.fields.${value}`) }));
const opOptions = SCORE_OPS.map((value) => ({ value, label: t(`leads.scoring.ops.${value}`) }));
const groups = [
  { name: "rules", add: "leads.scoring.add_rule", points: true },
  { name: "disqualifiers", add: "leads.scoring.add_disqualifier", points: false, help: "leads.scoring.disqualifiers_help" },
];

const profiles = ref([]);
const errors = reactive({});
const editingId = ref(null);
const blank = () => ({ key: "", thresholds: { S: 20, M: 40, L: 70 }, rules: [], disqualifiers: [], is_active: true });
const form = reactive(blank());

async function load() {
  profiles.value = (await GET_ScoringProfiles()).data.results || [];
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

async function toggle(profile, is_active) {
  if (await attempt(profile.id, () => PATCH_ScoringProfile(profile.id, { is_active }))) await load();
}

async function remove(profile) {
  if (await attempt(profile.id, () => DELETE_ScoringProfile(profile.id))) {
    if (editingId.value === profile.id) reset();
    await load();
  }
}

function edit(profile) {
  editingId.value = profile.id;
  Object.assign(form, blank(), {
    key: profile.key || "",
    thresholds: { S: profile.thresholds.S, M: profile.thresholds.M, L: profile.thresholds.L },
    rules: profile.rules.map(toRow),
    disqualifiers: profile.disqualifiers.map(toRow),
    is_active: profile.is_active,
  });
}

function reset() {
  editingId.value = null;
  Object.assign(form, blank());
}

async function submit() {
  delete errors.form;
  const { body, error } = buildProfileBody(form);
  if (error) {
    errors.form = t(error);
    return;
  }
  const call = editingId.value ? () => PATCH_ScoringProfile(editingId.value, body) : () => POST_ScoringProfile(body);
  if (await attempt("form", call)) {
    reset();
    await load();
  }
}

onMounted(load);
</script>

<style lang="scss" scoped>
@import "@/assets/scss/utils/media-query";

.scoring {
  max-width: 900px;
}
.profile {
  display: grid;
  grid-template-columns: 1fr auto auto;
  align-items: center;
  gap: var(--space-5);
}
.profile__controls {
  display: flex;
  gap: var(--space-2);
}
.profile__error {
  grid-column: 1 / -1;
}
.scoring-form {
  max-width: 760px;
}
.thresholds {
  border: 0;
  margin: 0;
  padding: 0;
}
.thresholds__grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 8rem));
  gap: var(--space-4);
  margin-top: var(--space-3);
}
.cond {
  display: grid;
  grid-template-columns: 11rem 9rem minmax(8rem, 1fr) minmax(8rem, 1fr) 6rem auto;
  align-items: start;
  gap: var(--space-3);
  padding-bottom: var(--space-4);
  border-bottom: 1px solid var(--border-subtle);
}
/* Tablet: the condition row takes two columns; phone: one. The remove button closes the row. */
@include max-shell {
  .cond {
    grid-template-columns: 1fr 1fr;
  }
}
@include max-tablet {
  .profile {
    grid-template-columns: 1fr auto;
    padding-bottom: var(--space-4);
    border-bottom: 1px solid var(--border-subtle);
  }
  .profile__summary {
    grid-column: 1 / -1;
  }
  .cond {
    grid-template-columns: 1fr;
  }
  .thresholds__grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}
</style>
