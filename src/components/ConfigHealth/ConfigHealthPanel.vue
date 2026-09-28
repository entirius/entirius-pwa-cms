<template>
  <div class="cfg-panel" data-testid="config-health-panel">
    <div class="cfg-panel__head">
      <p class="cfg-panel__title">{{ $t("config_health.title") }}</p>
      <IconButton
        icon="close"
        :label="$t('config_health.close')"
        @click="emit('close')"
      />
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
        <span v-if="row.detail" class="cfg-row__detail">{{ row.detail }}</span>
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
        <FontAwesomeIcon :icon="$icons.success" class="cfg-grid__tick" />{{
          checkName(row.code)
        }}
      </li>
    </ul>

    <div class="cfg-panel__foot">
      <span class="cfg-panel__age">{{ checkedAgo }}</span>
      <BasicButton
        variant="secondary"
        :disabled="store.checking"
        data-testid="config-health-recheck"
        @click="store.recheck()"
      >
        {{ $t("config_health.check_again") }}
      </BasicButton>
    </div>
  </div>
</template>

<script setup>
import { computed } from "vue";
import { t } from "@/i18n";
import { useConfigHealthStore } from "@/stores/configHealth";
import { checkName, checkText, isInternalFix } from "@/utils/configHealth";

// The configuration-health panel (BasicMenu `panel` mode in ConfigHealthButton: the menu anchors it, names it and
// closes it on Esc). `close` asks the menu to close: the close button, and a fix link.
const emit = defineEmits(["close"]);
const store = useConfigHealthStore();

const checkedAgo = computed(() => {
  if (!store.checkedAt) return "";
  const minutes = Math.floor(
    (Date.now() - new Date(store.checkedAt).getTime()) / 60000
  );
  return minutes < 1
    ? t("config_health.checked_now")
    : t("config_health.checked_ago", { minutes });
});
</script>

<style lang="scss" scoped>
@import "@/assets/scss/utils/touch-target";

.cfg-panel {
  width: 20rem;
  max-width: 100%;
  max-height: 60vh;
  overflow-y: auto;
}
.cfg-panel__head {
  position: sticky;
  top: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-3) var(--space-2) var(--space-2) var(--space-4);
  background: var(--surface-raised);
  border-bottom: 1px solid var(--border-subtle);
}
.cfg-panel__title {
  margin: 0;
  font-weight: 600;
}
.cfg-panel__ok {
  margin: 0;
  padding: var(--space-4);
  color: var(--text-secondary);
}
.cfg-row {
  display: flex;
  gap: var(--space-3);
  align-items: flex-start;
  padding: var(--space-3) var(--space-4);
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
  font-size: var(--fs-200);
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
  gap: var(--space-1) var(--space-4);
  margin: 0;
  padding: var(--space-3) var(--space-4);
  list-style: none;
  font-size: var(--fs-200);
  color: var(--text-muted);
}
.cfg-grid__tick {
  margin-right: var(--space-1);
  color: var(--positive);
}
.cfg-panel__foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-4);
  padding: var(--space-2) var(--space-4);
  border-top: 1px solid var(--border-subtle);
}
.cfg-panel__age {
  font-size: var(--fs-200);
  color: var(--text-muted);
}
/* Phone: the close button keeps its 32 px box inside a 40 px hit area (BasicButton clips, so it stops clipping). */
.cfg-panel__head .button-basic--icon {
  @include touch-target;
  @include max-tablet {
    overflow: visible;
  }
}
</style>
