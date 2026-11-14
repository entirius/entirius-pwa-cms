<template>
  <BasicCard :title="$t('leads.score.title')" gap data-testid="company-score">
    <template v-if="!noProfile" #actions>
      <BasicButton mutates size="sm" :loading="busy" data-testid="company-score-now" @click="scoreNow">{{ $t("leads.score.score_now") }}</BasicButton>
    </template>
    <p v-if="noProfile" class="m-0 flex flex-wrap gap-3">
      <span class="t-muted">{{ $t("leads.score.no_profile") }}</span>
      <router-link v-if="canSetUp" class="t-accent" :to="{ name: 'LeadsScoring' }">{{ $t("leads.score.set_up") }}</router-link>
    </p>
    <p v-else-if="!segment" class="t-muted m-0">{{ $t("leads.score.none") }}</p>
    <div v-else class="flex-column gap-3">
      <p class="m-0 flex ai-ct flex-wrap gap-3">
        <StatusBadge :tone="SEGMENT_TONES[segment]" :dot="false" :label="segment" data-testid="company-score-segment" />
        <span>{{ $t("leads.score.points", { points }) }}</span>
        <span v-if="scoredAt" class="t-muted">{{ $t("leads.score.scored_at", { date: formatDay(scoredAt) }) }}</span>
      </p>
      <ul v-if="reasons.length" class="score-card__reasons m-0 flex-column gap-1">
        <li v-for="reason in reasons" :key="reason">{{ reason }}</li>
      </ul>
    </div>
  </BasicCard>
</template>

<script setup>
import { computed, ref } from "vue";
import { t } from "@/i18n";
import { POST_Score } from "@/api/leads/api";
import { extractApiMessage } from "@/composables/useFormErrors";
import { AREAS } from "@/configs/areas";
import { useAccessStore } from "@/stores/access";
import { useNotifyStore } from "@/stores/notify";
import { formatDay } from "@/utils/format";
import { SEGMENT_TONES, apiErrorCode } from "@/utils/leadsOutbound";

// The company's score (segment, points, reasons) and Score now. The reasons are the last `score` activity's, or the
// answer of Score now; a 409 `no_scoring_profile` turns the card into the "set up scoring" note.
const props = defineProps({ company: { type: Object, required: true } });
const notify = useNotifyStore();
const canSetUp = computed(() => useAccessStore().can(AREAS.LEADS_SETTINGS));
const busy = ref(false);
const noProfile = ref(false);
const result = ref(null);

const lastScore = computed(() => (props.company.activities || []).find((activity) => activity.kind === "score")?.data);
const segment = computed(() => result.value?.segment || props.company.score_segment);
const points = computed(() => result.value?.points ?? props.company.score_points);
const scoredAt = computed(() => (result.value ? new Date().toISOString() : props.company.scored_at));
const reasons = computed(() => (result.value || lastScore.value)?.reasons || []);

async function scoreNow() {
  busy.value = true;
  try {
    result.value = (await POST_Score(props.company.id)).data;
  } catch (err) {
    if (apiErrorCode(err) === "no_scoring_profile") noProfile.value = true;
    else notify.spawnNotification({ msg: extractApiMessage(err, t("leads.common.error")), type: "negative" });
  } finally {
    busy.value = false;
  }
}
</script>

<style scoped>
.score-card__reasons {
  padding-left: var(--space-5);
}
</style>
