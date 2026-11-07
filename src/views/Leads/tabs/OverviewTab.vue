<template>
  <section class="flex-column gap-5" data-testid="company-overview">
    <DataTable :columns="columns" :rows="rows" row-key="key">
      <template #cell-value="{ row }">
        <span :data-testid="row.testid">
          <router-link v-if="row.key === 'customer' && hasAccounts" class="t-accent" :to="customerRoute">
            {{ row.value }}
          </router-link>
          <template v-else>{{ row.value }}</template>
        </span>
      </template>
    </DataTable>
    <section class="overview__score flex-column gap-3" data-testid="company-score">
      <h3 class="fs-400 fw-600 m-0">{{ $t("leads.score.title") }}</h3>
      <div class="flex ai-ct wrap gap-4">
        <template v-if="score">
          <StatusBadge
            :tone="score.disqualified ? 'negative' : SEGMENT_TONES[score.segment]"
            :label="$t(`leads.score.segment.${score.segment}`)"
            data-testid="score-segment"
          />
          <span data-testid="score-points">{{ $t("leads.score.points", { points: score.points }) }}</span>
          <span v-if="score.disqualified" class="t-negative" data-testid="score-disqualified">{{ $t("leads.score.disqualified") }}</span>
        </template>
        <span v-else class="t-muted" data-testid="score-none">{{ $t("leads.score.none") }}</span>
        <BasicButton mutates variant="secondary" size="sm" :disabled="scoring" data-testid="score-run" @click="runScore">
          {{ $t("leads.score.run") }}
        </BasicButton>
      </div>
      <p v-if="scoreError" class="t-negative m-0" role="alert" data-testid="score-error">{{ scoreError }}</p>
      <ul v-if="score && score.reasons.length" class="overview__reasons m-0" data-testid="score-reasons" :aria-label="$t('leads.score.reasons')">
        <li v-for="(reason, i) in score.reasons" :key="i">{{ reason }}</li>
      </ul>
    </section>
    <h3 class="fs-400 fw-600 m-0">{{ $t("leads.company.activities") }}</h3>
    <ul class="overview__activities flex-column gap-2 m-0">
      <li v-for="activity in company.activities" :key="activity.id">
        <span class="t-muted">{{ formatDate(activity.created_at) }}</span> {{ activityText(activity.message) }}<ActivityDetail :activity="activity" />
      </li>
    </ul>
  </section>
</template>

<script setup>
import { computed, ref } from "vue";
import { useRoute } from "vue-router";
import { t } from "@/i18n";
import { useMuninStore } from "@/stores/munin";
import { useLeadTypesStore } from "@/stores/leadTypes";
import { POST_Score } from "@/api/leads/api";
import { extractApiMessage } from "@/composables/useFormErrors";
import { SEGMENT_TONES } from "@/utils/leadsScoring";
import { activityText } from "@/utils/leadsLabels";
import ActivityDetail from "../ActivityDetail.vue";
import { formatTime } from "@/utils/leadsTime";

const props = defineProps({ company: { type: Object, required: true } });
// The latest score: the newest `score` entry of the card's activities, or the answer of "Score now" (T3).
const ran = ref(null);
const scoring = ref(false);
const scoreError = ref("");
const score = computed(() => {
  if (ran.value) return ran.value;
  const entry = props.company.activities?.find((activity) => activity.kind === "score");
  return entry && entry.data?.segment ? { reasons: [], disqualified: false, ...entry.data } : null;
});

async function runScore() {
  scoreError.value = "";
  scoring.value = true;
  try {
    ran.value = (await POST_Score(props.company.id)).data;
  } catch (err) {
    const missing = err?.response?.status === 409;
    scoreError.value = missing ? t("leads.score.no_profile") : extractApiMessage(err, t("leads.review.error"));
  } finally {
    scoring.value = false;
  }
}
const route = useRoute();
const leadTypes = useLeadTypesStore();
const hasAccounts = computed(() => useMuninStore().isModuleInstalled("accounts"));
const customerName = computed(() => props.company.customer_name || props.company.customer_uid);
// The customer page's back arrow returns here, to the card it was opened from.
const customerRoute = computed(() => ({
  name: "CustomerDetail",
  params: { uid: props.company.customer_uid },
  query: { back: route.fullPath },
}));
const formatDate = (iso) => formatTime(iso) || "—";
const columns = computed(() => [
  { key: "label", label: t("leads.company.field"), width: "max-content", truncate: false },
  { key: "value", label: t("leads.company.value"), width: "1fr" },
]);
const rows = computed(() => {
  const company = props.company;
  return [
    { key: "name", label: t("leads.company.name"), value: company.name },
    { key: "stage", label: t("leads.company.stage"), value: company.stage.label, testid: "overview-stage" },
    { key: "type", label: t("leads.company.type"), value: leadTypes.label(company.lead_type), testid: "overview-type" },
    { key: "activity", label: t("leads.company.last_activity"), value: formatDate(company.last_activity_at) },
    company.customer_uid && {
      key: "customer",
      label: t("leads.company.customer"),
      value: customerName.value,
      testid: "overview-customer",
    },
  ].filter(Boolean);
});
</script>

<style scoped>
.overview__activities {
  padding-left: var(--space-4);
}
.overview__reasons {
  padding-left: var(--space-8);
  color: var(--text-secondary);
}
</style>
