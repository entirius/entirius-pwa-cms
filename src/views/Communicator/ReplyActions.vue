<template>
  <PageLayout data-testid="communicator-reply-actions">
    <template #header>
      <PageHeader :title="$t('communicator.reply_actions.title')" :back="{ name: 'LeadsSettings' }" />
    </template>
    <div class="actions flex-column gap-6">
      <p class="t-muted m-0">{{ $t("communicator.reply_actions.help") }}</p>
      <Loader v-if="loading" block />
      <BasicCard v-for="row in rows" :key="row.intent" :title="intentLabel(row.intent)" :data-testid="`action-${row.intent}`">
        <form class="action flex-column gap-4" @submit.prevent="save(row)">
          <StatusBadge v-if="row.is_default" size="sm" tone="neutral" :label="$t('communicator.reply_actions.default')" data-testid="action-default" />
          <FormField :label="$t('communicator.reply_actions.sequence')">
            <BasicSelect v-model="row.sequence" :options="sequenceOptions(row.intent)" data-testid="action-sequence" />
          </FormField>
          <FormField :label="$t('communicator.reply_actions.notify')">
            <BasicSelect v-model="row.notify" :options="notifyOptions" data-testid="action-notify" />
          </FormField>
          <FormField :label="$t('communicator.reply_actions.remind')" :hint="$t('communicator.reply_actions.remind_help')">
            <BasicInput v-model="row.remind_after_days" type="number" data-testid="action-remind" />
          </FormField>
          <FormField :label="$t('communicator.reply_actions.min_confidence')" :hint="$t('communicator.reply_actions.min_confidence_help')">
            <BasicInput v-model="row.min_confidence" type="number" step="0.05" data-testid="action-confidence" />
          </FormField>
          <BasicSwitch v-model="row.needs_review" :label="$t('communicator.reply_actions.needs_review')" data-testid="action-review" />
          <template v-if="row.intent === 'unsubscribe'">
            <BasicSwitch v-model="row.auto_suppress" :label="$t('communicator.reply_actions.auto_suppress')" data-testid="action-suppress" />
            <p class="t-muted fs-200 m-0">{{ $t("communicator.reply_actions.auto_suppress_help") }}</p>
          </template>
          <p v-if="messages[row.intent]" :class="messages[row.intent].tone" class="m-0" role="status" data-testid="action-message">
            {{ messages[row.intent].text }}
          </p>
          <div class="flex jc-fe gap-3">
            <BasicButton v-if="!row.is_default" mutates variant="secondary" type="button" data-testid="action-reset" @click="reset(row)">
              {{ $t("communicator.reply_actions.reset") }}
            </BasicButton>
            <BasicButton mutates variant="primary" type="submit" data-testid="action-save">{{ $t("communicator.reply_actions.save") }}</BasicButton>
          </div>
        </form>
      </BasicCard>
    </div>
  </PageLayout>
</template>

<script setup>
import { onMounted, reactive, ref } from "vue";
import { t } from "@/i18n";
import { DELETE_ReplyAction, GET_ReplyActions, PUT_ReplyAction } from "@/api/communicator/api";
import { extractApiMessage } from "@/composables/useFormErrors";
import { intentLabel } from "@/utils/leadsLabels";
import { actionBody } from "@/utils/leadsIntents";

// Leads → Settings → Reply steps (T4): per reply class, what happens to the sequence, who is alerted, when a reminder
// is due, and (unsubscribe only) whether the opt-out is confirmed without a person. A class without a stored row shows
// the code default (`is_default`). The stage move of the same class lives in leads (Reply routes).
const notifyOptions = ["none", "low", "medium", "high"].map((value) => ({ value, label: t(`communicator.reply_actions.notify_value.${value}`) }));
// `pause_until_return` is only valid for out_of_office.
const sequenceOptions = (intent) =>
  ["stop", "pause", ...(intent === "out_of_office" ? ["pause_until_return"] : [])].map((value) => ({
    value,
    label: t(`communicator.reply_actions.sequence_value.${value}`),
  }));

const rows = ref([]);
const loading = ref(true);
const messages = reactive({});

const toRow = (action) => ({
  intent: action.intent,
  sequence: action.sequence,
  notify: action.notify,
  remind_after_days: action.remind_after_days ?? "",
  needs_review: action.needs_review,
  min_confidence: action.min_confidence ?? "",
  auto_suppress: action.auto_suppress,
  is_default: action.is_default,
});

async function load() {
  rows.value = ((await GET_ReplyActions()).data.results || []).map(toRow);
  loading.value = false;
}

const say = (intent, text, tone = "t-muted") => (messages[intent] = { text, tone });

async function save(row) {
  delete messages[row.intent];
  const { body, error } = actionBody(row);
  if (error) return say(row.intent, t(error), "t-negative");
  try {
    const { data } = await PUT_ReplyAction(row.intent, body);
    rows.value = rows.value.map((item) => (item.intent === row.intent ? toRow(data) : item));
    say(row.intent, t("communicator.reply_actions.saved"));
  } catch (err) {
    say(row.intent, extractApiMessage(err, t("communicator.reply_actions.error")), "t-negative");
  }
}

async function reset(row) {
  delete messages[row.intent];
  try {
    await DELETE_ReplyAction(row.intent);
    await load();
    say(row.intent, t("communicator.reply_actions.saved"));
  } catch (err) {
    say(row.intent, extractApiMessage(err, t("communicator.reply_actions.error")), "t-negative");
  }
}

onMounted(load);
</script>

<style scoped>
.actions {
  max-width: 640px;
}
</style>
