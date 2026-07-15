<script setup>
import { ref, watch, computed } from "vue";
import { GET_Images } from "@/api/contentDB/api";
import { useCategoryFetch, usePageFetch } from "@/composables/useEntityFetch";
import { useMuninStore } from "@/stores/munin";

const FIELD_LABELS = {
  caption: "Caption",
  button_label: "Button label",
  alt_text: "Alt text",
};

const props = defineProps({
  visible: {
    type: Boolean,
    default: false,
  },
  banner: {
    type: Object,
    default: null,
  },
  languages: {
    type: Array,
    default: () => [],
  },
  defaultLanguage: {
    type: String,
    default: "en",
  },
  channelIdx: {
    type: String,
    default: "",
  },
});

const muninStore = useMuninStore();
const pimEnabled = computed(() => muninStore.isPanelEnabled("pim"));
const categoryFetch = computed(() => useCategoryFetch(props.channelIdx));
const pageFetch = computed(() => usePageFetch());

const emit = defineEmits(["save", "close"]);

const translatingField = ref(null);

const translatingFieldLabel = computed(() => FIELD_LABELS[translatingField.value] || "");

const translatingFieldValues = computed(() => {
  if (!translatingField.value) return {};
  return form.value[translatingField.value + "_t9n"] || {};
});

const form = ref({
  heading: "",
  media_url: "",
  caption: "",
  caption_t9n: {},
  button_label: "",
  button_label_t9n: {},
  button_link_type: "category",
  button_link_value: "",
  button_link_display: "",
  alt_text: "",
  alt_text_t9n: {},
});

const galleryOpen = ref(false);
const galleryImages = ref([]);
const galleryPage = ref(1);
const galleryTotal = ref(0);
const galleryLoading = ref(false);

watch(
  () => props.visible,
  (val) => {
    if (!val) return;
    galleryOpen.value = false;
    galleryImages.value = [];
    galleryPage.value = 1;
    translatingField.value = null;
    skipLinkTypeClear.value = true;
    if (props.banner) {
      form.value = {
        heading: props.banner.heading || "",
        media_url: props.banner.media_url || "",
        caption: props.banner.caption || "",
        caption_t9n: props.banner.caption_t9n ? { ...props.banner.caption_t9n } : {},
        button_label: props.banner.button_label || "",
        button_label_t9n: props.banner.button_label_t9n ? { ...props.banner.button_label_t9n } : {},
        button_link_type: props.banner.button_link_type || "category",
        button_link_value: props.banner.button_link_value || "",
        button_link_display: props.banner.button_link_display || "",
        alt_text: props.banner.alt_text || "",
        alt_text_t9n: props.banner.alt_text_t9n ? { ...props.banner.alt_text_t9n } : {},
      };
    } else {
      form.value = { heading: "", media_url: "", caption: "", caption_t9n: {}, button_label: "", button_label_t9n: {}, button_link_type: "category", button_link_value: "", button_link_display: "", alt_text: "", alt_text_t9n: {} };
    }
  }
);

const skipLinkTypeClear = ref(false);

watch(
  () => form.value.button_link_type,
  () => {
    if (skipLinkTypeClear.value) { skipLinkTypeClear.value = false; return; }
    form.value.button_link_value = "";
    form.value.button_link_display = "";
  }
);

function resolveMediaUrl(path) {
  if (!path) return "";
  if (path.startsWith("http")) return path;
  return (process.env.VUE_APP_API_URL || "") + path;
}

function clearImage() {
  form.value.media_url = "";
  form.value.alt_text = "";
}

async function openGallery() {
  galleryOpen.value = true;
  await loadGallery(1);
}

async function loadGallery(page = 1) {
  galleryPage.value = page;
  galleryLoading.value = true;
  try {
    const { data } = await GET_Images({ limit: 9, page });
    galleryImages.value = data.data || [];
    galleryTotal.value = data.pagination?.total || 0;
  } catch {
    galleryImages.value = [];
  } finally {
    galleryLoading.value = false;
  }
}

function selectImage(image) {
  form.value.media_url = image.image;
  form.value.alt_text = image.meta?.alt || image.meta?.fileName || "";
  galleryOpen.value = false;
}

function onTranslationsSave({ values }) {
  form.value[translatingField.value + "_t9n"] = { ...values };
  translatingField.value = null;
}

function onSave() {
  emit("save", { type: "banner", ...form.value });
}
</script>

<template>
  <Transition name="modal">
    <div v-if="visible" class="modal-overlay" @click.self="emit('close')">
      <div class="modal-container">
        <div class="modal-header">
          <h2 class="fs-500 fw-600 t-basic-700">
            {{ banner ? $t("layout_extender.edit_banner") : $t("layout_extender.add_banner") }}
          </h2>
          <span class="modal-close" @click="emit('close')">
            <FontAwesomeIcon icon="xmark" />
          </span>
        </div>

        <div class="modal-body">
          <!-- Image area -->
          <div class="form-group mb-300">
            <label class="detail-label">{{ $t("layout_extender.media_url") }}</label>

            <!-- Selected image preview -->
            <div v-if="form.media_url" class="banner-image-area">
              <img :src="resolveMediaUrl(form.media_url)" :alt="form.alt_text || ''" class="banner-image-preview" />
              <span class="banner-image-remove" @click="clearImage">
                <FontAwesomeIcon icon="xmark" />
              </span>
            </div>

            <!-- Choose from gallery button -->
            <button v-if="!galleryOpen" class="banner-gallery-btn" @click="openGallery">
              <FontAwesomeIcon icon="image" class="t-basic-500" />
              <span>{{ form.media_url ? $t("layout_extender.change_image") : $t("layout_extender.choose_from_gallery") }}</span>
            </button>

            <!-- Inline gallery grid -->
            <div v-if="galleryOpen" class="banner-gallery">
              <div v-if="galleryLoading" class="banner-gallery__loading">
                <span class="t-basic-500 fs-200">Loading...</span>
              </div>
              <template v-else>
                <div class="banner-gallery__grid">
                  <div
                    v-for="img in galleryImages"
                    :key="img.uid"
                    class="banner-gallery__item"
                    :class="{ 'banner-gallery__item--selected': form.media_url === img.image }"
                    @click="selectImage(img)"
                  >
                    <img :src="resolveMediaUrl(img.image)" :alt="img.meta?.fileName || ''" />
                  </div>
                  <div v-if="!galleryImages.length" class="banner-gallery__empty">
                    <FontAwesomeIcon icon="image" class="t-basic-400" />
                    <span class="fs-200 t-basic-500">No images in gallery</span>
                  </div>
                </div>
                <!-- Pagination -->
                <div v-if="galleryTotal > 9" class="banner-gallery__pagination">
                  <button class="banner-gallery__page-btn" :disabled="galleryPage <= 1" @click="loadGallery(galleryPage - 1)">
                    <FontAwesomeIcon icon="chevron-left" />
                  </button>
                  <span class="fs-200 t-basic-600">{{ galleryPage }}</span>
                  <button class="banner-gallery__page-btn" :disabled="galleryImages.length < 9" @click="loadGallery(galleryPage + 1)">
                    <FontAwesomeIcon icon="chevron-right" />
                  </button>
                </div>
              </template>
            </div>

            <p class="fs-100 t-support-400">Recommended aspect ratio: 16:9</p>
          </div>

          <div class="form-group mb-300">
            <div class="flex ai-ct jc-sb">
              <label class="detail-label">{{ $t("layout_extender.alt_text") }}</label>
              <BasicButton
                v-if="languages.length > 1"
                :text="$t('layout_extender.translations')"
                icon="language"
                class="btn-outline translation-field__btn"
                @click="translatingField = 'alt_text'"
              />
            </div>
            <BasicInput v-model="form.alt_text" />
          </div>

          <div class="form-group mb-300">
            <div class="flex ai-ct jc-sb">
              <label class="detail-label">{{ $t("layout_extender.caption") }}</label>
              <BasicButton
                v-if="languages.length > 1"
                :text="$t('layout_extender.translations')"
                icon="language"
                class="btn-outline translation-field__btn"
                @click="translatingField = 'caption'"
              />
            </div>
            <BasicInput v-model="form.caption" />
          </div>

          <div class="form-group mb-300">
            <div class="flex ai-ct jc-sb">
              <label class="detail-label">{{ $t("layout_extender.button_label") }}</label>
              <BasicButton
                v-if="languages.length > 1"
                :text="$t('layout_extender.translations')"
                icon="language"
                class="btn-outline translation-field__btn"
                @click="translatingField = 'button_label'"
              />
            </div>
            <BasicInput v-model="form.button_label" />
          </div>

          <div class="form-group mb-300">
            <label class="detail-label">{{ $t("layout_extender.link_type") }}</label>
            <div class="radio-group">
              <label class="radio-label">
                <input type="radio" v-model="form.button_link_type" value="category" />
                <span>{{ $t("layout_extender.category") }}</span>
              </label>
              <label class="radio-label">
                <input type="radio" v-model="form.button_link_type" value="page" />
                <span>{{ $t("layout_extender.content_page") }}</span>
              </label>
              <label class="radio-label">
                <input type="radio" v-model="form.button_link_type" value="url" />
                <span>{{ $t("layout_extender.url") }}</span>
              </label>
            </div>
          </div>

          <div class="form-group mb-300">
            <label class="detail-label">
              {{ form.button_link_type === "url" ? $t("layout_extender.url") : $t("layout_extender.link_value") }}
            </label>
            <EntitySearchPicker
              v-if="form.button_link_type === 'category'"
              :modelValue="form.button_link_value"
              :displayValue="form.button_link_display"
              :fetchFn="categoryFetch"
              :placeholder="$t('layout_extender.search_category')"
              :disabled="!pimEnabled"
              @update:modelValue="form.button_link_value = $event"
              @update:displayValue="form.button_link_display = $event"
              @clear="form.button_link_value = ''; form.button_link_display = ''"
            />
            <EntitySearchPicker
              v-else-if="form.button_link_type === 'page'"
              :modelValue="form.button_link_value"
              :displayValue="form.button_link_display"
              :fetchFn="pageFetch"
              :placeholder="$t('layout_extender.search_page')"
              :clientFilter="true"
              @update:modelValue="form.button_link_value = $event"
              @update:displayValue="form.button_link_display = $event"
              @clear="form.button_link_value = ''; form.button_link_display = ''"
            />
            <BasicInput v-else v-model="form.button_link_value" :placeholder="'https://...'" />
          </div>
        </div>

        <div class="modal-footer">
          <button class="modal-btn modal-btn--secondary" @click="emit('close')">
            {{ $t("common.cancel") }}
          </button>
          <button class="modal-btn modal-btn--confirm" @click="onSave">
            {{ $t("common.save") }}
          </button>
        </div>
      </div>
    </div>
  </Transition>

  <TranslationsDrawer
    :visible="!!translatingField"
    :title="translatingFieldLabel"
    :languages="languages"
    :default-language="defaultLanguage"
    :values="translatingFieldValues"
    @cancel="translatingField = null"
    @save="onTranslationsSave"
  />
</template>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: var(--overlay-backdrop);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 100;
  padding: 1rem;
}

.modal-container {
  background: var(--c-basic-100);
  padding: 24px;
  border-radius: 8px;
  border: 1px solid var(--c-basic-300);
  box-shadow: var(--shadow-lg);
  width: min(440px, 95vw);
  max-height: 90vh;
  overflow-y: auto;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--c-basic-300);
}

.modal-close {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: var(--radius-sm);
  cursor: pointer;
  color: var(--c-basic-500);
  transition: background 0.1s, color 0.1s;
}

.modal-close:hover {
  background: var(--c-basic-200);
  color: var(--c-basic-700);
}

.modal-body {
  margin-bottom: 24px;
}

.modal-footer {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.radio-group {
  display: flex;
  align-items: center;
  gap: 24px;
}

.radio-label {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  font-size: 14px;
  color: var(--c-basic-700);
}

.radio-label input[type="radio"] {
  width: 18px;
  height: 18px;
  accent-color: var(--c-support-400);
  margin: 0;
  cursor: pointer;
}

.banner-image-area {
  position: relative;
  border: 1px solid var(--c-basic-300);
  border-radius: var(--radius-md);
  overflow: hidden;
  min-height: 120px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--c-basic-200);
}

.banner-image-preview {
  width: 100%;
  max-height: 180px;
  object-fit: cover;
}

.banner-image-remove {
  position: absolute;
  top: 8px;
  right: 8px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  background: var(--c-basic-100);
  border: 1px solid var(--c-basic-300);
  border-radius: 50%;
  cursor: pointer;
  color: var(--c-basic-600);
  transition: background 0.1s;
}

.banner-image-remove:hover {
  background: var(--c-negative-100);
  color: var(--c-negative-200);
}

.banner-gallery-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  height: 40px;
  font-size: 13px;
  font-weight: 500;
  font-family: inherit;
  color: var(--c-basic-700);
  background: var(--c-basic-100);
  border: 1px dashed var(--c-basic-400);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: background 0.1s, border-color 0.1s;
}

.banner-gallery-btn:hover {
  background: var(--c-basic-200);
  border-color: var(--c-support-400);
  color: var(--c-support-400);
}

.banner-gallery {
  margin-top: 8px;
}

.banner-gallery__loading {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  border: 1px solid var(--c-basic-300);
  border-radius: var(--radius-md);
}

.banner-gallery__grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 6px;
  max-height: 240px;
  overflow-y: auto;
  padding: 4px;
  border: 1px solid var(--c-basic-300);
  border-radius: var(--radius-md);
}

.banner-gallery__item {
  aspect-ratio: 1;
  border-radius: var(--radius-sm);
  overflow: hidden;
  cursor: pointer;
  border: 2px solid transparent;
  transition: border-color 0.1s;
}

.banner-gallery__item:hover {
  border-color: var(--c-support-400);
}

.banner-gallery__item--selected {
  border-color: var(--c-support-400);
}

.banner-gallery__item img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.banner-gallery__empty {
  grid-column: 1 / -1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 24px;
}

.banner-gallery__pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  margin-top: 8px;
}

.banner-gallery__page-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  font-size: 12px;
  font-family: inherit;
  background: var(--c-basic-100);
  border: 1px solid var(--c-basic-400);
  border-radius: var(--radius-sm);
  cursor: pointer;
  color: var(--c-basic-700);
  transition: background 0.1s;
}

.banner-gallery__page-btn:hover {
  background: var(--c-basic-200);
}

.banner-gallery__page-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.modal-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  height: 36px;
  padding: 0 16px;
  font-size: 13px;
  font-weight: 500;
  font-family: inherit;
  border-radius: 5px;
  border: 1px solid;
  cursor: pointer;
  transition: all 0.15s ease;
}

.modal-btn--secondary {
  background: var(--c-basic-100);
  border-color: var(--c-basic-400);
  color: var(--c-basic-700);
}

.modal-btn--secondary:hover {
  background: var(--c-basic-200);
}

.modal-btn--confirm {
  background: var(--c-support-400);
  border-color: var(--c-support-400);
  color: var(--c-basic-100);
}

.modal-btn--confirm:hover {
  opacity: 0.9;
}

.translation-field__btn {
  flex-shrink: 0;
}

.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.15s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-active .modal-container {
  animation: modal-scale 0.15s ease-out;
}

@keyframes modal-scale {
  from {
    opacity: 0;
    transform: scale(0.96);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}
</style>
