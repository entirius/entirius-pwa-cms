<template>
  <TranslationsDrawer
    :visible="!!option"
    :title="option?.idx || ''"
    :languages="allLanguages"
    :default-language="baseLang"
    :values="option ? (option.name_t9n || {}) : {}"
    @cancel="$emit('close')"
    @save="onSave"
  />
</template>

<script setup>
import { computed } from "vue";

const props = defineProps({
  option: { type: Object, default: null },
  languages: { type: Array, default: () => [] },
  saving: { type: Boolean, default: false },
});

const emit = defineEmits(["close", "save"]);

const baseLang = computed(() => props.languages[0] || "en");
const allLanguages = computed(() => {
  const langs = new Set([baseLang.value, ...props.languages]);
  return [...langs];
});

function onSave({ values }) {
  emit("save", { idx: props.option.idx, name_t9n: values });
}
</script>
