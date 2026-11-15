<template>
  <section class="flex-column gap-5" data-testid="candidate-list">
    <Loader v-if="loading && !rows.length" block />
    <p v-else-if="error && !rows.length" class="t-negative m-0" role="alert" data-testid="candidates-error">{{ error }}</p>
    <EmptyState v-else-if="!rows.length" icon="empty" size="sm" :title="$t('leads.prospecting.empty')" data-testid="candidates-empty" />
    <BasicCard
      v-for="row in pageRows"
      :key="row.id"
      :title="`${row.first_name} ${row.last_name}`"
      gap
      :data-candidate="row.id"
      data-testid="candidate"
    >
      <p class="m-0">
        <span data-testid="candidate-title">{{ row.job_title || $t("leads.prospecting.no_title") }}</span>
        <template v-if="!subjectRef"> · <strong data-testid="candidate-company">{{ row.company_name }}</strong></template>
      </p>
      <p class="m-0" data-testid="candidate-email">{{ row.email || $t("leads.prospecting.no_email") }}</p>
      <ul class="candidate__checks m-0" data-testid="candidate-checks">
        <li v-for="check in row.checks" :key="check.kind" :data-check="check.kind" :data-result="check.result" data-testid="candidate-check">
          <StatusBadge :tone="check.result === 'ok' ? 'positive' : 'warning'" :label="$t(`leads.prospecting.result.${check.result}`)" />
          <span>{{ $t(`leads.prospecting.check.${check.kind}`) }}</span>
          <span v-if="check.value" class="t-secondary">— {{ check.value }}</span>
          <span class="t-secondary fs-200" data-testid="candidate-check-source">{{ sourceText(check) }}</span>
        </li>
      </ul>
      <p v-if="row.missing.length" class="t-warning m-0" data-testid="candidate-missing">
        {{ $t("leads.prospecting.missing", { list: row.missing.map((kind) => $t(`leads.prospecting.check.${kind}`)).join(", ") }) }}
      </p>
      <p class="t-secondary fs-200 m-0" data-testid="candidate-source">
        {{ $t("leads.prospecting.found", { source: row.source || "—", date: dateText(row.found_at) }) }}
      </p>
      <div v-if="row.status === 'pending'" class="flex gap-5">
        <BasicButton mutates :loading="busy === row.id" :disabled="!row.email" data-testid="candidate-accept" @click="accept(row)">
          {{ $t("leads.prospecting.accept") }}
        </BasicButton>
        <BasicButton variant="ghost" mutates :disabled="busy === row.id" data-testid="candidate-reject" @click="reject(row)">
          {{ $t("leads.prospecting.reject") }}
        </BasicButton>
      </div>
      <StatusBadge
        v-else
        :tone="row.status === 'accepted' ? 'positive' : 'neutral'"
        :label="$t(`leads.prospecting.status.${row.status}`)"
        data-testid="candidate-status"
      />
    </BasicCard>
    <Pagination v-if="pages > 1" v-model:page="page" :pages="pages" data-testid="candidates-pages" />
  </section>
</template>

<script setup>
import { computed, onMounted, ref, watch } from "vue";
import { t } from "@/i18n";
import { GET_Candidates, POST_CandidateAccept, POST_CandidateReject } from "@/api/prospecting/api";
import { extractApiMessage } from "@/composables/useFormErrors";
import { useNotifyStore } from "@/stores/notify";
import { formatLeadsDay } from "@/utils/leadsTime";

// U3: candidates for a company (the company card's People tab, `subjectRef`) or of every company (Prospecting →
// People). Every check shows its result — "No information" when it is still missing after every try — with source
// and date. Only an accepted person becomes a contact in leads, so only an accepted person can be mailed.
const props = defineProps({
  subjectRef: { type: String, default: "" },
  status: { type: String, default: "" },
});
const emit = defineEmits(["count", "changed"]);
const notify = useNotifyStore();
const rows = ref([]);
const loading = ref(true);
const error = ref("");
const busy = ref(null);
// The service sends up to 200 candidates in one answer (no server paging): the list pages them here.
const PAGE_SIZE = 20;
const page = ref(1);
const pages = computed(() => Math.ceil(rows.value.length / PAGE_SIZE));
const pageRows = computed(() => rows.value.slice((page.value - 1) * PAGE_SIZE, page.value * PAGE_SIZE));

const dateText = (value) => (value ? formatLeadsDay(value) : "—");
const sourceText = (check) =>
  check.result === "ok"
    ? t("leads.prospecting.checked", { source: check.source || "—", date: dateText(check.checked_at) })
    : t("leads.prospecting.tries", { n: check.attempts });

async function load() {
  loading.value = true;
  try {
    const params = { subject_ref: props.subjectRef || undefined, status: props.status || undefined };
    rows.value = (await GET_Candidates(params)).data.results;
    page.value = 1;
    error.value = "";
    emit("count", rows.value.filter((row) => row.status === "pending").length);
  } catch (err) {
    error.value = extractApiMessage(err, t("leads.common.error"));
  } finally {
    loading.value = false;
  }
}

// Accept can be refused for two reasons the person can act on: the address was erased (GDPR), or the company is not
// in this channel any more.
function refusalText(err) {
  const message = extractApiMessage(err, "");
  if (/erased_address/.test(message)) return t("leads.prospecting.erased_address");
  if (/no company/.test(message)) return t("leads.prospecting.no_company");
  return message || t("leads.common.error");
}

async function decide(row, call, messageKey) {
  busy.value = row.id;
  try {
    const updated = (await call()).data;
    rows.value = rows.value.map((item) => (item.id === row.id ? updated : item));
    notify.spawnNotification({ msg: t(messageKey, { name: `${row.first_name} ${row.last_name}` }), type: "positive" });
    emit("count", rows.value.filter((item) => item.status === "pending").length);
    emit("changed");
  } catch (err) {
    notify.spawnNotification({ msg: refusalText(err), type: "negative" });
  } finally {
    busy.value = null;
  }
}

const accept = (row) => decide(row, () => POST_CandidateAccept(row.id), "leads.prospecting.accepted");
const reject = (row) => decide(row, () => POST_CandidateReject(row.id), "leads.prospecting.rejected");

watch(() => [props.subjectRef, props.status], load);
onMounted(load);
</script>

<style scoped>
.candidate__checks {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  padding: 0;
  list-style: none;
}
.candidate__checks li {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-3);
}
</style>
