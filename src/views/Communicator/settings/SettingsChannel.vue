<template>
  <BasicCard :title="$t('communicator.channel.title')" data-testid="settings-channel">
    <div class="flex-column gap-4">
      <SegmentedControl v-model="mode" :options="modeOptions" :aria-label="$t('communicator.channel.title')" />
      <!-- no native required: an empty mailbox gets the C-30 message below, not the browser's bubble -->
      <FormField v-if="mode === 'sandbox'" :label="$t('communicator.channel.sandbox_mailbox')">
        <BasicInput v-model="mailbox" type="email" data-testid="channel-mailbox" />
      </FormField>
      <p v-if="mode === 'live'" class="t-muted m-0" data-testid="channel-live-gate">{{ $t("communicator.channel.live_gate") }}</p>
      <p class="t-muted m-0" data-testid="channel-live-enabled">
        {{ liveEnabled ? $t("communicator.channel.live_enabled_on") : $t("communicator.channel.live_enabled_off") }}
      </p>
      <p v-if="error" class="t-negative m-0" role="alert" data-testid="channel-error">{{ error }}</p>
    </div>
  </BasicCard>
</template>

<script setup>
import { computed, onMounted, ref } from "vue";
import { t } from "@/i18n";
import { GET_Channel, PATCH_Channel } from "@/api/communicator/api";
import { extractApiMessage } from "@/composables/useFormErrors";

// C-30: sandbox needs a mailbox — refused here first, and the API's 409 is shown verbatim. live_enabled is never written.
// The page's one Save (N27) runs `save` when `dirty`; it answers whether the card saved.
const MODES = ["dry_run", "sandbox", "live"];
const modeOptions = MODES.map((value) => ({
  value,
  label: t(`communicator.channel.mode.${value}`),
  testid: `channel-mode-${value}`,
}));
const mode = ref("dry_run");
const mailbox = ref("");
const liveEnabled = ref(false);
const error = ref("");
const stored = ref({ mode: "dry_run", sandbox_mailbox: "" });
const dirty = computed(() => mode.value !== stored.value.mode || mailbox.value.trim() !== stored.value.sandbox_mailbox);

function apply(data) {
  stored.value = data;
  mode.value = data.mode;
  mailbox.value = data.sandbox_mailbox;
  liveEnabled.value = data.live_enabled;
}

async function save() {
  error.value = mode.value === "sandbox" && !mailbox.value.trim() ? t("communicator.channel.mailbox_required") : "";
  if (error.value) return false;
  try {
    apply((await PATCH_Channel({ mode: mode.value, sandbox_mailbox: mailbox.value.trim() })).data);
    return true;
  } catch (err) {
    error.value = extractApiMessage(err, t("leads.review.error"));
    return false;
  }
}

defineExpose({ dirty, save });

onMounted(async () => apply((await GET_Channel()).data));
</script>

