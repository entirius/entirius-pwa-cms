<template>
  <div class="promo-panel h-100">
    <div class="panel-toolbar bg-raised fs-300">
      <div class="panel-toolbar__title flex ai-ct gap-8">
        <div id="promo-toolbar-left" class="flex ai-ct gap-5"></div>
        <div v-if="showChannelSelector" class="promo-channel-selector flex ai-ct gap-8">
          <span id="promo-channel-label" class="field-label">{{ $t("promo.channel") }}</span>
          <BasicSelect
            aria-labelledby="promo-channel-label"
            :options="channelOptions"
            :model-value="checkoutChannel.activeChannelIdx"
            :placeholder="$t('promo.select_channel')"
            @update:model-value="onChannelSelect"
          />
        </div>
      </div>
      <div id="promo-toolbar-right" class="panel-toolbar__actions flex ai-ct gap-5"></div>
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
</style>
