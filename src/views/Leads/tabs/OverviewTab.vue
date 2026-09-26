<template>
  <section class="ld-field" data-testid="company-overview">
    <table class="ld-table">
      <tbody>
        <tr><th>{{ $t("leads.company.name") }}</th><td>{{ company.name }}</td></tr>
        <tr><th>{{ $t("leads.company.stage") }}</th><td data-testid="overview-stage">{{ company.stage.label }}</td></tr>
        <tr><th>{{ $t("leads.company.type") }}</th><td data-testid="overview-type">{{ leadTypes.label(company.lead_type) }}</td></tr>
        <tr><th>{{ $t("leads.company.last_activity") }}</th><td>{{ formatDate(company.last_activity_at) }}</td></tr>
        <tr v-if="company.customer_uid">
          <th>{{ $t("leads.company.customer") }}</th>
          <td data-testid="overview-customer">
            <router-link v-if="hasAccounts" class="ld-link" :to="customerRoute">{{ customerName }}</router-link>
            <template v-else>{{ customerName }}</template>
          </td>
        </tr>
      </tbody>
    </table>
    <h3>{{ $t("leads.company.activities") }}</h3>
    <ul class="ld-field">
      <li v-for="activity in company.activities" :key="activity.id">
        <span class="ld-muted">{{ formatDate(activity.created_at) }}</span> {{ activityText(activity.message) }}
      </li>
    </ul>
  </section>
</template>

<script setup>
import { computed } from "vue";
import { useRoute } from "vue-router";
import { useMuninStore } from "@/stores/munin";
import { useLeadTypesStore } from "@/stores/leadTypes";
import { activityText } from "@/utils/leadsLabels";
import { formatTime } from "@/utils/leadsTime";

const props = defineProps({ company: { type: Object, required: true } });
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
</script>
