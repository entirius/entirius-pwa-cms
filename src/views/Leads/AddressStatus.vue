<template>
  <span class="inline-flex ai-ct gap-2" :data-status="status" data-testid="address-status">
    <StatusBadge :tone="EMAIL_STATUS_TONES[status] || 'neutral'" :dot="false" size="sm" :label="statusText" />
    <span v-if="reason" class="t-muted fs-200" data-testid="address-reason">{{ reasonText }}</span>
  </span>
</template>

<script setup>
import { computed } from "vue";
import { emailReasonLabel, emailStatusLabel } from "@/utils/leadsLabels";
import { EMAIL_STATUS_TONES } from "@/utils/leadsOutbound";

// The verification state of an address (Q5): valid / risky / invalid / unknown, and why when the check said so.
const props = defineProps({ status: { type: String, default: "unknown" }, reason: { type: String, default: "" } });
const statusText = computed(() => emailStatusLabel(props.status || "unknown"));
const reasonText = computed(() => emailReasonLabel(props.reason));
</script>
