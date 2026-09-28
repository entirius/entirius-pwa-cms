<template>
  <PageLayout class="fs-300 t-body">
    <template #header>
      <PageHeader :title="$t('dp.types')" />
    </template>
      <!-- Inline create row -->
      <div class="create-row mb-10">
        <BasicInput v-model="code" :placeholder="$t('dp.code')" />
        <BasicButton @click="create">{{ $t("common.add") }}</BasicButton>
      </div>
      <DataTable :rows="rows" />
  </PageLayout>
</template>
