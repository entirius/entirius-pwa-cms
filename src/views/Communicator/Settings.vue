<template>
  <PageLayout data-testid="communicator-settings">
    <template #header>
      <PageHeader :title="$t('communicator.settings.title')" :back="{ name: 'LeadsSettings' }">
        <template #actions>
          <StatusBadge v-if="dirty" tone="warning" :dot="false" :label="$t('unsaved.changes')" data-testid="settings-unsaved" />
          <ActionBar :actions="actions" />
        </template>
      </PageHeader>
    </template>
    <div class="flex-column gap-8">
      <SettingsPolicy ref="policy" />
      <SettingsChannel ref="channel" />
      <SettingsFooter ref="footer" />
      <SettingsScheduled />
      <!-- communicator >= 0.5.0: the list moved to Settings → Do not contact -->
      <SettingsSuppressions v-if="!outbound" />
    </div>
  </PageLayout>
</template>

<script setup>
import { computed, ref } from "vue";
import { t } from "@/i18n";
import { useMuninStore } from "@/stores/munin";
import { useNotifyStore } from "@/stores/notify";
import { outboundOn } from "@/utils/leadsOutbound";
import { saveAction } from "@/views/Leads/saveAction";
import SettingsChannel from "./settings/SettingsChannel.vue";
import SettingsFooter from "./settings/SettingsFooter.vue";
import SettingsPolicy from "./settings/SettingsPolicy.vue";
import SettingsScheduled from "./settings/SettingsScheduled.vue";
import SettingsSuppressions from "./settings/SettingsSuppressions.vue";

// One Save in the header (N27): it saves only the cards that changed; each card shows its own error.
const munin = useMuninStore();
const notify = useNotifyStore();
const outbound = computed(() => outboundOn(munin, "communicator"));
const policy = ref(null);
const channel = ref(null);
const footer = ref(null);
const saving = ref(false);
const cards = () => [policy.value, channel.value, footer.value].filter(Boolean);
const dirty = computed(() => cards().some((card) => card.dirty));
const actions = computed(() => [saveAction({ dirty: dirty.value, saving: saving.value, testid: "settings-save", onClick: save })]);

async function save() {
  saving.value = true;
  const results = await Promise.all(cards().filter((card) => card.dirty).map((card) => card.save()));
  saving.value = false;
  if (results.every(Boolean)) notify.spawnNotification({ msg: t("communicator.template.saved") });
}
</script>
