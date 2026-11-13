<template>
  <BasicCard :title="$t('leads.deals.title')" data-testid="company-deals">
    <template #actions>
      <ActionBar v-if="deals.length" :actions="actions" :labelled="false" />
    </template>
    <Loader v-if="loading" block />
    <EmptyState v-else-if="!deals.length" icon="empty" size="md" :title="$t('leads.deals.empty')">
      <ActionBar :actions="actions" :labelled="false" />
    </EmptyState>
    <div v-else class="flex-column gap-4">
      <div class="filter-chip-row">
        <FilterChip
          v-for="value in DEAL_KINDS"
          :key="value"
          :label="dealKindLabel(value)"
          :count="counts[value]"
          :active="kind === value"
          :data-testid="`company-deals-chip-${value}`"
          @click="kind = value"
        />
      </div>
      <DataTable :columns="columns" :rows="rows" row-key="id" :row-attrs="rowAttrs" :empty-text="$t('leads.deals.none_match')" @row-click="openDeal">
        <template #cell-stage="{ row }">
          <StatusBadge :tone="dealKindTone(row.stage.kind)" :label="row.stage.label" />
        </template>
      </DataTable>
    </div>
    <DealDialog v-model:open="dialogOpen" :company="company" />
  </BasicCard>
</template>

<script setup>
import { computed, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import { t } from "@/i18n";
import { GET_CompanyDeals } from "@/api/leads/api";
import { extractApiMessage } from "@/composables/useFormErrors";
import { useNotifyStore } from "@/stores/notify";
import DealDialog from "../DealDialog.vue";
import { DEAL_KINDS, dealKindLabel, dealKindTone, dealValue } from "../deals";

// Company card → Deals: the company's deals by status (chips with the card's counts), Open deal with the company,
// its owner (server side) and the channel's currency pre-filled.
const props = defineProps({ company: { type: Object, required: true } });
const router = useRouter();
const notify = useNotifyStore();
const deals = ref([]);
const loading = ref(true);
const kind = ref("open");
const dialogOpen = ref(false);

const counts = computed(() => props.company.deals || {});
const actions = computed(() => [
  { key: "open", label: t("leads.deals.open_deal"), role: "secondary", mutates: true, testid: "company-open-deal", onClick: () => (dialogOpen.value = true) },
]);
const columns = computed(() => [
  { key: "title", label: t("leads.deals.col_deal"), width: "1fr" },
  { key: "stage", label: t("leads.deals.stage"), width: "max-content" },
  { key: "value", label: t("leads.deals.col_value"), numeric: true, priority: 2 },
]);
const rows = computed(() => deals.value.filter((deal) => deal.stage.kind === kind.value).map((deal) => ({ ...deal, value: dealValue(deal) })));
const rowAttrs = (row) => ({ "data-testid": "deal-row", "data-deal": row.id });
const openDeal = (row) => router.push({ name: "LeadsDeal", params: { id: row.id } });

onMounted(async () => {
  try {
    deals.value = (await GET_CompanyDeals(props.company.id)).data.results;
  } catch (err) {
    notify.spawnNotification({ msg: extractApiMessage(err, t("leads.common.error")), type: "negative" });
  } finally {
    loading.value = false;
  }
});
</script>
