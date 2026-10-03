<template>
  <BasicModal
    :open="open"
    :title="$t('access.tokens.expiry_title', { token: tokenName })"
    size="md"
    :persistent="busy"
    :actions="actions"
    data-testid="token-expiry-dialog"
    @update:open="(next) => !next && close()"
  >
    <div class="flex-column gap-4">
      <p v-if="token.legacy" class="m-0">{{ $t("access.tokens.expiry_legacy", { source: token.legacy_source }) }}</p>
      <ExpiryField v-model="date" :required="capped" :capped="capped" :error="expiryError()" />
    </div>
  </BasicModal>
</template>

<script setup>
// Set or clear a token's expiry (access plan 22, `POST tokens/<id>/expiry/`). A legacy key never expires by itself
// (D28): the team picks a date or "No expiry". An issued secret token keeps the 365-day cap and cannot drop its
// expiry (D21); a publishable one takes any future date or none.
import { computed, ref } from "vue";
import { t } from "@/i18n";
import ExpiryField from "./ExpiryField.vue";
import { useTokenDialog } from "./useTokenDialog";
import { expiryInstant, expiryIssue, isSecret, isoToDate, tokenKey } from "./tokens";

const props = defineProps({
  open: { type: Boolean, default: false },
  token: { type: Object, required: true },
  scopes: { type: Array, default: () => [] },
  submit: { type: Function, required: true },
});
const emit = defineEmits(["update:open"]);

const date = ref(isoToDate(props.token.expires_at));
const close = () => emit("update:open", false);
const { formErrors, busy, expiryError, setExpiryIssue, run } = useTokenDialog(close, ["expires_at"]);

const capped = computed(() => !props.token.legacy && isSecret(props.token.scopes, props.scopes));
const tokenName = computed(() => props.token.name || tokenKey(props.token));

function save() {
  formErrors.clearErrors();
  const issue = expiryIssue({ date: date.value, required: capped.value, capped: capped.value });
  if (issue) return setExpiryIssue(issue);
  run(props.submit, { expires_at: expiryInstant(date.value) });
}

const actions = computed(() => [
  { key: "cancel", role: "secondary", label: t("common.cancel"), onClick: close, disabled: busy.value },
  { key: "save", role: "primary", label: t("common.save"), onClick: save, loading: busy.value, testid: "token-expiry-save" },
]);
</script>
