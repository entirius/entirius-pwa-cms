<template>
  <div class="flex ai-ct wrap gap-3">
    <BasicButton :aria-labelledby="field.labelId?.value || undefined" @click="fileInput?.click()">
      {{ t("stock.import_choose_file") }}
    </BasicButton>
    <span class="fs-300 t-secondary">{{ fileName || t("stock.import_no_file") }}</span>
    <input
      ref="fileInput"
      type="file"
      accept=".csv"
      hidden
      @change="$emit('select', $event.target.files[0] || null)"
    />
  </div>
</template>

<script setup>
// A real child of the FormField (plan 38 review): only a component instance rendered inside FormField's slot can
// inject its FORM_FIELD context, so the "Choose file" button (the actual interactive control) lives here rather
// than inline in ImportCSVModal — the hidden input is picked, never labelled.
import { ref } from "vue"
import { t } from "@/i18n"
import { useFormFieldControl } from "@/composables/formField"

defineProps({
  fileName: { type: String, default: "" },
})
defineEmits(["select"])

const field = useFormFieldControl()
const fileInput = ref(null)
</script>
