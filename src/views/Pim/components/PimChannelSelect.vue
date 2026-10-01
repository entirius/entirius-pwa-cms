<template>
  <div class="flex ai-ct flex-wrap gap-3">
    <FormField v-if="isDesktop" :label="$t('pim.channel')" layout="inline">
      <BasicSelect v-bind="selectProps" @update:model-value="pimChannel.setActiveChannel" />
    </FormField>
    <BasicSelect
      v-else
      v-bind="selectProps"
      :aria-label="$t('pim.channel')"
      @update:model-value="pimChannel.setActiveChannel"
    />
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
      <BasicButton v-if="isDesktop" data-testid="pim-translate-store" @click="showTranslateStore = true">
        {{ $t("pim.translate_store") }}
      </BasicButton>
      <IconButton
        v-else
        icon="translate"
        variant="outline"
        :label="$t('pim.translate_store')"
        data-testid="pim-translate-store"
        @click="showTranslateStore = true"
      />
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
// „Tłumacz sklep” (an IconButton of the same name below the shell breakpoint: the meta row keeps its width, so a
// phone has no room for the text). Below the breakpoint the select is named by `aria-label` only: any label above it
// (a FormField's or a floating one) pushes the select box off the line of the title and the button; it shows the
// channel. The store owns the channels and the active channel; the panel wrapper (index.vue) provides the global-scope
// flag and fetches the channels.
import { computed, inject, ref } from "vue";
import { usePimChannelStore } from "@/stores/pimChannel";
import { useMuninStore } from "@/stores/munin";
import { useIsDesktop } from "@/composables/useIsDesktop";
import { t } from "@/i18n";
import PimTranslateDialog from "./PimTranslateDialog.vue";

const pimChannel = usePimChannelStore();
const munin = useMuninStore();
const globalScope = inject("isGlobalScope", ref(false));
const isGlobalScope = computed(() => globalScope.value);
const translatorAvailable = computed(() => munin.isModuleInstalled("pim_translator"));
const showTranslateStore = ref(false);
const isDesktop = useIsDesktop();

const selectProps = computed(() => ({
  options: channelOptions.value,
  modelValue: pimChannel.activeChannelIdx,
  placeholder: t("pim.select_channel"),
  disabled: isGlobalScope.value,
  "data-testid": "pim-channel-select",
}));

const channelOptions = computed(() => {
  if (!pimChannel.channels.length) {
    return [{ label: pimChannel.activeChannelIdx, value: pimChannel.activeChannelIdx }];
  }
  return pimChannel.channels.map((ch) => ({ label: ch.name || ch.idx, value: ch.idx }));
});
</script>
