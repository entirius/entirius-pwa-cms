<template>
  <p
    v-for="row in rows"
    :key="`${row.code}:${row.scope}`"
    class="config-banner"
    :class="`config-banner--${row.severity}`"
    role="status"
    data-testid="config-banner"
    :data-code="row.code"
  >
    <span>{{ checkText(row) }}</span>
    <a
      v-if="row.fix_url && !isInternalFix(row.fix_url)"
      :href="row.fix_url"
      target="_blank"
      rel="noopener"
      class="config-banner__fix"
    >
      {{ $t("config_health.fix") }}
    </a>
    <router-link
      v-else-if="row.fix_url"
      :to="row.fix_url"
      class="config-banner__fix"
      >{{ $t("config_health.fix") }}</router-link
    >
  </p>
</template>

<script setup>
import { computed } from "vue";
import { useConfigHealthStore } from "@/stores/configHealth";
import { checkText, isInternalFix } from "@/utils/configHealth";

// The failing rows of one check on the screen that depends on it — same text as the header panel.
const props = defineProps({ code: { type: String, required: true } });
const store = useConfigHealthStore();
const rows = computed(() => store.failingFor(props.code));
</script>

<style scoped>
.config-banner {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-200);
  justify-content: space-between;
  margin: 0;
  padding: var(--space-200) var(--space-300);
  border-radius: 8px;
  background: var(--warning-subtle);
  color: var(--text-body);
}
.config-banner--high {
  background: var(--negative-subtle);
}
.config-banner__fix {
  font-weight: 600;
  color: inherit;
}
</style>
