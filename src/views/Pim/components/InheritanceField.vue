<script>
import { usePimChannelStore } from "@/stores/pimChannel";

export default {
  name: "InheritanceField",
  props: {
    inherited: {
      type: Boolean,
      default: false,
    },
    language: {
      type: String,
      required: true,
    },
    overriddenLangs: {
      type: Array,
      default: () => [],
    },
    inheritedValue: {
      type: String,
      default: "",
    },
    disabled: {
      type: Boolean,
      default: false,
    },
  },
  emits: ["toggle-override"],
  setup() {
    const pimChannel = usePimChannelStore();
    return { pimChannel };
  },
  computed: {
    isOnDefaultChannel() {
      return this.pimChannel.isDefaultChannel;
    },
    showToggle() {
      return this.inherited && !this.isOnDefaultChannel;
    },
    isInherited() {
      return !this.overriddenLangs.includes(this.language);
    },
    isReadOnly() {
      return this.showToggle && this.isInherited;
    },
  },
  methods: {
    toggleOverride() {
      this.$emit("toggle-override", {
        language: this.language,
        override: this.isInherited,
      });
    },
  },
};
</script>

<template>
  <div class="inheritance-field">
    <div v-if="showToggle" class="inheritance-field__header">
      <span
        class="inheritance-badge"
        :class="{ 'inheritance-badge--inherited': isInherited }"
        :title="
          isInherited
            ? $t('pim.inherited_tooltip')
            : $t('pim.overridden_tooltip')
        "
      >
        <span
          v-if="isInherited"
          class="inheritance-badge__icon inheritance-badge__icon--linked"
        />
        <span
          v-else
          class="inheritance-badge__icon inheritance-badge__icon--cut"
        />
        <span class="inheritance-badge__label">{{
          isInherited ? $t("pim.inherited") : $t("pim.override")
        }}</span>
      </span>
    </div>
    <div :class="{ 'inheritance-field__readonly': isReadOnly }">
      <slot :readonly="isReadOnly" />
    </div>
    <div
      v-if="showToggle && isInherited && inheritedValue"
      class="inheritance-field__preview t-basic-400 fs-200"
    >
      {{ $t("pim.default_value", { value: inheritedValue }) }}
    </div>
  </div>
</template>

<style lang="scss" scoped>
.inheritance-field {
  position: relative;
}

.inheritance-field__header {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 4px;
}

.inheritance-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  background: none;
  border: 1px solid var(--c-basic-200);
  border-radius: var(--radius-sm);
  padding: 2px 8px;
  font-size: 11px;
  color: var(--c-basic-500);

  &--inherited {
    border-color: var(--c-support-300);
    background: var(--c-support-100);
    color: var(--c-support-400);
  }
}

.inheritance-badge__icon {
  display: inline-block;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;

  &--linked {
    background: var(--c-support-400);
  }

  &--cut {
    background: var(--c-basic-400);
  }
}

.inheritance-badge__label {
  font-weight: 500;
  letter-spacing: 0.02em;
  text-transform: uppercase;
}

.inheritance-field__readonly {
  opacity: 0.6;
  pointer-events: none;
  user-select: none;
}

.inheritance-field__preview {
  margin-top: 2px;
  font-style: italic;
  font-size: 11px;
}
</style>
