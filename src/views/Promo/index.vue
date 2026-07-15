<template>
  <div class="promo-panel h-100">
    <div class="promo-panel__toolbar flex ai-ct jc-sb bg-basic-200 fs-300">
      <div class="flex ai-ct gap-300">
        <div id="promo-toolbar-left" class="flex ai-ct gap-200"></div>
        <div v-if="showChannelSelector" class="promo-channel-selector flex ai-ct gap-300">
          <span class="fs-200 fw-600 t-basic-500">{{ $t("promo.channel") }}:</span>
          <Dropdown
            :values="channelOptions"
            :selected="[checkoutChannel.activeChannelIdx]"
            :placeholder="$t('promo.select_channel')"
            @onSelect="onChannelSelect"
          />
        </div>
      </div>
      <div id="promo-toolbar-right" class="flex ai-ct gap-200"></div>
    </div>
    <router-view />
  </div>
</template>

<script>
import { useCheckoutChannelStore } from "@/stores/checkoutChannel";

export default {
  name: "PromoPanel",
  setup() {
    const checkoutChannel = useCheckoutChannelStore();
    return { checkoutChannel };
  },
  computed: {
    showChannelSelector() {
      // Only on the list — there it scopes which channel's rules are shown. On the
      // create/edit form the channel(s) are governed by the "Channels" field in
      // Conditions, so a second top-bar picker would be redundant.
      return this.$route.name === "PromoList";
    },
    channelOptions() {
      if (!this.checkoutChannel.channels.length) {
        return [
          {
            label: this.checkoutChannel.activeChannelIdx,
            value: this.checkoutChannel.activeChannelIdx,
          },
        ];
      }
      return this.checkoutChannel.channels.map((ch) => ({
        label: ch.name || ch.idx,
        value: ch.idx,
      }));
    },
  },
  mounted() {
    this.checkoutChannel.fetchChannels();
  },
  methods: {
    onChannelSelect(val) {
      this.checkoutChannel.setActiveChannel(val);
    },
  },
};
</script>

<style lang="scss" scoped>
.promo-panel {
  display: flex;
  flex-direction: column;
}

.promo-panel__toolbar {
  padding: var(--space-100) var(--space-200);
  border-bottom: 1px solid var(--c-basic-300);
  flex-shrink: 0;
}

@media only screen and (max-width: 768px) {
  .promo-panel__toolbar {
    flex-wrap: wrap;
    gap: 8px;
  }
  .promo-channel-selector {
    display: none;
  }
}
</style>
