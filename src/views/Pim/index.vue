<template>
  <div class="pim-panel h-100">
    <div class="panel-toolbar bg-raised fs-300">
      <div class="panel-toolbar__title flex ai-ct gap-8">
        <div id="pim-toolbar-left" class="flex ai-ct gap-5"></div>
        <div class="pim-channel-selector flex ai-ct gap-8">
          <span id="pim-channel-label" class="field-label">{{ $t("pim.channel") }}</span>
          <BasicSelect
            aria-labelledby="pim-channel-label"
            :options="channelOptions"
            :model-value="pimChannel.activeChannelIdx"
            :placeholder="$t('pim.select_channel')"
            :disabled="isGlobalScopeValue"
            @update:model-value="onChannelSelect"
          />
          <StatusBadge
            v-if="pimChannel.isDefaultChannel && !isGlobalScopeValue"
            tone="accent"
            :dot="false"
            :label="$t('pim.default')"
            class="fs-200"
          />
          <StatusBadge
            v-if="isGlobalScopeValue"
            tone="neutral"
            :dot="false"
            :label="$t('pim.global_scope')"
            class="fs-200"
          />
        </div>
      </div>
      <div id="pim-toolbar-right" class="panel-toolbar__actions flex ai-ct gap-5">
        <BasicButton
          v-if="translatorAvailable"
          :label="$t('pim.translate_store')"
          variant="secondary"
          class="icon-only-mobile"
          @click="showTranslateStore = true"
        >
          {{ $t('pim.translate_store') }}
        </BasicButton>
      </div>
    </div>
    <router-view />

    <TranslateStoreDialog
      :visible="showTranslateStore"
      :channelIdx="pimChannel.activeChannelIdx"
      @close="showTranslateStore = false"
      @translated="showTranslateStore = false"
    />
  </div>
</template>

<script>
import { ref, provide } from "vue";
import { usePimChannelStore } from "@/stores/pimChannel";
import { useMuninStore } from "@/stores/munin";
import { useQualityStore } from "@/stores/quality";
import TranslateStoreDialog from "./components/TranslateStoreDialog.vue";

export default {
  name: "PimPanel",
  components: { TranslateStoreDialog },
  setup() {
    const pimChannel = usePimChannelStore();
    const munin = useMuninStore();
    const quality = useQualityStore();
    const isGlobalScope = ref(false);
    provide("isGlobalScope", isGlobalScope);
    return { pimChannel, munin, quality, isGlobalScope };
  },
  data() {
    return {
      showTranslateStore: false,
    };
  },
  computed: {
    translatorAvailable() {
      return this.munin.isModuleInstalled("pim_translator");
    },
    isGlobalScopeValue() {
      return this.isGlobalScope;
    },
    channelOptions() {
      if (!this.pimChannel.channels.length) {
        return [
          {
            label: this.pimChannel.activeChannelIdx,
            value: this.pimChannel.activeChannelIdx,
          },
        ];
      }
      return this.pimChannel.channels.map((ch) => ({
        label: ch.name || ch.idx,
        value: ch.idx,
      }));
    },
    activeChannelLabel() {
      const ch = this.pimChannel.channels.find(
        (c) => c.idx === this.pimChannel.activeChannelIdx
      );
      return ch ? ch.name || ch.idx : this.pimChannel.activeChannelIdx;
    },
  },
  mounted() {
    this.pimChannel.fetchChannels();
    // Probe gaps capability once per panel entry (gates the quality-rules nav item).
    if (this.quality.available === null) this.quality.probe();
  },
  methods: {
    onChannelSelect(val) {
      this.pimChannel.setActiveChannel(val);
    },
  },
};
</script>

<style lang="scss" scoped>
.pim-panel {
  display: flex;
  flex-direction: column;
}
</style>
