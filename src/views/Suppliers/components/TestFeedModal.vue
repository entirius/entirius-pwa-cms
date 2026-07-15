<template>
  <Teleport to="body">
    <Transition name="modal">
      <div
        v-if="visible"
        class="test-feed-overlay"
        @click.self="$emit('close')"
        data-testid="test-feed-modal"
      >
        <div class="test-feed-container bg-basic-100 b-basic-300 br-100 p-400">
          <div class="flex ai-ct jc-sb mb-200">
            <h2 class="fs-400 fw-600">{{ $t("suppliers.feeds.test.title") }}</h2>
            <button
              class="test-feed__close"
              data-testid="test-feed-close"
              @click="$emit('close')"
            >
              <FontAwesomeIcon icon="xmark" />
            </button>
          </div>

          <Loader v-show="busy" />

          <div v-if="!busy && result?.is_async" class="t-basic-700 fs-300">
            <p>
              {{
                $t("suppliers.feeds.test.async_dispatched", {
                  task_id: result.task_id,
                })
              }}
            </p>
          </div>

          <div v-else-if="!busy && result?.is_suppressed" class="t-warning-300 fs-300">
            <p>{{ $t("suppliers.feeds.test.suppressed") }}</p>
          </div>

          <div v-else-if="!busy && Array.isArray(result?.raw_products)">
            <p class="t-basic-500 fs-200 mb-200">
              {{
                $t("suppliers.feeds.test.results_count", {
                  count: result.raw_products.length,
                })
              }}
            </p>
            <div class="test-feed__list ovy-auto">
              <div
                v-for="(p, i) in result.raw_products"
                :key="i"
                class="test-feed__row b-basic-300 br-sm p-200 mb-100"
                :data-testid="`test-feed-row-${i}`"
              >
                <div class="flex ai-ct gap-200 flex-wrap fs-200">
                  <strong>{{ p.external_id }}</strong>
                  <span class="t-basic-700">{{ p.name }}</span>
                  <span v-if="p.cost" class="t-basic-600">
                    {{ formatCost(p.cost, p.currency) }}
                  </span>
                  <span v-if="p.ean" class="t-basic-500">EAN: {{ p.ean }}</span>
                  <span class="t-basic-500">stock: {{ p.stock ?? 0 }}</span>
                </div>
              </div>
            </div>
          </div>

          <div v-else-if="!busy && error" class="t-negative-300 fs-300">
            <p>{{ error }}</p>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script>
import { formatCost } from "@/utils/format";

export default {
  name: "TestFeedModal",
  props: {
    visible: { type: Boolean, default: false },
    busy: { type: Boolean, default: false },
    result: { type: Object, default: null },
    error: { type: String, default: "" },
  },
  emits: ["close"],
  methods: { formatCost },
};
</script>

<style lang="scss" scoped>
.test-feed-overlay {
  position: fixed;
  inset: 0;
  background: var(--overlay-backdrop);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
  padding: var(--space-300);
}
.test-feed-container {
  width: min(720px, 100%);
  max-height: 80vh;
  display: flex;
  flex-direction: column;
}
.test-feed__close {
  background: transparent;
  border: none;
  font-size: 18px;
  color: var(--c-basic-500);
  cursor: pointer;
}
.test-feed__close:hover {
  color: var(--c-basic-700);
}
.test-feed__list {
  max-height: 50vh;
}
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.15s ease;
}
.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}
</style>
