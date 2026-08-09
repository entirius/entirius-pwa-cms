<template>
  <Teleport to="body">
    <Transition name="modal">
      <div
        v-if="visible"
        class="gallery-overlay"
        @click.self="$emit('close')"
        data-testid="gallery-modal"
      >
        <div class="gallery-container bg-basic-100 b-basic-300 br-100">
          <header class="gallery-header">
            <h2 class="fs-400 fw-600">
              {{ $t("atlas.review.gallery_title") }}
              <span class="t-basic-400 fw-400">({{ images.length }})</span>
            </h2>
            <button
              class="gallery-close"
              data-testid="gallery-modal-close"
              @click="$emit('close')"
            >
              <FontAwesomeIcon icon="xmark" />
            </button>
          </header>

          <!-- Lightbox: large active image + thumbnail strip -->
          <div class="gallery-body">
            <div class="gallery-stage">
              <img
                v-if="activeImage"
                :src="activeImage"
                :alt="productName"
                class="gallery-stage__image"
              />
              <button
                v-if="images.length > 1"
                class="gallery-nav gallery-nav--prev"
                :title="$t('atlas.review.gallery_prev')"
                @click="prev"
              >
                <FontAwesomeIcon icon="chevron-left" />
              </button>
              <button
                v-if="images.length > 1"
                class="gallery-nav gallery-nav--next"
                :title="$t('atlas.review.gallery_next')"
                @click="next"
              >
                <FontAwesomeIcon icon="chevron-right" />
              </button>
              <span v-if="images.length > 1" class="gallery-counter">
                {{ activeIndex + 1 }} / {{ images.length }}
              </span>
            </div>

            <div v-if="images.length > 1" class="gallery-thumbs">
              <button
                v-for="(img, i) in images"
                :key="i"
                class="gallery-thumb"
                :class="{ 'gallery-thumb--active': i === activeIndex }"
                @click="activeIndex = i"
              >
                <img :src="img" :alt="''" loading="lazy" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script>
export default {
  name: "GalleryModal",
  props: {
    visible: { type: Boolean, default: false },
    images: { type: Array, default: () => [] },
    productName: { type: String, default: "" },
  },
  emits: ["close"],
  data() {
    return { activeIndex: 0 };
  },
  computed: {
    activeImage() {
      return this.images[this.activeIndex] || null;
    },
  },
  watch: {
    visible(open) {
      if (open) {
        this.activeIndex = 0;
        document.addEventListener("keydown", this.onKey);
      } else {
        document.removeEventListener("keydown", this.onKey);
      }
    },
    images() {
      this.activeIndex = 0;
    },
  },
  beforeUnmount() {
    document.removeEventListener("keydown", this.onKey);
  },
  methods: {
    prev() {
      if (this.images.length === 0) return;
      this.activeIndex = (this.activeIndex - 1 + this.images.length) % this.images.length;
    },
    next() {
      if (this.images.length === 0) return;
      this.activeIndex = (this.activeIndex + 1) % this.images.length;
    },
    onKey(e) {
      if (!this.visible) return;
      if (e.key === "Escape") this.$emit("close");
      else if (e.key === "ArrowLeft") this.prev();
      else if (e.key === "ArrowRight") this.next();
    },
  },
};
</script>

<style lang="scss" scoped>
.gallery-overlay {
  position: fixed;
  inset: 0;
  background: var(--overlay-backdrop);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
  padding: var(--space-300);
}

.gallery-container {
  width: min(1100px, 100%);
  max-height: 92vh;
  display: flex;
  flex-direction: column;
  box-shadow: var(--shadow-lg);
  overflow: hidden;
}

.gallery-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-200) var(--space-300);
  border-bottom: 1px solid var(--c-basic-300);
}

.gallery-close {
  background: transparent;
  border: none;
  font-size: 20px;
  color: var(--c-basic-500);
  cursor: pointer;
  padding: 0;

  &:hover {
    color: var(--c-basic-700);
  }
}

.gallery-body {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
}

.gallery-stage {
  position: relative;
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--c-basic-200);
  min-height: 0;
  overflow: hidden;
}

.gallery-stage__image {
  max-width: 100%;
  max-height: 70vh;
  object-fit: contain;
  display: block;
}

.gallery-nav {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: none;
  background: rgba(0, 0, 0, 0.45);
  color: white;
  font-size: 16px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.15s ease;

  &:hover {
    background: rgba(0, 0, 0, 0.65);
  }

  &--prev {
    left: 12px;
  }
  &--next {
    right: 12px;
  }
}

.gallery-counter {
  position: absolute;
  bottom: 12px;
  left: 50%;
  transform: translateX(-50%);
  padding: 4px 10px;
  background: rgba(0, 0, 0, 0.55);
  color: white;
  border-radius: var(--radius-sm);
  font-size: var(--fs-200);
  font-weight: 600;
}

.gallery-thumbs {
  display: flex;
  gap: 8px;
  padding: var(--space-200) var(--space-300);
  overflow-x: auto;
  overflow-y: hidden;
  border-top: 1px solid var(--c-basic-300);
  background: var(--c-basic-100);
}

.gallery-thumb {
  flex: 0 0 auto;
  width: 64px;
  height: 64px;
  padding: 0;
  border: 2px solid transparent;
  border-radius: var(--radius-sm);
  background: var(--c-basic-200);
  cursor: pointer;
  overflow: hidden;
  transition: border-color 0.15s ease;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }

  &:hover {
    border-color: var(--c-basic-400);
  }

  &--active {
    border-color: var(--c-support-400);
  }
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
