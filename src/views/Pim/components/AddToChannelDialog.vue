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
  },
  watch: {
    visible(val) {
      if (val) {
        this.targetChannelIdx = "";
        this.copyContent = true;
      }
    },
  },
  methods: {
    async confirmAdd() {
      if (!this.targetChannelIdx) return;
      try {
        this.loader.loaderStart();
        await POST_AddToChannel(this.channelIdx, this.sku, {
          target_channel_idx: this.targetChannelIdx,
          copy_content: this.copyContent,
        });
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
  <div v-if="visible" class="add-dialog-overlay" @click.self="$emit('close')">
    <div class="add-dialog">
      <h3 class="add-dialog__title">{{ $t("pim.channel_presence") }}</h3>
      <p class="add-dialog__desc t-basic-500 fs-200">
        {{ $t("pim.channel_presence_desc", { sku }) }}
      </p>

      <!-- Present channels -->
      <div v-if="presentChannels.length" class="add-dialog__section">
        <label class="add-dialog__label">{{ $t("pim.present_in") }}</label>
        <div class="channel-list">
          <div
            v-for="ch in presentChannels"
            :key="ch.idx"
            class="channel-item channel-item--present"
          >
            <span class="channel-item__check">&#10003;</span>
            <span class="channel-item__name">{{ ch.name }}</span>
            <span class="channel-item__idx t-basic-400 fs-200">{{
              ch.idx
            }}</span>
          </div>
        </div>
      </div>

      <!-- Available channels -->
      <div v-if="availableChannels.length" class="add-dialog__section">
        <label class="add-dialog__label">{{ $t("pim.add_to") }}</label>
        <div class="channel-list">
          <div
            v-for="ch in availableChannels"
            :key="ch.idx"
            class="channel-item channel-item--available"
            :class="{ 'channel-item--selected': targetChannelIdx === ch.idx }"
            @click="targetChannelIdx = ch.idx"
          >
            <span class="channel-item__radio">
              <span
                v-if="targetChannelIdx === ch.idx"
                class="channel-item__radio-dot"
              ></span>
            </span>
            <span class="channel-item__name">{{ ch.name }}</span>
            <span class="channel-item__idx t-basic-400 fs-200">{{
              ch.idx
            }}</span>
          </div>
        </div>

        <label class="add-dialog__checkbox">
          <input type="checkbox" v-model="copyContent" />
          {{ $t("pim.copy_from_current") }}
        </label>
      </div>

      <div v-else class="add-dialog__section">
        <p class="t-basic-500 fs-200">
          {{ $t("pim.present_in_all_channels") }}
        </p>
      </div>

      <div class="add-dialog__actions">
        <button
          class="pim-btn pim-btn--secondary"
          type="button"
          @click="$emit('close')"
        >
          {{ $t("common.cancel") }}
        </button>
        <button
          v-if="availableChannels.length"
          class="pim-btn pim-btn--primary"
          type="button"
          :disabled="!targetChannelIdx"
          @click="confirmAdd"
        >
          {{ $t("pim.add_to_channel") }}
        </button>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.add-dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: var(--overlay-heavy);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.add-dialog {
  background: var(--c-basic-100);
  border-radius: var(--radius-lg);
  padding: 24px;
  min-width: 360px;
  max-width: 480px;
  box-shadow: var(--shadow-lg);
  border: 1px solid var(--c-basic-200);
}

.add-dialog__title {
  margin: 0 0 8px;
  font-size: var(--fs-500);
  font-weight: 600;
  color: var(--c-basic-800);
}

.add-dialog__desc {
  margin: 0 0 16px;
}

.add-dialog__section {
  margin-bottom: 16px;
}

.add-dialog__label {
  display: block;
  font-size: var(--fs-200);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  color: var(--c-basic-500);
  margin-bottom: 8px;
}

.channel-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-bottom: 12px;
}

.channel-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-radius: var(--radius-sm);
  font-size: var(--fs-300);
}

.channel-item--present {
  background: var(--c-basic-200);
  color: var(--c-basic-500);
}

.channel-item--available {
  border: 1px solid var(--c-basic-200);
  cursor: pointer;
  color: var(--c-basic-700);
  transition: border-color 0.15s, background 0.15s;

  &:hover {
    border-color: var(--c-support-300);
    background: var(--c-support-100);
  }
}

.channel-item--selected {
  border-color: var(--c-support-400);
  background: var(--c-support-100);
}

.channel-item__check {
  color: var(--c-positive-300);
  font-size: 14px;
  font-weight: 600;
  flex-shrink: 0;
  width: 18px;
  text-align: center;
}

.channel-item__radio {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  border: 2px solid var(--c-basic-300);
  flex-shrink: 0;

  .channel-item--selected & {
    border-color: var(--c-support-400);
  }
}

.channel-item__radio-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--c-support-400);
}

.channel-item__name {
  font-weight: 500;
}

.channel-item__idx {
  margin-left: auto;
}

.add-dialog__checkbox {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: var(--fs-300);
  color: var(--c-basic-700);
  cursor: pointer;
}

.add-dialog__actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.pim-btn {
  padding: 8px 16px;
  border-radius: var(--radius-md);
  border: 1px solid var(--c-basic-200);
  cursor: pointer;
  font-size: var(--fs-300);
  font-weight: 500;
  transition: background 0.15s, border-color 0.15s;

  &--primary {
    background: var(--c-support-400);
    color: var(--c-basic-100);
    border-color: var(--c-support-400);

    &:hover:not(:disabled) {
      background: var(--c-support-300);
      border-color: var(--c-support-300);
    }

    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  }

  &--secondary {
    background: var(--c-basic-100);
    color: var(--c-basic-700);

    &:hover {
      background: var(--c-basic-200);
    }
  }
}
</style>
