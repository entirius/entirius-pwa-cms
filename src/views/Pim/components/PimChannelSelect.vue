<template>
  <div class="flex ai-ct flex-wrap gap-3">
    <FormField :label="$t('pim.channel')" layout="inline">
      <BasicSelect
        :options="channelOptions"
        :model-value="pimChannel.activeChannelIdx"
        :placeholder="$t('pim.select_channel')"
        :disabled="isGlobalScope"
        data-testid="pim-channel-select"
        @update:model-value="pimChannel.setActiveChannel"
      />
    </FormField>
    <StatusBadge
      v-if="isGlobalScope"
      tone="neutral"
      :dot="false"
      :label="$t('pim.global_scope')"
    />
    <StatusBadge
      v-else-if="pimChannel.isDefaultChannel"
      tone="accent"
      :dot="false"
      :label="$t('pim.default')"
    />
    <template v-if="translatorAvailable">
      <BasicButton data-testid="pim-translate-store" @click="showTranslateStore = true">
        {{ $t("pim.translate_store") }}
      </BasicButton>
      <PimTranslateDialog
        v-model:open="showTranslateStore"
        scope="store"
        :channel-idx="pimChannel.activeChannelIdx"
      />
    </template>
  </div>
</template>

<script setup>
// The whole-panel controls of Pim in a view's PageHeader `meta` (P5 page frame): the channel selector and
// „Tłumacz sklep”. The store owns the channels and the active channel; the panel wrapper (index.vue) provides the
// global-scope flag and fetches the channels.
import { computed, inject, ref } from "vue";
import { usePimChannelStore } from "@/stores/pimChannel";
import { useMuninStore } from "@/stores/munin";
import PimTranslateDialog from "./PimTranslateDialog.vue";

const pimChannel = usePimChannelStore();
const munin = useMuninStore();
const globalScope = inject("isGlobalScope", ref(false));
const isGlobalScope = computed(() => globalScope.value);
const translatorAvailable = computed(() => munin.isModuleInstalled("pim_translator"));
const showTranslateStore = ref(false);

const channelOptions = computed(() => {
  if (!pimChannel.channels.length) {
    return [{ label: pimChannel.activeChannelIdx, value: pimChannel.activeChannelIdx }];
  }
  return pimChannel.channels.map((ch) => ({ label: ch.name || ch.idx, value: ch.idx }));
});
</script>
