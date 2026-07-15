<template>
  <div class="home-switcher">
    <button
      class="home-switcher__trigger pointer flex ai-ct gap-100"
      :title="$t('builder.home_variant')"
      @click="open = !open"
    >
      <FontAwesomeIcon icon="house" />
      <span class="home-switcher__label fs-200">
        {{ $t("builder.home_variant") }}: {{ currentChannelLabel }}
      </span>
      <FontAwesomeIcon icon="caret-down" />
    </button>
    <div v-if="open" class="home-switcher__backdrop" @click="open = false" />
    <div v-if="open" class="home-switcher__drop">
      <div class="home-switcher__header">
        {{ $t("builder.home_variant") }}
      </div>
      <div
        v-for="ch in availableChannels"
        :key="ch.idx"
        class="home-switcher__item"
        :class="{
          'home-switcher__item--current': isCurrent(ch.idx),
          'home-switcher__item--missing': !variants[ch.idx],
        }"
        @click="onSelect(ch)"
      >
        <span class="home-switcher__name">{{ ch.name || ch.idx }}</span>
        <span class="home-switcher__status fs-100">
          <template v-if="isCurrent(ch.idx)">
            <FontAwesomeIcon icon="check" class="t-support-400" />
            {{ $t("builder.home_current") }}
          </template>
          <template v-else-if="variants[ch.idx]">
            {{ $t("builder.home_exists") }}
          </template>
          <template v-else>
            <FontAwesomeIcon icon="plus" />
            {{ $t("builder.home_create") }}
          </template>
        </span>
      </div>
    </div>
  </div>
</template>

<script>
import { _METHOD_content } from "@/api/contentDB/api";

export default {
  name: "HomeVariantSwitcher",
  props: {
    contentType: { type: String, required: true },
    type: { type: String, required: true },
    currentUid: { type: String, default: null },
    currentChannel: { type: String, default: null },
    availableChannels: { type: Array, default: () => [] },
  },
  emits: ["switch"],
  data() {
    return {
      open: false,
      variants: {},
    };
  },
  computed: {
    currentChannelLabel() {
      if (!this.currentChannel) return "—";
      const ch = this.availableChannels.find((c) => c.idx === this.currentChannel);
      return ch?.name || this.currentChannel;
    },
  },
  watch: {
    contentType: { immediate: true, handler: "loadVariants" },
    type: { immediate: true, handler: "loadVariants" },
  },
  methods: {
    isCurrent(channel_idx) {
      return channel_idx === this.currentChannel;
    },
    async loadVariants() {
      if (!this.contentType || !this.type) return;
      try {
        const { data: response } = await _METHOD_content({
          method: "get",
          url: `/${this.contentType}/${this.type}/`,
          params: { routes: ["home"] },
        });
        const list = response?.data || [];
        const map = {};
        list.forEach((draft) => {
          (draft.channels || []).forEach((ch_idx) => {
            map[ch_idx] = { uid: draft.uid, name: draft.name };
          });
        });
        this.variants = map;
      } catch (error) {
        console.warn("HomeVariantSwitcher: failed to load variants", error);
      }
    },
    onSelect(ch) {
      this.open = false;
      if (this.isCurrent(ch.idx)) return;
      this.$emit("switch", {
        channel_idx: ch.idx,
        target_uid: this.variants[ch.idx]?.uid || null,
      });
    },
  },
};
</script>

<style lang="scss" scoped>
.home-switcher {
  position: relative;
}

.home-switcher__trigger {
  height: var(--elem-height);
  padding: 0 10px;
  border-radius: 5px;
  border: 1px solid var(--c-basic-400);
  background-color: var(--c-basic-100);
  color: var(--c-basic-600);
  font-size: 13px;
  transition: all 0.15s ease;
  white-space: nowrap;
  &:hover {
    background-color: var(--c-basic-300);
    color: var(--c-basic-800);
  }
}

.home-switcher__label {
  @media only screen and (max-width: 768px) {
    display: none;
  }
}

.home-switcher__backdrop {
  position: fixed;
  inset: 0;
  z-index: 9;
}

.home-switcher__drop {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  min-width: 240px;
  z-index: 10;
  background: var(--c-basic-100);
  border: 1px solid var(--c-basic-300);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-md);
  overflow: hidden;
}

.home-switcher__header {
  padding: 8px 12px;
  font-size: 11px;
  font-weight: 600;
  color: var(--c-basic-500);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  border-bottom: 1px solid var(--c-basic-300);
}

.home-switcher__item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  font-size: 13px;
  color: var(--c-basic-700);
  cursor: pointer;
  transition: background-color 0.1s ease;
  &:hover {
    background-color: var(--c-basic-200);
  }
  &--current {
    background-color: var(--c-support-100);
    cursor: default;
  }
  &--missing {
    color: var(--c-basic-500);
  }
  & + & {
    border-top: 1px solid var(--c-basic-200);
  }
}

.home-switcher__status {
  color: var(--c-basic-500);
  display: flex;
  align-items: center;
  gap: 4px;
}
</style>
