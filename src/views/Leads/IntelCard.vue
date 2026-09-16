<template>
  <section class="intel" data-testid="intel-card">
    <button
      class="intel__toggle"
      :aria-expanded="String(open)"
      data-testid="intel-toggle"
      @click="open = !open"
    >
      <span>{{ $t("leads.intel.title") }}</span>
      <FontAwesomeIcon :icon="open ? 'chevron-up' : 'chevron-down'" />
    </button>
    <div v-if="open" class="intel__body" data-testid="intel-body">
      <p v-if="context.platform" class="intel__fact">
        {{ $t("leads.intel.platform") }}: <strong>{{ context.platform }}</strong>
      </p>
      <p v-if="context.industry" class="intel__fact">
        {{ $t("leads.intel.industry") }}: <strong>{{ context.industry }}</strong>
      </p>
      <ul v-if="hooks.length" class="intel__hooks">
        <li v-for="(hook, i) in hooks" :key="i">
          <strong>{{ hook.challenge }}</strong>
          <span v-if="hook.business_cost"> — {{ hook.business_cost }}</span>
        </li>
      </ul>
      <p v-else class="intel__fact" data-testid="intel-no-hooks">{{ $t("leads.intel.no_hooks") }}</p>
    </div>
  </section>
</template>

<script setup>
import { computed, ref } from "vue";

// Intel and hooks of a company (render_context of a draft or the leads company payload).
const props = defineProps({
  context: { type: Object, default: () => ({}) },
  expanded: { type: Boolean, default: false },
});
const open = ref(props.expanded);
const hooks = computed(() => props.context?.hooks || []);
</script>

<style scoped>
.intel {
  border: 1px solid var(--c-basic-300);
  border-radius: 8px;
  background: var(--c-basic-100);
}
.intel__toggle {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  min-height: 44px;
  padding: 0 var(--space-300);
  border: none;
  background: none;
  color: var(--c-basic-800);
  font-weight: 600;
  cursor: pointer;
}
.intel__body {
  padding: 0 var(--space-300) var(--space-300);
}
.intel__fact {
  margin: 0 0 var(--space-100);
}
.intel__hooks {
  margin: 0;
  padding-left: 1.1rem;
  display: flex;
  flex-direction: column;
  gap: var(--space-100);
}
</style>
