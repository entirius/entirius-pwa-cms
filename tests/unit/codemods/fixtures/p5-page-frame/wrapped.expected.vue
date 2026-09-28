<template>
  <PageLayout class="list__wrapper fs-300 t-body" data-fid="list">
    <Teleport to="#faq-toolbar-right" defer>
      <BasicButton variant="primary">{{ $t("common.save") }}</BasicButton>
    </Teleport>
    <template #header>
      <PageHeader
        :title="$t('faq.title')"
      />
    </template>
    <template #toolbar>
      <div class="flex ai-ct">
        <BasicInput v-model="search" type="search" />
      </div>
    </template>
      <Teleport v-if="ready" to="#faq-toolbar-left" defer><span>{{ title }}</span></Teleport>
      <Loader v-show="loading" />
      <DataTable v-show="!loading" :rows="rows" />
    <Pagination :total="total" />
  </PageLayout>
</template>

<script setup>
// page-card stays in the script: only the template is rewritten.
</script>
