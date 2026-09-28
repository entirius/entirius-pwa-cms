<template>
  <PageLayout>
    <Loader block v-if="loading" />
    <template v-else-if="order">
      <PageHeader :title="order.name" class="mb-10" />
      <p>{{ order.total }}</p>
    </template>
  </PageLayout>
</template>
