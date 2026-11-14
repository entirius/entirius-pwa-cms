<template>
  <PageLayout data-testid="leads-scoring">
    <template #header>
      <PageHeader :title="$t('leads.scoring.title')" :back="{ name: 'LeadsSettings' }" :description="$t('leads.scoring.description')">
        <template v-if="!loading && !loadFailed" #actions>
          <ActionBar>
            <StatusBadge v-if="unsaved.isDirty.value" tone="warning" :label="$t('leads.scoring.unsaved')" />
            <BasicSwitch v-model="form.is_active" :label="$t('leads.scoring.active')" :disabled="readonly" data-testid="scoring-active" />
            <BasicButton
              variant="primary"
              mutates
              :loading="saving"
              :disabled="!unsaved.isDirty.value"
              :title="unsaved.isDirty.value ? undefined : $t('unsaved.nothing')"
              data-testid="scoring-save"
              @click="save"
            >
              {{ $t("leads.scoring.save") }}
            </BasicButton>
          </ActionBar>
        </template>
      </PageHeader>
    </template>
    <Loader v-if="loading" block />
    <div v-else class="flex-column gap-8">
      <p v-if="error" class="t-negative m-0" role="alert" data-testid="scoring-error">{{ error }}</p>
      <BasicCard :title="$t('leads.scoring.segments')">
        <p class="t-secondary m-0 mb-5" data-testid="scoring-segments-help">{{ $t("leads.scoring.segments_help") }}</p>
        <div class="flex ai-fe flex-wrap gap-5">
          <FormField v-for="level in LEVELS" :key="level.key" :label="$t('leads.scoring.from', { segment: level.segment })" :error="level.key === 'L' ? orderError : ''">
            <NumberInput v-model="form.thresholds[level.key]" :min="0" :max="100000" :disabled="readonly" :data-testid="`scoring-threshold-${level.key.toLowerCase()}`" />
          </FormField>
          <span class="t-muted">{{ $t("leads.scoring.below") }}</span>
        </div>
      </BasicCard>
      <BasicCard v-for="list in LISTS" :key="list.key" :title="$t(list.title)" :data-testid="list.testid">
        <template v-if="!readonly" #actions>
          <BasicButton size="sm" :data-testid="list.addTestid" @click="add(list.key)">{{ $t(list.add) }}</BasicButton>
        </template>
        <div class="flex-column gap-5">
          <ConditionRow
            v-for="(row, index) in form[list.key]"
            :key="`${list.key}-${index}`"
            :model-value="row"
            :fields="fields"
            :with-points="list.key === 'rules'"
            with-label
            :disabled="readonly"
            :error="rowError(list.key, index)"
            @update:model-value="form[list.key][index] = $event"
            @remove="form[list.key].splice(index, 1)"
          />
        </div>
      </BasicCard>
    </div>
  </PageLayout>
</template>

<script setup>
import { onMounted, reactive, ref } from "vue";
import { t } from "@/i18n";
import { GET_Fields, GET_ScoringProfiles, PATCH_ScoringProfile, POST_ScoringProfile } from "@/api/leads/api";
import { extractApiMessage, useFormErrors } from "@/composables/useFormErrors";
import { usePageReadonly } from "@/composables/useReadonly";
import { useUnsavedChanges } from "@/composables/useUnsavedChanges";
import { useNotifyStore } from "@/stores/notify";
import ConditionRow from "./ConditionRow.vue";
import { plainCopy } from "./customFields";

// Settings → Scoring (ux/screens/settings-scoring.md): the channel's one active profile — thresholds L ≥ M ≥ S turn
// points into S1–S3 (below = S4), rules add points, a disqualifier forces S4. No profile: Save creates it.
const LEVELS = [
  { key: "L", segment: "S1" },
  { key: "M", segment: "S2" },
  { key: "S", segment: "S3" },
];
const LISTS = [
  { key: "rules", title: "leads.scoring.points", add: "leads.scoring.add_points", testid: "scoring-rules", addTestid: "scoring-add-points" },
  { key: "disqualifiers", title: "leads.scoring.disqualifiers", add: "leads.scoring.add_disqualifier", testid: "scoring-disqualifiers", addTestid: "scoring-add-disqualifier" },
];
const DEFAULTS = { thresholds: { S: 20, M: 40, L: 60 }, rules: [], disqualifiers: [], is_active: true };

const notify = useNotifyStore();
const readonly = usePageReadonly();
const unsaved = useUnsavedChanges();
const { handleApiError, getFieldError, clearErrors } = useFormErrors();
const loading = ref(true);
const saving = ref(false);
const error = ref("");
const loadFailed = ref(false);
const orderError = ref("");
const fields = ref([]);
const profileId = ref(null);
const form = reactive(plainCopy(DEFAULTS));

const rowError = (list, index) => getFieldError(`${list}.${index}`)?.msg || getFieldError(`${list}.${index}.field`)?.msg || "";
const pick = (profiles) => profiles.filter((p) => p.is_active).sort((a, b) => a.key.localeCompare(b.key))[0] || profiles[0] || null;

function fill(profile) {
  profileId.value = profile?.id ?? null;
  const { thresholds, rules, disqualifiers, is_active } = profile || DEFAULTS;
  Object.assign(form, plainCopy({ thresholds, rules, disqualifiers, is_active }));
  unsaved.snapshot(form);
  unsaved.track(form);
}

async function load() {
  try {
    const [profiles, facts] = await Promise.all([GET_ScoringProfiles(), GET_Fields()]);
    fields.value = facts.data.results;
    fill(pick(profiles.data.results));
  } catch (err) {
    loadFailed.value = true;
    error.value = extractApiMessage(err, t("leads.scoring.load_error"));
  } finally {
    loading.value = false;
  }
}

const add = (list) => form[list].push(list === "rules" ? { field: "", op: "eq", value: null, points: 10, label: "" } : { field: "", op: "eq", value: null, label: "" });

function inOrder() {
  const { S, M, L } = form.thresholds;
  orderError.value = Number(L) > Number(M) && Number(M) > Number(S) ? "" : t("leads.scoring.order_error");
  return !orderError.value;
}

const payload = () => ({
  thresholds: Object.fromEntries(Object.entries(form.thresholds).map(([key, value]) => [key, Number(value)])),
  rules: form.rules,
  disqualifiers: form.disqualifiers,
  is_active: form.is_active,
});

async function save() {
  if (!inOrder()) return;
  saving.value = true;
  error.value = "";
  clearErrors();
  try {
    const { data } = profileId.value ? await PATCH_ScoringProfile(profileId.value, payload()) : await POST_ScoringProfile(payload());
    fill(data);
    notify.spawnNotification({ msg: t("leads.scoring.saved"), type: "positive" });
  } catch (err) {
    handleApiError(err);
    const onRow = ["rules", "disqualifiers"].some((list) => form[list].some((_, index) => rowError(list, index)));
    error.value = onRow ? "" : extractApiMessage(err, t("leads.common.error"));
  } finally {
    saving.value = false;
  }
}

onMounted(load);
</script>
