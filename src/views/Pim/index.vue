<template>
  <div class="pim-panel h-100">
    <div class="pim-panel__channel-bar flex ai-ct jc-sb bg-basic-200 fs-300">
      <div class="flex ai-ct gap-300">
        <div id="pim-toolbar-left" class="flex ai-ct gap-200"></div>
        <div class="pim-channel-selector flex ai-ct gap-300">
          <span class="fs-200 fw-600 t-basic-500"
            >{{ $t("pim.channel") }}:</span
          >
          <Dropdown
            :values="channelOptions"
            :selected="[pimChannel.activeChannelIdx]"
            :placeholder="$t('pim.select_channel')"
            :isDisabled="isGlobalScopeValue"
            @onSelect="onChannelSelect"
          />
          <span
            v-if="pimChannel.isDefaultChannel && !isGlobalScopeValue"
            class="chip t-support-400 fs-200"
            >{{ $t("pim.default") }}</span
          >
          <span
            v-if="isGlobalScopeValue"
            class="chip bg-basic-200 t-basic-500 fs-200"
            >{{ $t("pim.global_scope") }}</span
          >
        </div>
      </div>
      <div id="pim-toolbar-right" class="flex ai-ct gap-200">
        <BasicButton
          v-if="translatorAvailable"
          :text="$t('pim.translate_store')"
          icon="language"
          class="bg-support-400 t-basic-100"
          @click="showTranslateStore = true"
        />
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

.pim-panel__channel-bar {
  padding: 8px 20px;
  border-bottom: 1px solid var(--c-basic-300);
  flex-shrink: 0;
}


@media only screen and (max-width: 768px) {
  .pim-panel__channel-bar {
    flex-wrap: wrap;
    gap: 8px;
    padding: 8px 12px;
  }
  .pim-channel-selector {
    display: none;
  }
}
</style>
