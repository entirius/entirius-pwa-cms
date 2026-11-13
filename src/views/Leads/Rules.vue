<template>
  <PageLayout data-testid="leads-rules">
    <template #header>
      <PageHeader :title="$t('leads.rules.title')" :back="{ name: 'LeadsSettings' }">
        <template #actions>
          <ActionBar :actions="pageActions" />
        </template>
      </PageHeader>
    </template>
    <template #toolbar>
      <BasicSelect v-model="stageFilter" :floating-label="$t('leads.rules.stage')" :options="stageOptions" clearable data-testid="rules-filter-stage" />
    </template>
    <Loader v-if="loading" block />
    <p v-else-if="error" class="t-negative m-0" role="alert" data-testid="rule-error">{{ error }}</p>
    <EmptyState v-else-if="!rules.length" icon="empty" size="md" :title="$t('leads.rules.empty')" data-testid="rules-empty" />
    <DataTable v-else :columns="columns" :rows="rows" row-key="id" :row-attrs="rowAttrs" data-testid="rules-table">
      <template #cell-active="{ row }">
        <BasicSwitch :model-value="row.is_active" :disabled="readonly" :label="$t('leads.rules.active')" data-testid="rule-active" @update:model-value="toggle(row, $event)" />
      </template>
      <template #cell-actions="{ row }">
        <span class="flex gap-1">
          <IconButton :mutates="false" icon="edit" size="sm" :label="$t('leads.rules.edit')" data-testid="rule-edit" @click="openDialog(row)" />
          <IconButton mutates icon="delete" variant="danger" size="sm" :label="$t('leads.common.delete')" data-testid="rule-delete" @click="removing = row" />
        </span>
      </template>
    </DataTable>

    <BasicModal v-model:open="dialogOpen" :title="$t(draft.id ? 'leads.rules.edit' : 'leads.rules.add')" size="lg" :persistent="saving" :actions="dialogActions" data-testid="rule-dialog">
      <div class="flex-column gap-5">
        <p v-if="dialogError" class="t-negative m-0" role="alert" data-testid="rule-error">{{ dialogError }}</p>
        <div class="form-grid">
          <FormField :label="$t('leads.rules.stage')" :required="draft.trigger === 'stage_entered'" :error="errorOf('stage_id')">
            <BasicSelect v-model="draft.stage_id" :options="stageOptions" :disabled="readonly" data-testid="rule-stage" />
          </FormField>
          <FormField :label="$t('leads.rules.when')" required>
            <BasicRadioGroup v-model="draft.trigger" :options="triggerOptions" name="rule-trigger" :disabled="readonly" data-testid="rule-trigger" />
          </FormField>
          <FormField :label="$t('leads.rules.do')" required :error="errorOf('action')">
            <BasicSelect v-model="draft.action" :options="actionOptions" :disabled="readonly" data-testid="rule-action" />
            <p v-if="draft.action === 'score' && !hasProfile" class="t-muted m-0 fs-200">{{ $t("leads.rules.no_profile") }}</p>
          </FormField>
          <template v-if="draft.action === 'communicate'">
            <FormField :label="$t('leads.rules.template')" required :error="errorOf('template_key')">
              <BasicSelect v-model="draft.template_key" :options="templateOptions" :disabled="readonly" data-testid="rule-template" />
              <router-link v-if="!templateOptions.length" class="t-accent fs-200" :to="{ name: 'CommunicatorTemplates' }">{{ $t("leads.rules.add_template") }}</router-link>
            </FormField>
            <FormField :label="$t('leads.rules.contact')">
              <BasicRadioGroup v-model="draft.contact_strategy" :options="contactOptions" name="rule-contact" :disabled="readonly" data-testid="rule-contact" />
            </FormField>
          </template>
        </div>
        <div class="flex flex-wrap gap-6">
          <BasicCheckbox v-model="draft.require_hooks" :disabled="readonly" data-testid="rule-require-hooks">{{ $t("leads.rules.require_hooks") }}</BasicCheckbox>
          <BasicCheckbox v-model="draft.require_email" :disabled="readonly" data-testid="rule-require-email">{{ $t("leads.rules.require_email") }}</BasicCheckbox>
          <BasicSwitch v-model="draft.is_active" :label="$t('leads.rules.active')" :disabled="readonly" />
        </div>
        <BasicCard :title="$t('leads.rules.conditions')">
          <template v-if="!readonly" #actions>
            <BasicButton size="sm" data-testid="rule-add-condition" @click="draft.conditions.push({ field: '', op: 'eq', value: null })">
              {{ $t("leads.rules.add_condition") }}
            </BasicButton>
          </template>
          <div class="flex-column gap-5">
            <ConditionRow
              v-for="(condition, index) in draft.conditions"
              :key="index"
              :model-value="condition"
              :fields="fields"
              :disabled="readonly"
              :error="errorOf(`conditions.${index}`)"
              @update:model-value="draft.conditions[index] = $event"
              @remove="draft.conditions.splice(index, 1)"
            />
          </div>
        </BasicCard>
        <BasicCard v-if="runs.length" :title="$t('leads.rules.last_runs')" data-testid="rule-runs">
          <ul class="m-0 flex-column gap-1 rules__runs">
            <li v-for="run in runs" :key="run.id">{{ formatTime(run.fired_at) }} · #{{ run.company_id }} — {{ run.outcome }}<template v-if="run.detail">: {{ run.detail }}</template></li>
          </ul>
        </BasicCard>
      </div>
    </BasicModal>

    <ConfirmDialog
      :open="Boolean(removing)"
      tone="danger"
      :title="$t('leads.common.delete')"
      :message="$t('leads.rules.delete_confirm')"
      :confirm-label="$t('leads.common.delete')"
      :cancel-label="$t('leads.common.keep')"
      confirm-testid="rule-delete-confirm"
      @confirm="remove"
      @cancel="removing = null"
    />
  </PageLayout>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from "vue";
import { t } from "@/i18n";
import { GET_Templates } from "@/api/communicator/api";
import { DELETE_Rule, GET_Fields, GET_RuleRuns, GET_Rules, GET_ScoringProfiles, GET_Stages, PATCH_Rule, POST_Rule } from "@/api/leads/api";
import { extractApiMessage, useFormErrors } from "@/composables/useFormErrors";
import { usePageReadonly } from "@/composables/useReadonly";
import { useMuninStore } from "@/stores/munin";
import { useNotifyStore } from "@/stores/notify";
import { formatTime } from "@/utils/leadsTime";
import ConditionRow from "./ConditionRow.vue";
import { plainCopy } from "./customFields";

// Settings → Rules (ux/screens/settings-rules.md): what runs when a company enters a stage or its intel is ready,
// for the companies that meet every condition. "Draft from template" needs communicator.
const RULE_FIELDS = ["trigger", "stage_id", "action", "template_key", "contact_strategy", "require_hooks", "require_email", "conditions", "is_active"];
const notify = useNotifyStore();
const readonly = usePageReadonly();
const hasMail = useMuninStore().isModuleEnabled("communicator");
const { handleApiError, getFieldError, clearErrors } = useFormErrors();
const rules = ref([]);
const stages = ref([]);
const templates = ref([]);
const fields = ref([]);
const runs = ref([]);
const hasProfile = ref(true);
const loading = ref(true);
const error = ref("");
const stageFilter = ref(null);
const dialogOpen = ref(false);
const dialogError = ref("");
const saving = ref(false);
const removing = ref(null);
const draft = reactive({});

const stageOptions = computed(() => stages.value.map((stage) => ({ value: stage.id, label: stage.label })));
const triggerOptions = ["stage_entered", "intel_ready"].map((value) => ({ value, label: t(`leads.rules.trigger.${value}`) }));
const actionOptions = (hasMail ? ["communicate", "request_audit", "score"] : ["request_audit", "score"]).map((value) => ({ value, label: t(`leads.rules.action.${value}`) }));
const contactOptions = ["primary", "ai_pick"].map((value) => ({ value, label: t(`leads.rules.contact_strategy.${value}`) }));
const templateOptions = computed(() => templates.value.map((tpl) => ({ value: tpl.key, label: `${tpl.key} (${tpl.language})` })));
const pageActions = computed(() => [{ key: "add", label: t("leads.rules.add"), role: "primary", testid: "rules-add", onClick: () => openDialog(null) }]);
const columns = computed(() => [
  { key: "stage", label: t("leads.rules.stage"), width: "1fr" },
  { key: "when", label: t("leads.rules.when"), priority: 3 },
  { key: "do", label: t("leads.rules.do"), priority: 2 },
  { key: "conditionCount", label: t("leads.rules.col_conditions"), numeric: true, priority: 3 },
  { key: "active", label: t("leads.rules.active"), width: "max-content" },
  { key: "actions", label: "", actions: true },
]);
const stageLabel = (id) => stages.value.find((stage) => stage.id === id)?.label || "—";
function doLabel(rule) {
  const action = t(`leads.rules.action.${rule.action}`);
  if (rule.action !== "communicate") return action;
  return hasMail ? `${action} "${rule.template_key}"` : `${action} — ${t("leads.rules.needs_mail")}`;
}
const rows = computed(() =>
  rules.value
    .filter((rule) => !stageFilter.value || rule.stage_id === stageFilter.value)
    .map((rule) => ({
      ...rule,
      stage: stageLabel(rule.stage_id),
      when: t(`leads.rules.trigger.${rule.trigger}`),
      do: doLabel(rule),
      conditionCount: rule.conditions?.length || "—",
    }))
);
const rowAttrs = (row) => ({ "data-testid": "rule-row", "data-rule": row.id });
const errorOf = (name) => getFieldError(name)?.msg || "";
const dialogActions = computed(() =>
  [
    { key: "close", label: t("leads.rules.cancel"), role: "secondary", disabled: saving.value, onClick: () => (dialogOpen.value = false) },
    !readonly.value && { key: "save", label: t("leads.rules.save"), role: "primary", loading: saving.value, testid: "rule-save", onClick: save },
  ].filter(Boolean)
);

async function loadRules() {
  error.value = "";
  try {
    rules.value = (await GET_Rules()).data.results;
  } catch (err) {
    error.value = extractApiMessage(err, t("leads.rules.load_error"));
  } finally {
    loading.value = false;
  }
}

// The selects' sources: a failure leaves that select empty.
async function loadOptions() {
  const [stageRes, factRes, profileRes, templateRes] = await Promise.allSettled([
    GET_Stages(),
    GET_Fields(),
    GET_ScoringProfiles(),
    hasMail ? GET_Templates() : Promise.resolve({ data: { results: [] } }),
  ]);
  if (stageRes.status === "fulfilled") stages.value = stageRes.value.data.results;
  if (factRes.status === "fulfilled") fields.value = factRes.value.data.results;
  if (profileRes.status === "fulfilled") hasProfile.value = profileRes.value.data.results.some((profile) => profile.is_active);
  if (templateRes.status === "fulfilled") templates.value = templateRes.value.data.results.filter((tpl) => tpl.is_active);
}

async function openDialog(rule) {
  const base = { id: null, trigger: "stage_entered", stage_id: stageFilter.value, action: hasMail ? "communicate" : "score", template_key: "", contact_strategy: "primary", require_hooks: false, require_email: false, conditions: [], is_active: true };
  Object.assign(draft, base, rule ? plainCopy({ ...rule, conditions: rule.conditions || [] }) : {});
  dialogError.value = "";
  runs.value = [];
  clearErrors();
  dialogOpen.value = true;
  if (rule) runs.value = (await GET_RuleRuns(rule.id).catch(() => ({ data: { results: [] } }))).data.results.slice(0, 10);
}

const body = () => Object.fromEntries(RULE_FIELDS.map((key) => [key, draft[key]]));

async function save() {
  saving.value = true;
  dialogError.value = "";
  clearErrors();
  try {
    await (draft.id ? PATCH_Rule(draft.id, body()) : POST_Rule(body()));
    dialogOpen.value = false;
    await loadRules();
  } catch (err) {
    handleApiError(err);
    dialogError.value = extractApiMessage(err, t("leads.common.error"));
  } finally {
    saving.value = false;
  }
}

async function toggle(rule, on) {
  try {
    await PATCH_Rule(rule.id, { is_active: on });
  } catch (err) {
    notify.spawnNotification({ msg: extractApiMessage(err, t("leads.common.error")), type: "negative" });
  }
  await loadRules();
}

async function remove() {
  const rule = removing.value;
  removing.value = null;
  try {
    await DELETE_Rule(rule.id);
  } catch (err) {
    notify.spawnNotification({ msg: extractApiMessage(err, t("leads.common.error")), type: "negative" });
  }
  await loadRules();
}

onMounted(() => Promise.all([loadRules(), loadOptions()]));
</script>

<style scoped>
.rules__runs {
  padding-left: var(--space-5);
}
</style>
