<script>
import { usePimChannelStore } from "@/stores/pimChannel";
import { useLoaderStore } from "@/stores/loader";
import { useNotifyStore } from "@/stores/notify";
import { POST_CopyTranslations } from "@/api/pim/api";
import { extractApiMessage } from "@/composables/useFormErrors";

export default {
  name: "CopyTranslationsDialog",
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
  },
  emits: ["close", "copied"],
  setup() {
    const pimChannel = usePimChannelStore();
    const loader = useLoaderStore();
    const notify = useNotifyStore();
    return { pimChannel, loader, notify };
  },
  data() {
    return {
      copyMode: "all",
      selectedLanguage: "",
    };
  },
  computed: {
    sourceChannelIdx() {
      return this.pimChannel.defaultChannelIdx;
    },
    availableLanguages() {
      return this.pimChannel.activeChannelLanguages;
    },
  },
  methods: {
    async confirmCopy() {
      const payload = { source_channel_idx: this.sourceChannelIdx };
      if (this.copyMode === "single" && this.selectedLanguage) {
        payload.languages = [this.selectedLanguage];
      }
      try {
        this.loader.loaderStart();
        await POST_CopyTranslations(this.channelIdx, this.sku, payload);
        this.notify.spawnNotification({
          type: "positive",
          msg: this.$t("pim.translations_copied"),
        });
        this.$emit("copied");
        this.$emit("close");
      } catch (error) {
        this.notify.spawnNotification({
          type: "negative",
          msg: extractApiMessage(error, this.$t("pim.copy_translations_failed")),
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
  <div v-if="visible" class="copy-dialog-overlay" @click.self="$emit('close')">
    <div class="copy-dialog">
      <h3 class="copy-dialog__title">{{ $t("pim.copy_translations") }}</h3>
      <p class="copy-dialog__desc t-basic-500 fs-200">
        {{ $t("pim.copy_translations_desc", { channel: sourceChannelIdx }) }}
      </p>

      <div class="copy-dialog__options">
        <label class="copy-dialog__option">
          <input type="radio" v-model="copyMode" value="all" />
          {{ $t("pim.all_matching_languages") }}
        </label>
        <label class="copy-dialog__option">
          <input type="radio" v-model="copyMode" value="single" />
          {{ $t("pim.single_language_only") }}
        </label>
        <div v-if="copyMode === 'single'" class="copy-dialog__lang-select">
          <select v-model="selectedLanguage" class="copy-dialog__select">
            <option value="" disabled>{{ $t("pim.select_language") }}</option>
            <option
              v-for="lang in availableLanguages"
              :key="lang"
              :value="lang"
            >
              {{ lang.toUpperCase() }}
            </option>
          </select>
        </div>
      </div>

      <div class="copy-dialog__actions">
        <button
          class="pim-btn pim-btn--secondary"
          type="button"
          @click="$emit('close')"
        >
          {{ $t("common.cancel") }}
        </button>
        <button
          class="pim-btn pim-btn--primary"
          type="button"
          :disabled="copyMode === 'single' && !selectedLanguage"
          @click="confirmCopy"
        >
          {{ $t("common.copy") }}
        </button>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.copy-dialog-overlay {
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

.copy-dialog {
  background: var(--c-basic-100);
  border-radius: var(--radius-lg);
  padding: 24px;
  min-width: 360px;
  max-width: 480px;
  box-shadow: var(--shadow-lg);
  border: 1px solid var(--c-basic-200);
}

.copy-dialog__title {
  margin: 0 0 8px;
  font-size: var(--fs-500);
  font-weight: 600;
  color: var(--c-basic-800);
}

.copy-dialog__desc {
  margin: 0 0 16px;
}

.copy-dialog__options {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 20px;
}

.copy-dialog__option {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  font-size: var(--fs-300);
  color: var(--c-basic-700);
}

.copy-dialog__lang-select {
  margin-left: 24px;
}

.copy-dialog__select {
  padding: 6px 10px;
  border: 1px solid var(--c-basic-200);
  border-radius: var(--radius-sm);
  background: var(--c-basic-100);
  color: var(--c-basic-800);
  font-size: var(--fs-300);
}

.copy-dialog__actions {
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
