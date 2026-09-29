<template>
  <form class="ld-field" data-testid="settings-channel" @submit.prevent="save">
    <h3>{{ $t("communicator.channel.title") }}</h3>
    <SegmentedControl v-model="mode" :options="modeOptions" />
    <label v-if="mode === 'sandbox'" class="ld-field"><span class="ld-field__label">{{ $t("communicator.channel.sandbox_mailbox") }}</span>
      <input v-model="mailbox" class="ld-input" type="email" data-testid="channel-mailbox" />
    </label>
    <p v-if="mode === 'live'" class="ld-muted" data-testid="channel-live-gate">{{ $t("communicator.channel.live_gate") }}</p>
    <p class="ld-muted" data-testid="channel-live-enabled">
      {{ liveEnabled ? $t("communicator.channel.live_enabled_on") : $t("communicator.channel.live_enabled_off") }}
    </p>
    <p v-if="error" class="ld-error" data-testid="channel-error">{{ error }}</p>
    <button class="ld-btn ld-btn--primary" type="submit" data-testid="channel-save">{{ $t("communicator.template.save") }}</button>
  </form>
</template>

<script setup>
import { onMounted, ref } from "vue";
import { t } from "@/i18n";
import { GET_Channel, PATCH_Channel } from "@/api/communicator/api";
import { extractApiMessage } from "@/composables/useFormErrors";
import { useNotifyStore } from "@/stores/notify";

// C-30: sandbox needs a mailbox — refused here first, and the API's 409 is shown verbatim. live_enabled is never written.
const MODES = ["dry_run", "sandbox", "live"];
const notify = useNotifyStore();
const modeOptions = MODES.map((value) => ({
  value,
  label: t(`communicator.channel.mode.${value}`),
  testid: `channel-mode-${value}`,
}));
const mode = ref("dry_run");
const mailbox = ref("");
const liveEnabled = ref(false);
const error = ref("");

function apply(data) {
  mode.value = data.mode;
  mailbox.value = data.sandbox_mailbox;
  liveEnabled.value = data.live_enabled;
}

async function save() {
  error.value = mode.value === "sandbox" && !mailbox.value.trim() ? t("communicator.channel.mailbox_required") : "";
  if (error.value) return;
  try {
    apply((await PATCH_Channel({ mode: mode.value, sandbox_mailbox: mailbox.value.trim() })).data);
    notify.spawnNotification({ msg: t("communicator.template.saved") });
  } catch (err) {
    error.value = extractApiMessage(err, t("leads.review.error"));
  }
}

onMounted(async () => apply((await GET_Channel()).data));
</script>

<style lang="scss" src="@/views/Leads/desktop.scss"></style>
