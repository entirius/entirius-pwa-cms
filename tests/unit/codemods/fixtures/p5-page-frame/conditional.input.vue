<template>
  <div class="page-pad h-100 ov-h">
    <Loader block v-if="loading" />
    <div v-else-if="order" class="page-card h-100 ovy-auto">
      <PageHeader :title="order.name" class="mb-10" />
      <p>{{ order.total }}</p>
    </div>
  </div>
</template>
