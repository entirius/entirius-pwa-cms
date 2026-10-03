<template>
  <BasicModal
    :open="open"
    :title="$t('access.tokens.rotate_title', { token: tokenName })"
    size="md"
    :persistent="busy"
    :actions="actions"
    data-testid="token-rotate-dialog"
    @update:open="(next) => !next && close()"
  >
    <div class="flex-column gap-4">
      <p class="m-0">{{ $t("access.tokens.rotate_message") }}</p>
      <FormField
        :label="$t('access.tokens.overlap_hours')"
        :hint="$t('access.tokens.overlap_hint')"
        hint-level="important"
        :error="formErrors.getFieldError('overlap_hours')?.msg || ''"
      >
        <NumberInput v-model="overlap" :min="0" :max="MAX_OVERLAP_HOURS" data-testid="token-overlap" />
      </FormField>
      <ExpiryField v-if="secret" v-model="date" required capped :error="expiryError()" />
    </div>
  </BasicModal>
</template>

<script setup>
// Rotate a token (access plan 22): a successor with the same scopes and channel; the old one keeps working for the
// overlap (0–168 hours, 24 by default). A secret token's successor needs its own expiry, within 365 days. `submit` is the
// page's call — it opens SecretReveal with the successor's value.
import { computed, ref } from "vue";
import { t } from "@/i18n";
import ExpiryField from "./ExpiryField.vue";
import { useTokenDialog } from "./useTokenDialog";
import { expiryInstant, expiryIssue, isSecret, tokenKey } from "./tokens";

const MAX_OVERLAP_HOURS = 168;
const DEFAULT_OVERLAP_HOURS = "24";

const props = defineProps({
  open: { type: Boolean, default: false },
  token: { type: Object, required: true },
  scopes: { type: Array, default: () => [] },
  submit: { type: Function, required: true },
});
const emit = defineEmits(["update:open"]);

const overlap = ref(DEFAULT_OVERLAP_HOURS);
const date = ref("");
const close = () => emit("update:open", false);
const { formErrors, busy, expiryError, setExpiryIssue, run } = useTokenDialog(close, ["overlap_hours", "expires_at"]);

const secret = computed(() => isSecret(props.token.scopes, props.scopes));
const tokenName = computed(() => props.token.name || tokenKey(props.token));

function validate() {
  formErrors.clearErrors();
  const hours = Number(overlap.value);
  if (overlap.value === "" || !Number.isInteger(hours) || hours < 0 || hours > MAX_OVERLAP_HOURS) {
    formErrors.errors.overlap_hours = { status: "error", msg: t("access.tokens.overlap_invalid") };
  }
  const issue = secret.value && expiryIssue({ date: date.value, required: true, capped: true });
  if (issue) setExpiryIssue(issue);
  return !formErrors.hasErrors.value;
}

// A publishable successor keeps the server's default: the old token's lifetime from now.
function payload() {
  const body = { overlap_hours: Number(overlap.value) };
  return secret.value ? { ...body, expires_at: expiryInstant(date.value) } : body;
}

function save() {
  if (validate()) run(props.submit, payload());
}

const actions = computed(() => [
  { key: "cancel", role: "secondary", label: t("common.cancel"), onClick: close, disabled: busy.value },
  { key: "rotate", role: "primary", label: t("access.tokens.rotate"), onClick: save, loading: busy.value, testid: "token-rotate-save" },
]);
</script>
