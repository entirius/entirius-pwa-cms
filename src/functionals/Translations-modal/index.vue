<template>
  <Transition name="modal">
    <div v-if="visible" class="modal-overlay" @click.self="cancel">
      <div class="modal-container">
        <div class="modal-header">
          <h2>{{ title || $t("translations_modal.title") }}</h2>
        </div>
        <div class="modal-body">
          <div v-for="lang in allLanguages" :key="lang" class="lang-row">
            <span class="lang-label">
              {{ lang.toUpperCase() }}
              <span v-if="lang === baseLang" class="lang-badge">
                {{ $t("translations_modal.base") }}
              </span>
            </span>
            <BasicInput
              :modelValue="localT9n[lang] || ''"
              :placeholder="$t('translations_modal.enter_translation')"
              @update:modelValue="localT9n[lang] = $event"
            />
          </div>
        </div>
        <div class="modal-footer">
          <BasicButton
            :text="$t('common.cancel')"
            class="btn-secondary"
            @click="cancel"
          />
          <BasicButton
            :text="$t('common.save')"
            class="btn-primary"
            :is-disabled="saving"
            @click="save"
          />
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup>
import { ref, computed, watch } from "vue";

const props = defineProps({
  visible: {
    type: Boolean,
    default: false,
  },
  entity: {
    type: Object,
    default: () => ({}),
  },
  languages: {
    type: Array,
    default: () => [],
  },
  onSave: {
    type: Function,
    default: null,
  },
  baseLang: {
    type: String,
    default: "en",
  },
  title: {
    type: String,
    default: "",
  },
});

const emit = defineEmits(["cancel", "saved"]);

const localT9n = ref({});
const saving = ref(false);

const allLanguages = computed(() => {
  const langs = new Set([props.baseLang, ...props.languages]);
  return [...langs];
});

watch(
  () => props.visible,
  (val) => {
    if (val) {
      localT9n.value = { ...(props.entity?.name_t9n || {}) };
    }
  }
);

function cancel() {
  emit("cancel");
}

async function save() {
  if (!props.onSave) return;
  saving.value = true;
  try {
    await props.onSave({ ...props.entity, name_t9n: { ...localT9n.value } });
    emit("saved");
  } finally {
    saving.value = false;
  }
}
</script>

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
  padding: var(--space-4);
}

.modal-container {
  background: var(--surface-base);
  padding: var(--space-6);
  border-radius: var(--radius-lg);
  border: 1px solid var(--border-subtle);
  box-shadow: var(--shadow-lg);
  width: 520px;
  max-width: 100%;
  max-height: 80vh;
  overflow-y: auto;
}

.modal-header {
  margin-bottom: var(--space-4);
}

.modal-header h2 {
  font-size: var(--fs-400);
  font-weight: 600;
  color: var(--text-body);
  margin: 0;
}

.modal-body {
  margin-bottom: var(--space-6);
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.lang-row {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}

.lang-label {
  min-width: 60px;
  font-size: var(--fs-250);
  font-weight: 600;
  color: var(--text-secondary);
  display: flex;
  align-items: center;
  gap: var(--space-1);
}

.lang-badge {
  font-size: var(--fs-200);
  font-weight: 500;
  color: var(--text-muted);
  background: var(--surface-raised);
  padding: 1px var(--space-1);
  border-radius: var(--radius-base);
}

.modal-footer {
  display: flex;
  gap: var(--space-2);
  justify-content: flex-end;
}

.spinner {
  display: inline-block;
  width: 14px;
  height: 14px;
  border: 2px solid var(--border-default);
  border-top-color: transparent;
  border-radius: var(--radius-full);
  animation: spin 0.6s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
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
