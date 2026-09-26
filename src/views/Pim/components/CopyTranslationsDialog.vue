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
      <p class="copy-dialog__desc t-muted fs-200">
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
  background: var(--surface-base);
  border-radius: var(--radius-lg);
  padding: var(--space-6);
  min-width: 360px;
  max-width: 480px;
  box-shadow: var(--shadow-lg);
  border: 1px solid var(--border-subtle);
}

.copy-dialog__title {
  margin: 0 0 var(--space-2);
  font-size: var(--fs-500);
  font-weight: 600;
  color: var(--text-body);
}

.copy-dialog__desc {
  margin: 0 0 var(--space-4);
}

.copy-dialog__options {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  margin-bottom: var(--space-5);
}

.copy-dialog__option {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  cursor: pointer;
  font-size: var(--fs-300);
  color: var(--text-body);
}

.copy-dialog__lang-select {
  margin-left: var(--space-6);
}

.copy-dialog__select {
  padding: var(--space-1) var(--space-2);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-base);
  background: var(--surface-base);
  color: var(--text-body);
  font-size: var(--fs-300);
}

.copy-dialog__actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--space-2);
}

.pim-btn {
  padding: var(--space-2) var(--space-4);
  border-radius: var(--radius-base);
  border: 1px solid var(--border-subtle);
  cursor: pointer;
  font-size: var(--fs-300);
  font-weight: 500;
  transition: background 0.15s, border-color 0.15s;

  &--primary {
    background: var(--accent-fill);
    color: var(--text-on-accent-fill);
    border-color: var(--accent);

    &:hover:not(:disabled) {
      background: var(--accent-fill);
      border-color: var(--accent);
    }

    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  }

  &--secondary {
    background: var(--surface-base);
    color: var(--text-body);

    &:hover {
      background: var(--surface-raised);
    }
  }
}
</style>
