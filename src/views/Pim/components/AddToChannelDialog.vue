<script>
import { usePimChannelStore } from "@/stores/pimChannel";
import { useLoaderStore } from "@/stores/loader";
import { useNotifyStore } from "@/stores/notify";
import { POST_AddToChannel } from "@/api/pim/api";
import { extractApiMessage } from "@/composables/useFormErrors";

export default {
  name: "AddToChannelDialog",
  props: {
    channelIdx: {
      type: String,
      required: true,
    },
    sku: {
      type: String,
      required: true,
    },
    visible: {
      type: Boolean,
      default: false,
    },
    presentInChannels: {
      type: Array,
      default: () => [],
    },
  },
  emits: ["close", "added"],
  setup() {
    const pimChannel = usePimChannelStore();
    const loader = useLoaderStore();
    const notify = useNotifyStore();
    return { pimChannel, loader, notify };
  },
  data() {
    return {
      targetChannelIdx: "",
      copyContent: true,
      inheritAttributes: false,
      inheritDescriptions: false,
      inheritImages: true,
    };
  },
  computed: {
    presentChannels() {
      return this.pimChannel.channels.filter((ch) =>
        this.presentInChannels.includes(ch.idx)
      );
    },
    availableChannels() {
      return this.pimChannel.channels.filter(
        (ch) => !this.presentInChannels.includes(ch.idx)
      );
    },
    targetInheritsEnabled() {
      const target = this.pimChannel.channels.find((ch) => ch.idx === this.targetChannelIdx);
      return target?.inheritance_enabled === true;
    },
    channelOptions() {
      return this.availableChannels.map((ch) => ({ label: `${ch.name} · ${ch.idx}`, value: ch.idx }));
    },
    // Cancel · Add to channel (R5); without a channel left to add there is nothing to confirm.
    actions() {
      const cancel = { key: "cancel", role: "secondary", label: this.$t("common.cancel"),
        onClick: () => this.$emit("close") };
      if (!this.availableChannels.length) return [cancel];
      return [cancel, { key: "add", role: "primary", label: this.$t("pim.add_to_channel"),
        disabled: !this.targetChannelIdx, testid: "pim-add-to-channel-submit", onClick: this.confirmAdd }];
    },
  },
  watch: {
    visible(val) {
      if (val) {
        this.targetChannelIdx = "";
        this.copyContent = true;
        this.inheritAttributes = false;
        this.inheritDescriptions = false;
        this.inheritImages = true;
      }
    },
  },
  methods: {
    async confirmAdd() {
      if (!this.targetChannelIdx) return;
      try {
        this.loader.loaderStart();
        const payload = {
          target_channel_idx: this.targetChannelIdx,
          copy_content: this.copyContent,
        };
        if (this.targetInheritsEnabled) {
          payload.inherit_attributes = this.inheritAttributes;
          payload.inherit_descriptions = this.inheritDescriptions;
          payload.inherit_images = this.inheritImages;
        }
        await POST_AddToChannel(this.channelIdx, this.sku, payload);
        this.notify.spawnNotification({
          type: "positive",
          msg: this.$t("pim.added_to_channel", {
            channel: this.targetChannelIdx,
          }),
        });
        this.$emit("added", this.targetChannelIdx);
        this.$emit("close");
      } catch (error) {
        this.notify.spawnNotification({
          type: "negative",
          msg: extractApiMessage(error, this.$t("pim.add_to_channel_failed")),
        });
        this.$emit("close");
      } finally {
        this.loader.loaderFinish();
      }
    },
  },
};
</script>

<template>
  <BasicModal
    :open="visible"
    :title="$t('pim.channel_presence')"
    size="sm"
    :actions="actions"
    @close="$emit('close')"
  >
    <div class="flex-column gap-4" data-testid="pim-add-to-channel-dialog">
      <p class="t-muted fs-200">
        {{ $t("pim.channel_presence_desc", { sku }) }}
      </p>

      <FormField v-if="presentChannels.length" :label="$t('pim.present_in')">
        <div class="flex flex-wrap gap-1">
          <Tag v-for="ch in presentChannels" :key="ch.idx" :label="`${ch.name} · ${ch.idx}`" />
        </div>
      </FormField>

      <template v-if="availableChannels.length">
        <FormField :label="$t('pim.add_to')">
          <BasicRadioGroup v-model="targetChannelIdx" :options="channelOptions" />
        </FormField>
        <BasicCheckbox v-model="copyContent">{{ $t("pim.copy_from_current") }}</BasicCheckbox>
        <FormField v-if="targetInheritsEnabled" :label="$t('pim.inheritance')">
          <div class="flex-column gap-2">
            <BasicCheckbox v-model="inheritAttributes" data-testid="pim-add-inherit-attributes">{{ $t("pim.inherit_attributes") }}</BasicCheckbox>
            <BasicCheckbox v-model="inheritDescriptions" data-testid="pim-add-inherit-descriptions">{{ $t("pim.inherit_descriptions") }}</BasicCheckbox>
            <BasicCheckbox v-model="inheritImages" data-testid="pim-add-inherit-images">{{ $t("pim.inherit_images") }}</BasicCheckbox>
          </div>
        </FormField>
      </template>

      <p v-else class="t-muted fs-200">
        {{ $t("pim.present_in_all_channels") }}
      </p>
    </div>
  </BasicModal>
</template>
