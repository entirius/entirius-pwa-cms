<template>
  <div
    class="env-missing absolute fs-300 p-400 t-basic-700 br-50 bg-basic-100 b-basic-300 shadow-down"
  >
    <p class="fs-700 fw-600 txt-center mb-50">Configuration Required</p>
    <p class="fs-300 t-basic-600 txt-center mb-500">
      Required environment variables are missing. Create a
      <code>.env</code> file to get started.
    </p>

    <div v-if="status.errors.length" class="env-missing__section mb-400">
      <p class="fs-200 fw-600 t-negative-400 mb-200">Missing required</p>
      <div
        v-for="v in status.errors"
        :key="v.key"
        class="env-missing__row p-200 mb-100 br-25 bg-negative-100"
      >
        <code class="fw-600 t-negative-500">{{ v.key }}</code>
        <span class="fs-200 t-basic-600 ml-200">{{ v.description }}</span>
      </div>
    </div>

    <div v-if="status.warnings.length" class="env-missing__section mb-400">
      <p class="fs-200 fw-600 t-warning-400 mb-200">Missing optional</p>
      <div
        v-for="v in status.warnings"
        :key="v.key"
        class="env-missing__row p-200 mb-100 br-25 bg-warning-100"
      >
        <code class="fw-600 t-warning-500">{{ v.key }}</code>
        <span class="fs-200 t-basic-600 ml-200">{{ v.description }}</span>
      </div>
    </div>

    <div class="env-missing__quickstart p-300 br-25 bg-basic-200">
      <p class="fs-200 fw-600 t-basic-800 mb-200">Quick start</p>
      <code class="fs-200 t-basic-600">cp .env.example .env</code>
      <p class="fs-200 t-basic-500 mt-200">
        Then fill in the required values and restart the dev server.
      </p>
    </div>
  </div>
</template>

<script setup>
defineProps({
  status: {
    type: Object,
    required: true,
  },
});
</script>

<style lang="scss" scoped>
.env-missing {
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 340px;
  max-height: 90vh;
  overflow-y: auto;

  @media screen and (min-width: 768px) {
    width: 530px;
  }

  &__row {
    display: flex;
    align-items: baseline;
    flex-wrap: wrap;
    gap: 4px;

    code {
      font-size: 0.8em;
    }
  }

  &__quickstart {
    code {
      display: block;
      font-size: 0.85em;
      padding: 8px 12px;
      border-radius: 4px;
      background: var(--c-basic-300);
      color: var(--c-basic-800);
    }
  }
}
</style>
