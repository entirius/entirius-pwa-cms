<template>
  <CatalogueSection id="shell" :title="$t('ui_catalogue.sections.shell')">
    <p class="fs-300 t-muted">{{ $t("ui_catalogue.stub", { plan: "21" }) }}</p>
  </CatalogueSection>
</template>

<script setup>
// Stub: plan 21 fills this section (one CatalogueSection per component, cells per variant × state).
import CatalogueSection from "../CatalogueSection.vue";
</script>
