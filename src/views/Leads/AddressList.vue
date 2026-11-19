<template>
  <div class="address-list flex-column gap-2" :data-testid="testid">
    <ul v-if="modelValue.length" class="address-list__items m-0 flex flex-wrap gap-2">
      <li v-for="address in modelValue" :key="address">
        <Tag :label="address" removable :data-testid="`${testid}-item`" @remove="remove(address)" />
      </li>
    </ul>
    <BasicInput
      v-if="modelValue.length < max || draft"
      v-model="draft"
      type="email"
      :placeholder="$t('leads.mailbox.address_add')"
      :maxlength="254"
      :aria-label="label"
      :data-testid="`${testid}-input`"
      @on-key-down="add"
      @on-focusout="add"
    />
  </div>
</template>

<script setup>
import { ref, watch } from "vue";
import Tag from "@/boots/Tag/index.vue";
import { FORMATS } from "@/utils/formats";

// U20: a list of e-mail addresses as chips (the CC and the BCC of a mailbox). Enter or leaving the field adds what
// was typed — several at once when pasted with commas, semicolons or spaces; lower-cased, no duplicates, at most
// `max`. A wrong address, or one over the limit, stays in the field and the list says why (`invalid`: "email" |
// "too_many" | "").
const props = defineProps({
  modelValue: { type: Array, default: () => [] },
  max: { type: Number, default: 10 },
  label: { type: String, default: "" },
  testid: { type: String, default: "address-list" },
});
const emit = defineEmits(["update:modelValue", "invalid"]);
const draft = ref("");

const valid = (address) => !FORMATS.email.check(address);

// An emptied field has nothing left to complain about (at the limit the field is gone before it could lose focus).
watch(draft, (value) => {
  if (!value.trim()) emit("invalid", "");
});

function add() {
  const typed = draft.value.split(/[\s,;]+/).map((part) => part.trim().toLowerCase()).filter(Boolean);
  if (!typed.length) return emit("invalid", "");
  const wrong = typed.filter((address) => !valid(address));
  const next = [...props.modelValue];
  for (const address of typed) if (valid(address) && !next.includes(address)) next.push(address);
  const kept = next.slice(0, props.max);
  const over = next.slice(props.max);
  if (kept.length !== props.modelValue.length) emit("update:modelValue", kept);
  draft.value = [...wrong, ...over].join(", ");
  emit("invalid", wrong.length ? "email" : over.length ? "too_many" : "");
}

function remove(address) {
  emit("update:modelValue", props.modelValue.filter((item) => item !== address));
  emit("invalid", "");
}
</script>

<style scoped>
.address-list__items {
  padding: 0;
  list-style: none;

  > li {
    min-width: 0;
    max-width: 100%;
  }
}
</style>
