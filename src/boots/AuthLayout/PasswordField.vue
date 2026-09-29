<template>
  <FormField :label="label" :error="error" :description="capsLock ? $t('login.caps_lock') : ''">
    <BasicInput
      :model-value="modelValue"
      size="lg"
      :type="visible ? 'text' : 'password'"
      :autocomplete="autocomplete"
      @update:model-value="emit('update:modelValue', $event)"
      @keydown="readCapsLock"
      @keyup="readCapsLock"
      @focusout="capsLock = false"
    >
      <template #trailing>
        <IconButton
          :icon="visible ? 'hide' : 'preview'"
          :label="$t('login.show_password')"
          :pressed="visible"
          @click="visible = !visible"
        />
      </template>
    </BasicInput>
  </FormField>
</template>

<script setup>
// A password field of the sign-in screens (AuthLayout): FormField + a `lg` BasicInput with the show/hide toggle in its
// `trailing` slot (an IconButton, `pressed` while shown) and a caps-lock hint as the field's description, only while
// caps lock is on. `autocomplete` is `current-password` or `new-password`.
import { ref } from "vue";

defineProps({
  label: { type: String, required: true },
  modelValue: { type: String, default: "" },
  error: { type: String, default: "" },
  autocomplete: { type: String, default: "current-password" },
});
const emit = defineEmits(["update:modelValue"]);

const visible = ref(false);
const capsLock = ref(false);

function readCapsLock(event) {
  capsLock.value = Boolean(event.getModifierState?.("CapsLock"));
}
</script>
