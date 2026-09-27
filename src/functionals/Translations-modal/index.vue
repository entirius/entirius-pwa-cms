<template>
  <BasicModal
    :open="visible"
    :title="title || $t('translations_modal.title')"
    :actions="actions"
    :persistent="saving"
    @update:open="(open) => !open && !saving && cancel()"
  >
    <div class="translations-modal flex-column gap-3">
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
  </BasicModal>
</template>

<script setup>
// Per-language names of one entity on BasicModal (plan 12): `visible`, `entity`, `languages`, `baseLang`, `title`,
// `onSave` (awaited; `saved` after it), `cancel`.
import { ref, computed, watch } from "vue";
import BasicModal from "@/boots/BasicModal/index.vue";
import { t } from "@/i18n";

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

const actions = computed(() => [
  { key: "cancel", label: t("common.cancel"), role: "secondary", onClick: cancel },
  { key: "save", label: t("common.save"), role: "primary", onClick: save, loading: saving.value },
]);

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
</style>
