<template>
  <div class="list__wrapper page-pad fs-300 t-body h-100 ov-h" data-fid="list">
    <Teleport to="#faq-toolbar-right" defer>
      <BasicButton variant="primary">{{ $t("common.save") }}</BasicButton>
    </Teleport>
    <div
      class="page-card h-100 ovy-auto"
    >
      <Teleport v-if="ready" to="#faq-toolbar-left" defer><span>{{ title }}</span></Teleport>
      <PageHeader
        :title="$t('faq.title')"
        class="mb-10"
      />
      <div class="flex ai-ct mb-10">
        <BasicInput v-model="search" type="search" />
      </div>
      <Loader v-show="loading" />
      <DataTable v-show="!loading" :rows="rows" />
    </div>
    <Pagination :total="total" />
  </div>
</template>

<script setup>
// page-card stays in the script: only the template is rewritten.
</script>
