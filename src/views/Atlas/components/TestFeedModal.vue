<template>
  <Teleport to="body">
    <Transition name="modal">
      <div
        v-if="visible"
        class="test-feed-overlay"
        @click.self="$emit('close')"
        data-testid="test-feed-modal"
      >
        <div class="page-card test-feed-container">
          <div class="flex ai-ct jc-sb mb-5">
            <h2 class="fs-400 fw-600">{{ $t("atlas.feeds.test.title") }}</h2>
            <button
              class="test-feed__close"
              data-testid="test-feed-close"
              @click="$emit('close')"
            >
              <FontAwesomeIcon :icon="$icons.close" />
            </button>
          </div>

          <Loader v-show="busy" />

          <div v-if="!busy && result?.is_async" class="t-body fs-300">
            <p>
              {{
                $t("atlas.feeds.test.async_dispatched", {
                  task_id: result.task_id,
                })
              }}
            </p>
          </div>

          <div v-else-if="!busy && result?.is_suppressed" class="t-warning fs-300">
            <p>{{ $t("atlas.feeds.test.suppressed") }}</p>
          </div>

          <div v-else-if="!busy && Array.isArray(result?.raw_products)">
            <p class="t-muted fs-200 mb-5">
              {{
                $t("atlas.feeds.test.results_count", {
                  count: result.raw_products.length,
                })
              }}
            </p>
            <div class="test-feed__list ovy-auto">
              <div
                v-for="(p, i) in result.raw_products"
                :key="i"
                class="test-feed__row b-subtle rounded p-5 mb-2"
                :data-testid="`test-feed-row-${i}`"
              >
                <div class="flex ai-ct gap-5 flex-wrap fs-200">
                  <strong>{{ p.external_id }}</strong>
                  <span class="t-body">{{ p.name }}</span>
                  <span v-if="p.cost" class="t-secondary">
                    {{ formatCost(p.cost, p.currency) }}
                  </span>
                  <span v-if="p.ean" class="t-muted">EAN: {{ p.ean }}</span>
                  <span class="t-muted">{{ $t("atlas.stock_count", { count: p.stock ?? 0 }) }}</span>
                </div>
              </div>
            </div>
          </div>

          <div v-else-if="!busy && error" class="t-negative fs-300">
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
  padding: var(--space-8);
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
  font-size: var(--fs-500);
  color: var(--text-muted);
  cursor: pointer;
}
.test-feed__close:hover {
  color: var(--text-body);
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
