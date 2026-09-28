<template>
  <div class="page-pad fs-300 t-body h-100 ov-h">
    <div class="page-card h-100 ovy-auto">
      <PageHeader :title="$t('dp.types')" class="mb-10" />
      <!-- Inline create row -->
      <div class="create-row mb-10">
        <BasicInput v-model="code" :placeholder="$t('dp.code')" />
        <BasicButton @click="create">{{ $t("common.add") }}</BasicButton>
      </div>
      <DataTable :rows="rows" />
    </div>
  </div>
</template>
