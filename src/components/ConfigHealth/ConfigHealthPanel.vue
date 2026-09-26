<template>
  <div class="cfg-sheet" :style="anchorStyle" data-testid="config-health-sheet">
    <div class="cfg-sheet__backdrop" @click="emit('close')"></div>
    <div
      class="cfg-panel"
      role="dialog"
      :aria-label="$t('config_health.title')"
      data-testid="config-health-panel"
    >
      <div class="cfg-panel__head">
        <span class="cfg-panel__grip" aria-hidden="true"></span>
        <p class="cfg-panel__title">{{ $t("config_health.title") }}</p>
        <button
          class="cfg-panel__close"
          :aria-label="$t('config_health.close')"
          @click="emit('close')"
        >
          <FontAwesomeIcon icon="xmark" />
        </button>
      </div>

      <p
        v-if="!store.failing.length"
        class="cfg-panel__ok"
        data-testid="config-health-ok"
      >
        {{ $t("config_health.all_ok") }}
      </p>
      <div
        v-for="row in store.failing"
        :key="`${row.code}:${row.scope}`"
        class="cfg-row"
        :class="`cfg-row--${row.severity}`"
        data-testid="config-health-row"
      >
        <span class="cfg-row__text">
          <span class="cfg-row__title">{{ checkText(row) }}</span>
          <span v-if="row.detail" class="cfg-row__detail">{{
            row.detail
          }}</span>
        </span>
        <router-link
          v-if="isInternalFix(row.fix_url)"
          :to="row.fix_url"
          class="cfg-row__fix"
          data-testid="config-health-fix"
          @click="emit('close')"
        >
          {{ $t("config_health.fix") }}
        </router-link>
        <a
          v-else-if="row.fix_url"
          :href="row.fix_url"
          target="_blank"
          rel="noopener"
          class="cfg-row__fix"
          data-testid="config-health-fix"
        >
          {{ $t("config_health.fix") }}
        </a>
      </div>

      <ul
        v-if="store.passing.length"
        class="cfg-grid"
        data-testid="config-health-passing"
      >
        <li v-for="row in store.passing" :key="row.code" class="cfg-grid__item">
          <FontAwesomeIcon icon="circle-check" class="cfg-grid__tick" />{{
            checkName(row.code)
          }}
        </li>
      </ul>

      <div class="cfg-panel__foot">
        <span class="cfg-panel__age">{{ checkedAgo }}</span>
        <button
          class="cfg-panel__again"
          :disabled="store.checking"
          data-testid="config-health-recheck"
          @click="store.recheck()"
        >
          {{ $t("config_health.check_again") }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted } from "vue";
import { t } from "@/i18n";
import { useConfigHealthStore } from "@/stores/configHealth";
import { checkName, checkText, isInternalFix } from "@/utils/configHealth";

// Phone: a bottom sheet. Desktop (>= 1024 px): a popover under the header icon (`anchor` = viewport offsets).
const props = defineProps({ anchor: { type: Object, default: null } });
const emit = defineEmits(["close"]);
const store = useConfigHealthStore();

const anchorStyle = computed(() =>
  props.anchor
    ? {
        "--cfg-top": `${props.anchor.top}px`,
        "--cfg-right": `${props.anchor.right}px`,
      }
    : {}
);

const checkedAgo = computed(() => {
  if (!store.checkedAt) return "";
  const minutes = Math.floor(
    (Date.now() - new Date(store.checkedAt).getTime()) / 60000
  );
  return minutes < 1
    ? t("config_health.checked_now")
    : t("config_health.checked_ago", { minutes });
});

const onKey = (event) => event.key === "Escape" && emit("close");
onMounted(() => document.addEventListener("keydown", onKey));
onBeforeUnmount(() => document.removeEventListener("keydown", onKey));
</script>

<style scoped>
.cfg-sheet__backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.32);
  z-index: 90;
}
.cfg-panel {
  position: fixed;
  left: 50%;
  bottom: 0;
  transform: translateX(-50%);
  width: min(32rem, 100vw);
  max-height: 70vh;
  overflow-y: auto;
  padding-bottom: max(0.75rem, env(safe-area-inset-bottom));
  background: var(--surface-base);
  border-radius: 1rem 1rem 0 0;
  box-shadow: 0 -8px 24px rgba(0, 0, 0, 0.16);
  z-index: 91;
}
.cfg-panel__head {
  position: sticky;
  top: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 0.5rem 0.5rem 1rem;
  background: var(--surface-base);
  border-bottom: 1px solid var(--border-subtle);
}
.cfg-panel__grip {
  position: absolute;
  top: 0.35rem;
  left: 50%;
  width: 2.5rem;
  height: 0.25rem;
  margin-left: -1.25rem;
  border-radius: 999px;
  background: var(--surface-hover);
}
.cfg-panel__title {
  margin: 0;
  font-weight: 600;
}
.cfg-panel__close {
  width: 44px;
  height: 44px;
  border: none;
  border-radius: 8px;
  background: none;
  color: var(--text-secondary);
  cursor: pointer;
}
.cfg-panel__ok {
  margin: 0;
  padding: 1rem;
  color: var(--text-secondary);
}
.cfg-row {
  display: flex;
  gap: 0.75rem;
  align-items: flex-start;
  padding: 0.75rem 1rem;
  border-bottom: 1px solid var(--border-subtle);
  border-left: 3px solid var(--warning);
  color: var(--text-body);
}
.cfg-row--high {
  border-left-color: var(--negative);
}
.cfg-row__text {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 0.15rem;
  min-width: 0;
}
.cfg-row__title {
  overflow-wrap: anywhere;
}
.cfg-row__detail {
  font-size: var(--fs-100);
  color: var(--text-secondary);
  overflow-wrap: anywhere;
}
.cfg-row__fix {
  flex-shrink: 0;
  min-height: 44px;
  display: flex;
  align-items: center;
  font-weight: 600;
  color: var(--text-accent);
}
.cfg-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem 1rem;
  margin: 0;
  padding: 0.75rem 1rem;
  list-style: none;
  font-size: var(--fs-100);
  color: var(--text-muted);
}
.cfg-grid__tick {
  margin-right: 0.35rem;
  color: var(--positive);
}
.cfg-panel__foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.5rem 1rem;
  border-top: 1px solid var(--border-subtle);
}
.cfg-panel__age {
  font-size: var(--fs-100);
  color: var(--text-muted);
}
.cfg-panel__again {
  min-height: 44px;
  padding: 0 0.75rem;
  border: 1px solid var(--border-subtle);
  border-radius: 8px;
  background: none;
  color: var(--text-body);
  cursor: pointer;
}
.cfg-panel__again:disabled {
  opacity: 0.5;
  cursor: wait;
}
@media (min-width: 1024px) {
  .cfg-sheet__backdrop {
    background: transparent;
  }
  .cfg-panel {
    top: var(--cfg-top, 3.5rem);
    right: var(--cfg-right, 1rem);
    bottom: auto;
    left: auto;
    transform: none;
    width: 26rem;
    max-height: 60vh;
    padding-bottom: 0;
    border-radius: 0.75rem;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.16);
  }
  .cfg-panel__grip {
    display: none;
  }
}
</style>
