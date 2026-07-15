<template>
  <div class="product-preview">
    <Loader v-show="loading" />

    <template v-if="!loading && product">
      <div class="product-preview__hero">
        <img
          v-if="heroUrl"
          :src="heroUrl"
          :alt="product.name || sku"
          class="product-preview__img"
        />
        <div v-else class="product-preview__img product-preview__img--ph">
          <FontAwesomeIcon icon="image" />
        </div>
      </div>

      <h3 class="fs-400 fw-600 mb-200">{{ product.name || sku }}</h3>

      <dl class="product-preview__meta">
        <div class="product-preview__row">
          <dt>{{ $t("enrichment.preview.sku") }}</dt>
          <dd>{{ sku }}</dd>
        </div>
        <div v-if="product.ean" class="product-preview__row">
          <dt>{{ $t("enrichment.preview.ean") }}</dt>
          <dd>{{ product.ean }}</dd>
        </div>
        <div v-if="product.product_class_name" class="product-preview__row">
          <dt>{{ $t("enrichment.preview.class") }}</dt>
          <dd>{{ product.product_class_name }}</dd>
        </div>
        <div class="product-preview__row">
          <dt>{{ $t("enrichment.preview.status") }}</dt>
          <dd>
            <StatusBadge
              :label="
                product.is_enabled
                  ? $t('enrichment.preview.enabled')
                  : $t('enrichment.preview.disabled')
              "
              :variant="product.is_enabled ? 'positive' : 'neutral'"
            />
          </dd>
        </div>
        <div v-if="product.visibility_name" class="product-preview__row">
          <dt>{{ $t("enrichment.preview.visibility") }}</dt>
          <dd>{{ product.visibility_name }}</dd>
        </div>
        <div v-if="product.feature_set_idx" class="product-preview__row">
          <dt>{{ $t("enrichment.preview.feature_set") }}</dt>
          <dd>{{ product.feature_set_idx }}</dd>
        </div>
        <div v-if="product.gap_count != null" class="product-preview__row">
          <dt>{{ $t("enrichment.preview.gaps") }}</dt>
          <dd>
            <StatusBadge
              :label="String(product.gap_count)"
              :variant="product.gap_count > 0 ? 'warning' : 'positive'"
            />
          </dd>
        </div>
      </dl>
    </template>

    <EmptyState
      v-if="!loading && !product"
      icon="triangle-exclamation"
      :title="$t('enrichment.preview.not_found')"
      :message="sku || ''"
    />

    <div v-if="product" class="product-preview__actions">
      <button
        type="button"
        class="product-preview__btn bg-support-400 t-basic-100"
        data-testid="enrichment-preview-go-pim"
        @click="goToPim"
      >
        <FontAwesomeIcon icon="up-right-from-square" />
        {{ $t("enrichment.preview.go_to_pim") }}
      </button>
    </div>
  </div>
</template>

<script>
import { useNotifyStore } from "@/stores/notify";
import { extractApiMessage } from "@/composables/useFormErrors";
import { GET_Product } from "@/api/pim/api";

export default {
  name: "ProductPreviewCard",
  props: {
    sku: { type: String, default: null },
    channelIdx: { type: String, default: "" },
  },
  setup() {
    return { notify: useNotifyStore() };
  },
  data() {
    return {
      product: null,
      loading: false,
    };
  },
  computed: {
    heroUrl() {
      const path = this.product?.og_image;
      if (!path) return "";
      if (path.startsWith("http")) return path;
      return (process.env.VUE_APP_API_URL || "") + path;
    },
  },
  watch: {
    sku: { immediate: true, handler: "fetchProduct" },
  },
  methods: {
    async fetchProduct() {
      if (!this.sku || !this.channelIdx) {
        this.product = null;
        return;
      }
      this.loading = true;
      this.product = null;
      try {
        const { data } = await GET_Product(this.channelIdx, this.sku);
        this.product = data;
      } catch (err) {
        if (!(err?.response?.status === 404 || err?.error === "NOT_FOUND")) {
          this.notify.spawnNotification({
            type: "negative",
            msg: extractApiMessage(err, this.$t("notifications.error")),
          });
        }
        this.product = null;
      } finally {
        this.loading = false;
      }
    },
    goToPim() {
      this.$router.push({ name: "PimProductDetail", params: { sku: this.sku } });
    },
  },
};
</script>

<style lang="scss" scoped>
.product-preview {
  padding: var(--space-300);
}
.product-preview__hero {
  width: 100%;
  display: flex;
  justify-content: center;
  margin-bottom: var(--space-300);
}
.product-preview__img {
  max-width: 100%;
  max-height: 240px;
  object-fit: contain;
  border-radius: var(--radius-sm);
}
.product-preview__img--ph {
  width: 100%;
  height: 180px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--c-basic-200);
  color: var(--c-basic-400);
  font-size: 2rem;
}
.product-preview__meta {
  margin: 0;
}
.product-preview__row {
  display: grid;
  grid-template-columns: 130px 1fr;
  gap: var(--space-200);
  align-items: center;
  padding: var(--space-100) 0;
  border-bottom: 1px solid var(--c-basic-200);
  dt {
    font-size: var(--fs-200);
    color: var(--c-basic-500);
  }
  dd {
    margin: 0;
    word-break: break-word;
  }
}
.product-preview__actions {
  margin-top: var(--space-300);
}
.product-preview__btn {
  display: inline-flex;
  align-items: center;
  gap: var(--space-100);
  height: var(--elem-height);
  padding: 0 16px;
  border: none;
  border-radius: var(--radius-sm);
  font-size: var(--fs-200);
  cursor: pointer;
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
}
</style>
