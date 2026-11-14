<template>
  <!-- The toolbar of Deals: search, owner chips, then status / stage / close date (list only; the board keeps the chips) -->
  <div class="flex-column gap-4">
    <BasicInput
      v-if="full"
      v-model="search"
      type="search"
      icon="search"
      :placeholder="$t('leads.deals.search')"
      data-testid="deals-search"
      @input="debouncedFetch(applySearch)"
    />
    <div class="flex ai-ct flex-wrap gap-5">
      <div class="filter-chip-row" role="group" :aria-label="$t('leads.deals.col_owner')">
        <FilterChip
          v-for="key in OWNERS"
          :key="key"
          :label="$t(`leads.companies.${OWNER_LABELS[key]}`)"
          :active="query.owner === key"
          :data-testid="`deals-owner-${OWNER_TESTIDS[key]}`"
          @click="$emit('set', { owner: key })"
        />
      </div>
      <MobileFilterPanel v-if="full" :active-count="activeCount" :trigger-label="$t('leads.companies.filters')" data-testid="deals-filters">
        <BasicSelect :model-value="kindValue" :floating-label="$t('leads.deals.status')" :options="kindOptions" clearable data-testid="deals-filter-kind" @update:model-value="$emit('set', { kind: $event || 'all' })" />
        <BasicSelect :model-value="query.stage || null" :floating-label="$t('leads.deals.stage')" :options="stageOptions(stages)" clearable data-testid="deals-filter-stage" @update:model-value="$emit('set', { stage: $event })" />
        <FormField :label="$t('leads.deals.expected_close')" layout="inline">
          <BasicDatePicker :model-value="closeRange" :config="{ mode: 'range', locale: { rangeSeparator: RANGE_SEPARATOR } }" data-testid="deals-filter-close" @update:model-value="setRange" />
        </FormField>
      </MobileFilterPanel>
    </div>
  </div>
</template>

<script setup>
import { computed, watch } from "vue";
import { useSearchDebounce } from "@/composables/useSearchDebounce";
import { ARCHIVED_KIND, DEAL_KINDS, DEFAULT_DEAL_KIND, dealKindLabel, stageOptions } from "./deals";

// `query` = the page's query with its defaults (owner me, status open); every change goes up as `set({ key: value })`.
const props = defineProps({
  query: { type: Object, required: true },
  stages: { type: Array, default: () => [] },
  full: { type: Boolean, default: true },
  // the backend archives deals (plan 27): Archived is the status select's last option
  archivable: { type: Boolean, default: false },
});
const emit = defineEmits(["set"]);
const OWNERS = ["me", "none", "all"];
const OWNER_LABELS = { me: "mine", none: "unassigned", all: "all" };
const OWNER_TESTIDS = { me: "mine", none: "none", all: "all" };
const RANGE_SEPARATOR = " – "; // fixed, so the Polish locale never changes what is parsed
const { search, debouncedFetch } = useSearchDebounce();

const kindOptions = computed(() => [...DEAL_KINDS, ...(props.archivable ? [ARCHIVED_KIND] : [])].map((value) => ({ value, label: dealKindLabel(value) })));
const kindValue = computed(() => (props.query.kind === "all" ? null : props.query.kind));
const closeRange = computed(() => [props.query.close_from, props.query.close_to].filter(Boolean).join(RANGE_SEPARATOR));
// The default status is no filter the person set: the badge counts only what differs from it.
const activeCount = computed(
  () => ["stage", "close_from"].filter((key) => props.query[key]).length + (kindValue.value && kindValue.value !== DEFAULT_DEAL_KIND ? 1 : 0)
);

const applySearch = () => emit("set", { search: search.value.trim() });

function setRange(value) {
  const [from, to] = (value || "").split(RANGE_SEPARATOR);
  if (from && !to) return; // the first click of a range: wait for its end
  emit("set", { close_from: from, close_to: to });
}

// The box follows the URL (Clear filters, back and forward), not only the first load.
watch(() => props.query.search, (value) => (search.value = value || ""), { immediate: true });
</script>
