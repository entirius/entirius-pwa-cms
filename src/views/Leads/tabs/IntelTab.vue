<template>
  <section class="ld-field" data-testid="company-intel">
    <IntelCard :context="company" expanded />
    <p v-if="!audit" class="ld-muted" data-testid="intel-no-audit">{{ $t("leads.intel.no_audit") }}</p>
    <template v-else>
      <p>{{ $t("leads.intel.audit_status") }}: <strong data-testid="intel-audit-status">{{ audit.status }}</strong></p>
      <table class="table-basic ld-table" data-testid="intel-scores">
        <tbody>
          <tr v-for="(summary, strategy) in strategies" :key="strategy" :data-testid="`intel-score-${strategy}`">
            <th>{{ $t(`leads.intel.strategy.${strategy}`) }}</th>
            <td>{{ scoreText(summary) }}</td>
          </tr>
        </tbody>
      </table>
      <h3>{{ $t("leads.intel.sources") }}</h3>
      <ul>
        <li v-for="report in audit.reports" :key="report.source" data-testid="intel-source">
          {{ report.source }} — {{ report.status }}
        </li>
      </ul>
    </template>
  </section>
</template>

<script setup>
import { computed, onMounted, ref } from "vue";
import { t } from "@/i18n";
import { GET_LatestAudit } from "@/api/siteintel/api";
import IntelCard from "../IntelCard.vue";

// Intel of the company: hooks + platform, lighthouse performance per strategy and every source of the latest audit.
const props = defineProps({ company: { type: Object, required: true } });
const audit = ref(null);

const strategies = computed(() => {
  const lighthouse = audit.value?.reports.find((report) => report.source === "lighthouse");
  return lighthouse?.processed?.strategies || {};
});

function scoreText(summary) {
  const score = summary?.scores?.performance;
  return typeof score === "number" ? `${Math.round(score * 100)} / 100` : t("leads.intel.unavailable");
}

onMounted(async () => {
  audit.value = await GET_LatestAudit(props.company.domain);
});
</script>
