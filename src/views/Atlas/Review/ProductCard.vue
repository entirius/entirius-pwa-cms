<template>
  <div class="product-card bg-base b-subtle rounded-lg p-8 shadow-sm">
    <div class="product-card__hero" data-testid="product-card-hero">
      <img
        v-if="heroImage"
        :src="heroImage"
        :alt="product?.name || ''"
        class="product-card__image"
      />
      <div v-else class="product-card__image product-card__image--empty">
        <FontAwesomeIcon icon="image" />
      </div>
    </div>
    <h2 class="fs-500 fw-600 mt-5" data-testid="product-card-name">
      {{ product?.name }}
    </h2>
    <div v-if="product?.ean" class="flex ai-ct gap-5 mt-2 flex-wrap">
      <span class="t-muted fs-200">EAN: {{ product.ean }}</span>
    </div>
    <div class="flex ai-ct gap-8 mt-5 flex-wrap">
      <span class="fs-400 fw-600 t-body">
        {{ formatCost(product?.cost, product?.currency) }}
      </span>
      <StatusBadge
        :label="`stock: ${product?.stock ?? 0}`"
        :variant="(product?.stock ?? 0) > 0 ? 'positive' : 'negative'"
      />
    </div>
    <div class="flex ai-ct gap-5 mt-8 flex-wrap">
      <button
        v-if="extraImagesCount > 0"
        class="product-card__gallery-btn"
        data-testid="product-card-gallery-btn"
        @click="$emit('show-gallery')"
      >
        <FontAwesomeIcon icon="image" />
        {{ $t("atlas.review.show_gallery") }}
        <span class="t-muted">({{ imagesCount }})</span>
      </button>
      <a
        v-if="product?.url"
        :href="product.url"
        target="_blank"
        rel="noopener"
        class="product-card__link"
        data-testid="product-card-supplier-url"
      >
        <FontAwesomeIcon icon="link" />
        {{ $t("atlas.review.view_at_supplier") }}
      </a>
      <button
        class="product-card__raw-btn product-card__raw-btn--mobile"
        data-testid="product-card-raw-data-btn"
        @click="$emit('show-raw')"
      >
        <FontAwesomeIcon icon="eye" />
        {{ $t("atlas.review.show_raw_data") }}
      </button>
    </div>
  </div>
</template>

<script>
import { formatCost } from "@/utils/format";

export default {
  name: "ProductCard",
  props: {
    product: { type: Object, default: null },
  },
  emits: ["show-raw", "show-gallery"],
  methods: { formatCost },
  computed: {
    images() {
      return Array.isArray(this.product?.image_urls) ? this.product.image_urls : [];
    },
    heroImage() {
      return this.images[0] || null;
    },
    imagesCount() {
      return this.images.length;
    },
    extraImagesCount() {
      return Math.max(0, this.images.length - 1);
    },
  },
};
</script>

<style lang="scss" scoped>
.product-card {
  max-width: 520px;
  margin: 0 auto;
}
.product-card__hero {
  width: 100%;
  aspect-ratio: 1;
  background: var(--surface-raised);
  border-radius: var(--radius-base);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}
.product-card__image {
  width: 100%;
  height: 100%;
  object-fit: contain;
  display: block;
}
.product-card__image--empty {
  font-size: 48px;
  color: var(--text-muted);
}
.product-card__link {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  color: var(--text-accent);
  text-decoration: none;
  font-size: var(--fs-200);
}
.product-card__link:hover {
  text-decoration: underline;
}
.product-card__raw-btn {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  background: var(--surface-raised);
  color: var(--text-body);
  border: none;
  border-radius: var(--radius-base);
  padding: var(--space-1) var(--space-2);
  font-size: var(--fs-200);
  cursor: pointer;
}
.product-card__raw-btn:hover {
  background: var(--surface-hover);
}
.product-card__gallery-btn {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  background: var(--surface-raised);
  color: var(--text-body);
  border: none;
  border-radius: var(--radius-base);
  padding: var(--space-1) var(--space-3);
  font-size: var(--fs-200);
  font-weight: 500;
  cursor: pointer;
}
.product-card__gallery-btn:hover {
  background: var(--surface-hover);
}

/* Desktop has a permanent side panel — mobile-only button to open modal. */
@media (min-width: 769px) {
  .product-card__raw-btn--mobile {
    display: none;
  }
}
</style>
