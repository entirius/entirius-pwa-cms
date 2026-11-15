<template>
  <PageLayout data-testid="leads-ai-crm">
    <template #header>
      <PageHeader :title="$t('leads.ai_crm.title')">
        <template #meta>
          <span class="t-muted">{{ $t("leads.ai_crm.subtitle") }}</span>
        </template>
      </PageHeader>
    </template>

    <div class="ai-crm flex-column gap-8">
      <BasicCard
        :title="$t('leads.ai_crm.plan_title')"
        gap
        data-testid="ai-crm-plan"
      >
        <Loader v-if="loading" block />
        <EmptyState
          v-else-if="loadError"
          icon="warning"
          size="sm"
          :title="$t('leads.ai_crm.load_error')"
          data-testid="ai-crm-plan-error"
        >
          <BasicButton
            :mutates="false"
            size="sm"
            data-testid="ai-crm-plan-retry"
            @click="load"
          >
            {{ $t("leads.ai_crm.retry") }}
          </BasicButton>
        </EmptyState>
        <EmptyState
          v-else-if="!items.length"
          icon="success"
          size="sm"
          :title="$t('leads.ai_crm.plan_empty')"
          data-testid="ai-crm-plan-empty"
        />
        <ol v-else class="ai-crm__plan flex-column gap-3">
          <li
            v-for="item in items"
            :key="item.n"
            class="ai-crm__item flex ai-ct gap-3"
            data-testid="ai-crm-item"
            :data-type="item.type"
          >
            <span class="ai-crm__n t-muted">{{ item.n }}.</span>
            <StatusBadge
              v-if="item.type === 'task'"
              :tone="item.overdue ? 'negative' : 'neutral'"
              :label="
                $t(item.overdue ? 'leads.ai_crm.overdue' : 'leads.ai_crm.today')
              "
            />
            <span class="flex-column gap-1">
              <span>{{ itemLabel(item) }}</span>
              <router-link
                v-if="item.to"
                class="t-accent fs-200"
                :to="item.to"
                data-testid="ai-crm-item-link"
                >{{ item.subject_label }}</router-link
              >
            </span>
          </li>
        </ol>
      </BasicCard>

      <BasicCard
        :title="$t('leads.ai_crm.chat_title')"
        gap
        data-testid="ai-crm-chat"
      >
        <ul class="ai-crm__messages flex-column gap-3" aria-live="polite">
          <li v-if="!messages.length" class="t-muted" data-testid="ai-crm-hint">
            {{ $t("leads.ai_crm.hint") }}
          </li>
          <li
            v-for="(message, index) in messages"
            :key="index"
            class="ai-crm__message"
            :class="`ai-crm__message--${message.role}`"
            data-testid="ai-crm-message"
            :data-role="message.role"
          >
            {{ message.content }}
          </li>
        </ul>

        <div
          v-for="proposal in proposals"
          :key="proposal.id"
          class="ai-crm__proposal flex flex-wrap ai-ct gap-3"
          data-testid="ai-crm-proposal"
        >
          <span class="flex-1">{{
            $t("leads.ai_crm.confirm_question", { summary: proposal.summary })
          }}</span>
          <BasicButton
            mutates
            variant="danger-solid"
            size="sm"
            :loading="busy"
            data-testid="ai-crm-confirm"
            @click="decide(proposal, 'confirm_proposal')"
          >
            {{ $t("leads.ai_crm.confirm") }}
          </BasicButton>
          <BasicButton
            mutates
            variant="secondary"
            size="sm"
            :disabled="busy"
            data-testid="ai-crm-reject"
            @click="decide(proposal, 'reject_proposal')"
          >
            {{ $t("leads.ai_crm.reject") }}
          </BasicButton>
        </div>

        <form
          class="ai-crm__composer flex-column gap-3"
          data-testid="ai-crm-form"
          @submit.prevent="send"
        >
          <BasicTextarea
            v-model="draft"
            :rows="2"
            autogrow
            :maxlength="4000"
            :placeholder="$t('leads.ai_crm.placeholder')"
            :aria-label="$t('leads.ai_crm.placeholder')"
            data-testid="ai-crm-input"
            @keydown.enter.exact.prevent="send"
          />
          <div class="flex jc-end">
            <BasicButton
              mutates
              type="submit"
              variant="primary"
              :loading="busy"
              :disabled="!draft.trim()"
              data-testid="ai-crm-send"
            >
              {{ $t("leads.ai_crm.send") }}
            </BasicButton>
          </div>
        </form>
      </BasicCard>
    </div>
  </PageLayout>
</template>

<script setup>
import { computed, onMounted, ref } from "vue";
import { t } from "@/i18n";
import {
  GET_AiCrmPlan,
  GET_AiCrmProposals,
  POST_AiCrmChat,
  POST_AiCrmTool,
} from "@/api/aiCrm/api";
import { extractApiMessage } from "@/composables/useFormErrors";
import { useNotifyStore } from "@/stores/notify";
import { routeForSubjectRef } from "@/utils/subjectRef";

// AI CRM (U10): the day plan the agent leads through — the same work as Today — and the conversation in which the
// salesperson says what they did and the agent updates the CRM. Every change goes through the AI CRM tools (the
// same as its API and MCP server); what cannot be undone (a lost deal, Do not contact, sending a draft) comes back as
// a proposal with Confirm / Cancel. The conversation lives in this page only (no server history).
const HISTORY_TURNS = 10;

const notify = useNotifyStore();
const plan = ref({ items: [] });
const proposals = ref([]);
const messages = ref([]);
const draft = ref("");
const loading = ref(true);
const loadError = ref(false);
const busy = ref(false);

const items = computed(() =>
  (plan.value.items || []).map((item) => ({
    ...item,
    to: item.subject_ref ? routeForSubjectRef(item.subject_ref) : null,
  }))
);

function itemLabel(item) {
  if (item.type === "task") return item.title;
  if (item.type === "return")
    return t("leads.ai_crm.item_return", { company: item.subject_label });
  return t(`leads.ai_crm.item_${item.type}`, { count: item.count });
}

const failed = (err) =>
  notify.spawnNotification({
    msg: extractApiMessage(err, t("leads.ai_crm.error")),
    type: "negative",
  });

// The plan and the proposals load apart: a failed plan is an error state with a retry, never "nothing for today", and
// a failed proposals list does not hide the plan.
async function load() {
  loading.value = true;
  loadError.value = false;
  const [planAnswer, proposalAnswer] = await Promise.allSettled([
    GET_AiCrmPlan(),
    GET_AiCrmProposals(),
  ]);
  if (planAnswer.status === "fulfilled") plan.value = planAnswer.value.data;
  else {
    loadError.value = true;
    failed(planAnswer.reason);
  }
  if (proposalAnswer.status === "fulfilled")
    proposals.value = proposalAnswer.value.data.results || [];
  else if (planAnswer.status === "fulfilled") failed(proposalAnswer.reason);
  loading.value = false;
}

// One answer of the agent: its words in the conversation, the plan and the proposals as the server sees them now.
function apply(data) {
  messages.value.push({
    role: "assistant",
    content: data.reply ?? data.message,
  });
  if (data.plan) plan.value = data.plan;
  if (data.proposals) proposals.value = data.proposals;
}

async function send() {
  const message = draft.value.trim();
  if (!message || busy.value) return;
  const history = messages.value.slice(-HISTORY_TURNS);
  messages.value.push({ role: "user", content: message });
  draft.value = "";
  busy.value = true;
  try {
    const { data } = await POST_AiCrmChat(message, history);
    apply(data);
  } catch (err) {
    failed(err);
  } finally {
    busy.value = false;
  }
}

async function decide(proposal, tool) {
  busy.value = true;
  try {
    const { data } = await POST_AiCrmTool(tool, { proposal_id: proposal.id });
    apply(data);
    proposals.value = proposals.value.filter((item) => item.id !== proposal.id);
    const [planAnswer] = await Promise.all([GET_AiCrmPlan()]);
    plan.value = planAnswer.data;
  } catch (err) {
    failed(err);
  } finally {
    busy.value = false;
  }
}

onMounted(load);
</script>

<style lang="scss" scoped>
.ai-crm__plan {
  margin: 0;
  padding: 0;
  list-style: none;
}
.ai-crm__item {
  min-height: 44px;
}
.ai-crm__n {
  min-width: 2ch;
}
.ai-crm__messages {
  margin: 0;
  padding: 0;
  list-style: none;
}
.ai-crm__message {
  max-width: 80ch;
  padding: var(--space-3) var(--space-4);
  border-radius: var(--radius-base);
  white-space: pre-line;
}
.ai-crm__message--user {
  align-self: flex-end;
  background: var(--accent-subtle);
}
.ai-crm__message--assistant {
  align-self: flex-start;
  background: var(--surface-raised);
}
.ai-crm__proposal {
  padding: var(--space-3) var(--space-4);
  border: 1px solid var(--negative);
  border-radius: var(--radius-base);
}
</style>
