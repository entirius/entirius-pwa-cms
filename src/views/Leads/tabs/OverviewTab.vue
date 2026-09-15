<template>
  <section class="ld-field" data-testid="company-overview">
    <table class="ld-table">
      <tbody>
        <tr><th>{{ $t("leads.company.name") }}</th><td>{{ company.name }}</td></tr>
        <tr><th>{{ $t("leads.company.stage") }}</th><td data-testid="overview-stage">{{ company.stage.label }}</td></tr>
        <tr><th>{{ $t("leads.company.type") }}</th><td>{{ company.company_type }}</td></tr>
        <tr><th>{{ $t("leads.company.last_activity") }}</th><td>{{ formatDate(company.last_activity_at) }}</td></tr>
        <tr v-if="company.customer_uid"><th>{{ $t("leads.company.customer") }}</th><td>{{ company.customer_uid }}</td></tr>
      </tbody>
    </table>
    <h3>{{ $t("leads.company.activities") }}</h3>
    <ul class="ld-field">
      <li v-for="activity in company.activities" :key="activity.id">
        <span class="ld-muted">{{ formatDate(activity.created_at) }}</span> {{ activity.message }}
      </li>
    </ul>
  </section>
</template>

<script setup>
import { formatTime } from "@/utils/leadsTime";

defineProps({ company: { type: Object, required: true } });
const formatDate = (iso) => formatTime(iso) || "—";
</script>
