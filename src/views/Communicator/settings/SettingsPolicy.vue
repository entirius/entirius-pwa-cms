<template>
  <form class="ld-field" data-testid="settings-policy" @submit.prevent="save">
    <h3>{{ $t("communicator.policy.title") }}</h3>
    <p class="ld-muted">{{ $t("communicator.policy.zone", { timezone: meta.timezone, country: meta.country }) }}</p>
    <label><input v-model="form.business_days_only" type="checkbox" /> {{ $t("communicator.policy.business_days") }}</label>
    <label><input v-model="form.spread" type="checkbox" /> {{ $t("communicator.policy.spread") }}</label>
    <label class="ld-field"><span>{{ $t("communicator.policy.daily_cap") }}</span>
      <input v-model.number="form.daily_cap" class="ld-input" type="number" min="0" max="10000" required data-testid="policy-cap" />
    </label>
    <div v-for="(window, i) in form.windows" :key="i" class="ld-row" data-testid="policy-window">
      <label class="ld-field"><span>{{ $t("communicator.policy.window_start") }}</span>
        <input v-model="window.start_time" v-bind="TIME_INPUT" :placeholder="$t('communicator.policy.time_format')" data-testid="policy-window-start" />
      </label>
      <label class="ld-field"><span>{{ $t("communicator.policy.window_end") }}</span>
        <input v-model="window.end_time" v-bind="TIME_INPUT" :placeholder="$t('communicator.policy.time_format')" data-testid="policy-window-end" />
      </label>
      <button
        class="ld-btn ld-btn--danger ld-btn--icon"
        type="button"
        :aria-label="$t('communicator.policy.remove_window')"
        :title="$t('communicator.policy.remove_window')"
        @click="form.windows.splice(i, 1)"
      >
        <FontAwesomeIcon icon="trash-can" />
      </button>
    </div>
    <div class="ld-row">
      <button class="ld-btn" type="button" @click="form.windows.push({ start_time: '08:00', end_time: '17:00' })">
        {{ $t("communicator.policy.add_window") }}
      </button>
      <button class="ld-btn ld-btn--primary" type="submit" data-testid="policy-save">{{ $t("communicator.template.save") }}</button>
    </div>
    <p v-if="error" class="ld-error">{{ error }}</p>
  </form>
</template>

<script setup>
import { onMounted, reactive, ref } from "vue";
import { t } from "@/i18n";
import { GET_Policy, PUT_Policy } from "@/api/communicator/api";
import { extractApiMessage } from "@/composables/useFormErrors";
import { useNotifyStore } from "@/stores/notify";

// Send policy: weekday/holiday skip, daily cap, hour windows in the channel timezone (read-only zone + country).
const notify = useNotifyStore();
const form = reactive({ business_days_only: true, spread: true, daily_cap: 10, windows: [] });
const meta = reactive({ timezone: "", country: "" });
const error = ref("");

const hhmm = (value) => (value || "").slice(0, 5);

// A text field, not `type="time"`: the browser's time picker follows the OS locale and may show "08:00 AM", while
// the panel reads 24 h everywhere.
const TIME_INPUT = { class: "ld-input", type: "text", inputmode: "numeric", maxlength: 5, pattern: "([01]\\d|2[0-3]):[0-5]\\d", required: true };

function apply(data) {
  Object.assign(form, {
    business_days_only: data.business_days_only,
    spread: data.spread,
    daily_cap: data.daily_cap,
    windows: data.windows.map((w) => ({ start_time: hhmm(w.start_time), end_time: hhmm(w.end_time) })),
  });
  Object.assign(meta, { timezone: data.timezone, country: data.country });
}

async function save() {
  error.value = "";
  try {
    const windows = form.windows.map((w, order) => ({ ...w, order }));
    apply((await PUT_Policy({ ...form, windows })).data);
    notify.spawnNotification({ msg: t("communicator.template.saved") });
  } catch (err) {
    error.value = extractApiMessage(err, t("leads.review.error"));
  }
}

onMounted(async () => {
  try {
    apply((await GET_Policy()).data);
  } catch {
    // 404: the channel has no policy yet — the defaults above create one on save.
  }
});
</script>
