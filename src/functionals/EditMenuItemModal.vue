<script setup>
import { ref, watch, computed } from "vue";
import { useCategoryFetch, usePageFetch } from "@/composables/useEntityFetch";
import { useMuninStore } from "@/stores/munin";

const props = defineProps({
  visible: {
    type: Boolean,
    default: false,
  },
  item: {
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

const form = ref({
  label: "",
  label_t9n: {},
  display_as: "link",
  link_type: "category",
  link_value: "",
  link_display: "",
});

watch(
  () => props.visible,
  (val) => {
    if (!val) return;
    translatingField.value = null;
    skipLinkTypeClear.value = true;
    if (props.item) {
      form.value = {
        label: props.item.label || "",
        label_t9n: props.item.label_t9n ? { ...props.item.label_t9n } : {},
        display_as: props.item.display_as || "link",
        link_type: props.item.link_type || "category",
        link_value: props.item.link_value || "",
        link_display: props.item.link_display || "",
      };
    } else {
      form.value = { label: "", label_t9n: {}, display_as: "link", link_type: "category", link_value: "", link_display: "" };
    }
  }
);

const skipLinkTypeClear = ref(false);

watch(
  () => form.value.link_type,
  () => {
    if (skipLinkTypeClear.value) { skipLinkTypeClear.value = false; return; }
    form.value.link_value = "";
    form.value.link_display = "";
  }
);

function onTranslationsSave({ values }) {
  form.value.label_t9n = { ...values };
  translatingField.value = null;
}

function onSave() {
  if (!form.value.label.trim()) return;
  emit("save", { ...form.value });
}
</script>

<template>
  <Transition name="modal">
    <div v-if="visible" class="modal-overlay" @click.self="emit('close')">
      <div class="modal-container">
        <div class="modal-header">
          <h2 class="fs-500 fw-600 t-basic-700">
            {{ item ? $t("layout_extender.edit_item") : $t("layout_extender.add_item") }}
          </h2>
          <span class="modal-close" @click="emit('close')">
            <FontAwesomeIcon icon="xmark" />
          </span>
        </div>

        <div class="modal-body">
          <div class="form-group mb-300">
            <div class="flex ai-ct jc-sb">
              <label class="detail-label required">{{ $t("layout_extender.label") }}</label>
              <BasicButton
                v-if="languages.length > 1"
                :text="$t('layout_extender.translations')"
                icon="language"
                class="btn-outline translation-field__btn"
                @click="translatingField = 'label'"
              />
            </div>
            <BasicInput v-model="form.label" />
          </div>

          <div class="form-group mb-300">
            <label class="detail-label">{{ $t("layout_extender.display_as") }}</label>
            <div class="radio-group">
              <label class="radio-label">
                <input type="radio" v-model="form.display_as" value="link" />
                <span>{{ $t("layout_extender.simple_link") }}</span>
              </label>
              <label class="radio-label">
                <input type="radio" v-model="form.display_as" value="megamenu" />
                <span>{{ $t("layout_extender.mega_menu") }}</span>
              </label>
            </div>
          </div>

          <template v-if="form.display_as === 'link'">
            <div class="form-group mb-300">
              <label class="detail-label">{{ $t("layout_extender.link_type") }}</label>
              <div class="radio-group">
                <label class="radio-label">
                  <input type="radio" v-model="form.link_type" value="category" />
                  <span>{{ $t("layout_extender.category") }}</span>
                </label>
                <label class="radio-label">
                  <input type="radio" v-model="form.link_type" value="page" />
                  <span>{{ $t("layout_extender.content_page") }}</span>
                </label>
                <label class="radio-label">
                  <input type="radio" v-model="form.link_type" value="url" />
                  <span>{{ $t("layout_extender.url") }}</span>
                </label>
              </div>
            </div>

            <div class="form-group mb-300">
              <label class="detail-label">
                {{ form.link_type === "url" ? $t("layout_extender.url") : $t("layout_extender.link_value") }}
              </label>
              <EntitySearchPicker
                v-if="form.link_type === 'category'"
                :modelValue="form.link_value"
                :displayValue="form.link_display"
                :fetchFn="categoryFetch"
                :placeholder="$t('layout_extender.search_category')"
                :disabled="!pimEnabled"
                @update:modelValue="form.link_value = $event"
                @update:displayValue="form.link_display = $event"
                @clear="form.link_value = ''; form.link_display = ''"
              />
              <EntitySearchPicker
                v-else-if="form.link_type === 'page'"
                :modelValue="form.link_value"
                :displayValue="form.link_display"
                :fetchFn="pageFetch"
                :placeholder="$t('layout_extender.search_page')"
                :clientFilter="true"
                @update:modelValue="form.link_value = $event"
                @update:displayValue="form.link_display = $event"
                @clear="form.link_value = ''; form.link_display = ''"
              />
              <BasicInput v-else v-model="form.link_value" :placeholder="'https://...'" />
            </div>
          </template>
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
    :title="$t('layout_extender.label')"
    :languages="languages"
    :default-language="defaultLanguage"
    :values="form.label_t9n || {}"
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
  width: min(480px, 95vw);
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
