<template>
  <div class="home h-100 ov-h">
    <HomeGlow />
    <PageLayout class="home__page">
      <template #header>
        <PageHeader :overline="greeting" :title="$t('panels.choose_panel')" />
      </template>
      <div class="home__grid">
        <PanelCard
          v-for="(panel, index) in panels"
          :key="panel.idx"
          :data-fid="landmarkOf(index)"
          :icon="panel.icon"
          :title="$t(panel.labelKey)"
          :description="$t(panel.descriptionKey)"
          :locked="!panel.isEnabled"
          :locked-text="$t('panels.contact_admin')"
          @click="$router.push(panel.root)"
        />
      </div>
    </PageLayout>
  </div>
</template>

<script setup>
// Home (Figma S1/S2): the greeting overline and the title in PageHeader, then one PanelCard per panel of the nav
// model (registry order × Munin; locked panels dimmed, or hidden by VUE_APP_HIDE_DISABLED_PANELS).
import { computed } from "vue";
import { useUserStore } from "@/stores/user";
import { usePanels } from "@/composables/useNav";
import { t } from "@/i18n";
import HomeGlow from "./HomeGlow.vue";

// Figma's panel-card landmark is the first card.
const landmarkOf = (index) => (index === 0 ? "panel-card" : undefined);

const userStore = useUserStore();
const panels = usePanels();

const greeting = computed(() => {
  const name = userStore.user?.first_name || userStore.user?.username || "";
  return name ? t("panels.greeting_name", { name }) : t("panels.greeting");
});
</script>

<style lang="scss" scoped>
@import "@/assets/scss/utils/media-query";

.home {
  position: relative;
}

// Above the glow, which sits earlier in the flow.
.home__page {
  position: relative;
}

// Figma S1/S2 frame: the title fills its row, and a phone keeps the desktop rhythm (40 top, 32 to the grid, the
// 30 px title) where PageLayout / PageHeader use 20 / 20 / 20 px (handoff 26: the wave close decides for every page).
.home :deep(.page-header__title) {
  flex: 1 1 auto;
}

@include max-tablet {
  .home .home__page {
    --page-layout-pad-y: var(--space-10);

    gap: var(--space-8);
  }

  .home :deep(.page-header__title) {
    font-size: var(--fs-700);
  }
}

.home__grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--space-3);

  @include max-shell {
    grid-template-columns: repeat(2, 1fr);
  }

  @include max-tablet {
    grid-template-columns: 1fr;
  }
}
</style>
