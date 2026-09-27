<template>
  <div class="pim-panel h-100">
    <div class="panel-toolbar bg-raised fs-300">
      <div class="panel-toolbar__title flex ai-ct gap-8">
        <div id="pim-toolbar-left" class="flex ai-ct gap-5"></div>
        <div class="pim-channel-selector flex ai-ct gap-8">
          <span id="pim-channel-label" class="field-label">{{ $t("pim.channel") }}</span>
          <Dropdown
            aria-labelledby="pim-channel-label"
            :values="channelOptions"
            :selected="[pimChannel.activeChannelIdx]"
            :placeholder="$t('pim.select_channel')"
            :isDisabled="isGlobalScopeValue"
            @onSelect="onChannelSelect"
          />
          <span
            v-if="pimChannel.isDefaultChannel && !isGlobalScopeValue"
            class="chip t-accent fs-200"
            >{{ $t("pim.default") }}</span
          >
          <span
            v-if="isGlobalScopeValue"
            class="chip bg-raised t-muted fs-200"
            >{{ $t("pim.global_scope") }}</span
          >
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
