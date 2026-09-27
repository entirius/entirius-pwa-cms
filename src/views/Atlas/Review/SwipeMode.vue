<template>
  <div class="swipe-mode">
    <!-- Scrollable content area. Action bar is a sibling outside this scroll
         container so it stays docked at the bottom regardless of RawDataPanel
         internal overflow. -->
    <div class="swipe-mode__scroll">
      <Loader block v-show="loading" />

      <div v-if="!loading && !current" class="text-center mt-10">
        <EmptyState
          :title="$t('atlas.review.empty_state_title')"
          :message="$t('atlas.review.empty_state_message')"
          icon="checkboxOn"
        />
      </div>

      <div v-else-if="current" class="swipe-mode__content">
        <p
          class="t-muted fs-200 text-center mb-5"
          data-testid="swipe-counter"
        >
          {{ index + 1 }} / {{ queue.length }}
        </p>

        <div class="swipe-mode__layout">
          <ProductCard
            :product="current"
            @show-raw="rawVisible = true"
            @show-gallery="galleryVisible = true"
          />
          <!-- Desktop-only side panel. Mobile users see the modal via "Show raw data" button. -->
          <div class="swipe-mode__raw-panel">
            <RawDataPanel :product="current" />
          </div>
        </div>
      </div>
    </div>

    <!-- Action bar — sibling of scroll area, always pinned to the bottom of the panel. -->
    <div
      v-if="current"
      class="swipe-mode__actions"
      data-testid="swipe-actions-bar"
    >
      <BasicButton
        variant="danger"
        :disabled="busy"
        data-testid="swipe-reject-btn"
        @click="reviewProduct('reject')"
      >
        {{ $t('atlas.review.reject_button') }}
      </BasicButton>
      <BasicButton
        v-if="!isMonitoringRow"
        variant="secondary"
        :disabled="busy"
        data-testid="swipe-skip-btn"
        @click="reviewProduct('skip')"
      >
        {{ $t('atlas.review.skip_button') }}
      </BasicButton>
      <BasicButton
        v-if="!isMonitoringRow && kind === 'procurement'"
        variant="primary"
        :disabled="busy"
        data-testid="swipe-approve-btn"
        @click="reviewProduct('approve')"
      >
        {{ $t('atlas.review.approve_button') }}
      </BasicButton>
    </div>

    <!-- Mobile-only fallback modal — desktop uses the side panel. -->
    <RawDataModal
      :visible="rawVisible"
      :product="current"
      @close="rawVisible = false"
    />

    <GalleryModal
      :visible="galleryVisible"
      :images="currentImages"
      :product-name="current?.name || ''"
      @close="galleryVisible = false"
    />
  </div>
</template>

<script>
import ProductCard from "./ProductCard.vue";
import { extractApiMessage } from "@/composables/useFormErrors";
import RawDataModal from "./RawDataModal.vue";
import RawDataPanel from "./RawDataPanel.vue";
import GalleryModal from "./GalleryModal.vue";
import { useNotifyStore } from "@/stores/notify";
import {
  GET_SupplierProducts,
  POST_ApproveProduct,
  POST_RejectProduct,
  POST_QueueProduct,
} from "@/api/atlas/api";

const ACTION_FN = {
  approve: POST_ApproveProduct,
  reject: POST_RejectProduct,
  skip: POST_QueueProduct,
};

export default {
  name: "SwipeMode",
  components: { ProductCard, RawDataModal, RawDataPanel, GalleryModal },
  props: {
    filters: { type: Object, required: true },
    kind: { type: String, default: "procurement" },
  },
  emits: ["reviewed"],
  setup() {
    return { notify: useNotifyStore() };
  },
  data() {
    return {
      queue: [],
      index: 0,
      loading: false,
      busy: false,
      rawVisible: false,
      galleryVisible: false,
    };
  },
  computed: {
    current() {
      return this.queue[this.index] || null;
    },
    currentImages() {
      return Array.isArray(this.current?.image_urls)
        ? this.current.image_urls
        : [];
    },
    isMonitoringRow() {
      // Monitoring suppliers never push — approve is meaningless and backend-refused.
      return this.current?.kind === "monitoring";
    },
  },
  watch: {
    filters: {
      handler() {
        this.fetchQueue();
      },
      deep: true,
    },
  },
  mounted() {
    this.fetchQueue();
  },
  methods: {
    async fetchQueue() {
      this.loading = true;
      try {
        const params = { page_size: 50 };
        if (this.filters.supplier && this.filters.supplier !== "__all") {
          params.source = this.filters.supplier;
        }
        if (this.filters.status && this.filters.status !== "__all") {
          params.status = this.filters.status;
        }
        if (this.filters.search) params.search = this.filters.search;
        const { data } = await GET_SupplierProducts(params);
        this.queue = data.results || [];
        this.index = 0;
      } catch (err) {
        this.notify.spawnNotification({
          type: "negative",
          msg: extractApiMessage(err, this.$t("notifications.error")),
        });
      } finally {
        this.loading = false;
      }
    },
    async reviewProduct(action) {
      if (!this.current || this.busy) return;
      this.busy = true;
      try {
        await ACTION_FN[action](this.current.id);
        this.$emit("reviewed", { action, product: this.current });
        this.index += 1;
        if (this.index >= this.queue.length) {
          this.fetchQueue();
        }
      } catch (err) {
        this.notify.spawnNotification({
          type: "negative",
          msg: extractApiMessage(err, this.$t("notifications.error")),
        });
      } finally {
        this.busy = false;
      }
    },
  },
};
</script>

<style lang="scss" scoped>
/* Layout: fill the parent (supplier-review__body) so action bar can dock at the bottom.
   Scroll happens inside .swipe-mode__scroll — action bar lives as sibling and reaches
   edge-to-edge (parent body has no padding; List/Events modes apply their own). */
.swipe-mode {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
}

.swipe-mode__scroll {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: var(--space-8);
}

.swipe-mode__content {
  margin: 0 auto;
}

/* Desktop: side-by-side card + raw panel. Mobile: stacked, panel hidden (modal fallback). */
.swipe-mode__layout {
  display: grid;
  grid-template-columns: minmax(0, 520px) minmax(0, 1fr);
  gap: var(--space-8);
  align-items: start;
  max-width: 1100px;
  margin: 0 auto;
}

.swipe-mode__raw-panel {
  min-width: 0;
}

@media (max-width: 768px) {
  .swipe-mode__layout {
    grid-template-columns: 1fr;
  }
  .swipe-mode__raw-panel {
    display: none;
  }
}

/* Action bar — sibling of scroll area, never overlapped by inner overflow.
   Edge-to-edge (no horizontal gap) and compact height matching the toolbar above. */
.swipe-mode__actions {
  flex-shrink: 0;
  display: flex;
  justify-content: center;
  gap: var(--space-5);
  flex-wrap: wrap;
  padding: var(--space-2) var(--space-8);
  background: var(--surface-base);
  border-top: 1px solid var(--border-subtle);
  box-shadow: 0 -4px 12px rgba(0, 0, 0, 0.04);

  /* A decision bar: Reject is outlined so it reads as a button beside Skip and Approve. */
  .btn-danger {
    border-color: var(--negative);

    &[disabled] {
      border-color: var(--border-default);
    }
  }

  @media (max-width: 768px) {
    flex-wrap: nowrap;
    padding: var(--space-2) var(--space-4);

    .button-basic {
      flex: 1 1 0;
      justify-content: center;
    }
  }
}

.text-center {
  text-align: center;
}
</style>
