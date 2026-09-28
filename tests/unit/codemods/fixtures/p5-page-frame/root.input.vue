<template>
  <div class="page-card flex-1 ovy-auto">
    <PageHeader :title="$t('stock.title')" class="mb-10" />
    <div class="stock__toolbar mb-8 flex">
      <BasicButton>{{ $t("common.import") }}</BasicButton>
    </div>
    <DataTable :rows="rows" />
  </div>
</template>
