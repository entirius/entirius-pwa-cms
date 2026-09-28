<template>
  <div class="page-pad fs-300 t-body h-100 ov-h">
    <div class="page-card h-100 ovy-auto relative">
      <div class="page-card detail-section mb-10">{{ name }}</div>
    </div>
    <section class="panel">
      <div class="page-card h-100 ovy-auto">{{ name }}</div>
    </section>
    <PageLayout>
      <Loader v-if="loading" />
      <template v-else>
        <PageHeader :title="name" />
      </template>
    </PageLayout>
    <PageLayout>
      <template v-if="!loading" #header><PageHeader :title="name" /></template>
    </PageLayout>
  </div>
</template>
