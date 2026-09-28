<template>
  <PageLayout>
    <template #header>
      <PageHeader :title="$t('stock.title')" />
    </template>
    <template #toolbar>
      <div class="stock__toolbar flex">
        <BasicButton>{{ $t("common.import") }}</BasicButton>
      </div>
    </template>
    <DataTable :rows="rows" />
  </PageLayout>
</template>
