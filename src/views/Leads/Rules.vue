<template>
  <PageLayout data-testid="leads-rules">
    <template #header>
      <PageHeader :title="$t('leads.rules.title')" :back="{ name: 'LeadsSettings' }" />
    </template>
    <div class="rules flex-column gap-8">
      <p class="t-muted m-0">{{ $t("leads.rules.help") }}</p>
      <div class="flex-column gap-3">
        <p v-if="!rules.length" class="t-muted m-0" data-testid="rules-empty">{{ $t("leads.rules.empty") }}</p>
        <div v-for="rule in rules" :key="rule.id" class="rule" data-testid="rule-row" :data-rule="rule.id">
          <span class="rule__summary">
            {{ $t(`leads.rules.trigger.${rule.trigger}`) }}<template v-if="rule.stage_id"> · {{ stageLabel(rule.stage_id) }}</template>
            → {{ $t(`leads.rules.action.${rule.action}`) }}<template v-if="rule.template_key"> · {{ rule.template_key }}</template>
          </span>
          <BasicSwitch
            :model-value="rule.is_active"
            :label="$t('leads.rules.active')"
            data-testid="rule-active"
            @update:model-value="toggle(rule, $event)"
          />
          <div class="rule__controls">
            <BasicButton mutates variant="outline" data-testid="rule-edit" @click="edit(rule)">{{ $t("leads.rules.edit") }}</BasicButton>
            <IconButton mutates icon="delete" variant="danger" :label="$t('leads.stages.delete')" data-testid="rule-delete" @click="remove(rule)" />
          </div>
          <p v-if="errors[rule.id]" class="rule__error t-negative m-0" data-testid="rule-error">{{ errors[rule.id] }}</p>
        </div>
      </div>
      <form class="rule-form flex-column gap-4" data-testid="rule-form" @submit.prevent="submit">
        <h2 class="m-0">{{ editingId ? $t("leads.rules.edit_title") : $t("leads.rules.add_title") }}</h2>
        <FormField :label="$t('leads.rules.trigger_label')">
          <BasicSelect v-model="form.trigger" :options="triggerOptions" data-testid="rule-trigger" />
        </FormField>
        <FormField v-if="form.trigger === 'stage_entered'" :label="$t('leads.rules.stage')" required>
          <BasicSelect v-model="form.stage_id" :options="stageOptions" data-testid="rule-stage" />
        </FormField>
        <FormField :label="$t('leads.rules.action_label')">
          <BasicSelect v-model="form.action" :options="actionOptions" data-testid="rule-action" />
        </FormField>
        <FormField v-if="form.action === 'communicate'" :label="$t('leads.rules.template')" required :hint="$t('leads.rules.template_help')">
          <BasicInput v-model="form.template_key" :maxlength="128" data-testid="rule-template" />
        </FormField>
        <FormField :label="$t('leads.rules.strategy')">
          <BasicSelect v-model="form.contact_strategy" :options="strategyOptions" data-testid="rule-strategy" />
        </FormField>
        <BasicSwitch v-model="form.require_hooks" :label="$t('leads.rules.require_hooks')" data-testid="rule-require-hooks" />
        <BasicSwitch v-model="form.require_email" :label="$t('leads.rules.require_email')" data-testid="rule-require-email" />
        <FormField :label="$t('leads.rules.cooldown')">
          <BasicInput v-model="form.cooldown_hours" type="number" data-testid="rule-cooldown" />
        </FormField>
        <FormField :label="$t('leads.rules.order')">
          <BasicInput v-model="form.order" type="number" data-testid="rule-order" />
        </FormField>
        <BasicSwitch v-model="form.is_active" :label="$t('leads.rules.active')" data-testid="rule-form-active" />
        <p v-if="errors.form" class="t-negative m-0" role="alert" data-testid="rule-form-error">{{ errors.form }}</p>
        <div class="flex jc-fe gap-3">
          <BasicButton v-if="editingId" variant="outline" type="button" data-testid="rule-cancel" @click="reset">{{ $t("common.cancel") }}</BasicButton>
          <BasicButton variant="primary" type="submit" data-testid="rule-save">{{ editingId ? $t("communicator.template.save") : $t("leads.rules.add") }}</BasicButton>
        </div>
      </form>
    </div>
  </PageLayout>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from "vue";
import { t } from "@/i18n";
import { DELETE_Rule, GET_Rules, GET_Stages, PATCH_Rule, POST_Rule } from "@/api/leads/api";
import { extractApiMessage } from "@/composables/useFormErrors";

// Leads → Settings → Rules (S5): the automation rules of the channel — what happens when a company enters a stage or
// its intel is ready. The Lead types pattern: a list with an active switch and delete, one form below to add or edit.
const TRIGGERS = ["stage_entered", "intel_ready"];
const ACTIONS = ["communicate", "request_audit"];
const STRATEGIES = ["primary", "ai_pick"];
const labelled = (list, prefix) => list.map((value) => ({ value, label: t(`${prefix}.${value}`) }));
const triggerOptions = labelled(TRIGGERS, "leads.rules.trigger");
const actionOptions = labelled(ACTIONS, "leads.rules.action");
const strategyOptions = labelled(STRATEGIES, "leads.rules.strategy_value");

const rules = ref([]);
const stages = ref([]);
const errors = reactive({});
const editingId = ref(null);
const blank = () => ({
  trigger: "stage_entered",
  stage_id: null,
  action: "communicate",
  template_key: "",
  contact_strategy: "primary",
  require_hooks: true,
  require_email: true,
  cooldown_hours: 24,
  is_active: true,
  order: 0,
});
const form = reactive(blank());

const stageOptions = computed(() => stages.value.map((stage) => ({ value: stage.id, label: stage.label })));
const stageLabel = (id) => stages.value.find((stage) => stage.id === id)?.label || String(id);

async function load() {
  const [list, stageList] = await Promise.all([GET_Rules(), GET_Stages()]);
  rules.value = list.data.results || [];
  stages.value = stageList.data.results || [];
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

async function toggle(rule, is_active) {
  if (await attempt(rule.id, () => PATCH_Rule(rule.id, { is_active }))) await load();
}

async function remove(rule) {
  if (await attempt(rule.id, () => DELETE_Rule(rule.id))) {
    if (editingId.value === rule.id) reset();
    await load();
  }
}

function edit(rule) {
  editingId.value = rule.id;
  Object.assign(form, blank(), {
    trigger: rule.trigger,
    stage_id: rule.stage_id,
    action: rule.action,
    template_key: rule.template_key,
    contact_strategy: rule.contact_strategy,
    require_hooks: rule.require_hooks,
    require_email: rule.require_email,
    cooldown_hours: rule.cooldown_hours,
    is_active: rule.is_active,
    order: rule.order,
  });
}

function reset() {
  editingId.value = null;
  Object.assign(form, blank());
}

async function submit() {
  delete errors.form;
  if (form.trigger === "stage_entered" && !form.stage_id) {
    errors.form = t("leads.rules.stage_required");
    return;
  }
  if (form.action === "communicate" && !form.template_key.trim()) {
    errors.form = t("leads.rules.template_required");
    return;
  }
  const body = {
    trigger: form.trigger,
    stage_id: form.trigger === "stage_entered" ? form.stage_id : null,
    action: form.action,
    template_key: form.action === "communicate" ? form.template_key.trim() : "",
    contact_strategy: form.contact_strategy,
    require_hooks: form.require_hooks,
    require_email: form.require_email,
    cooldown_hours: Number(form.cooldown_hours) || 0,
    is_active: form.is_active,
    order: Number(form.order) || 0,
  };
  const call = editingId.value ? () => PATCH_Rule(editingId.value, body) : () => POST_Rule(body);
  if (await attempt("form", call)) {
    reset();
    await load();
  }
}

onMounted(load);
</script>

<style lang="scss" scoped>
@import "@/assets/scss/utils/media-query";

.rules {
  max-width: 900px;
}
.rule {
  display: grid;
  grid-template-columns: 1fr auto auto;
  align-items: center;
  gap: var(--space-5);
}
.rule__controls {
  display: flex;
  gap: var(--space-2);
}
.rule__error {
  grid-column: 1 / -1;
}
.rule-form {
  max-width: 560px;
}
/* Below tablet the summary takes a line of its own, the switch and the buttons wrap below it */
@include max-tablet {
  .rule {
    grid-template-columns: 1fr auto;
    padding-bottom: var(--space-4);
    border-bottom: 1px solid var(--border-subtle);
  }
  .rule__summary {
    grid-column: 1 / -1;
  }
}
</style>
