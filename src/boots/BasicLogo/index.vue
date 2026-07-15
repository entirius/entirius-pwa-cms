<template>
  <div class="basic-logo">
    <img
      v-if="variant === 'full'"
      :src="logoSrc"
      alt="Entirius"
      :style="{ height: size + 'px', width: 'auto', display: 'block' }"
    />
    <svg
      v-else
      :width="size"
      :height="size"
      viewBox="0 0 400 400"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="ensoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color: #00e5ff" />
          <stop offset="30%" style="stop-color: #00acc1" />
          <stop offset="70%" style="stop-color: #455a64" />
          <stop offset="100%" style="stop-color: #546e7a" />
        </linearGradient>
      </defs>
      <path
        d="M 150 300 A 110 110 0 1 1 250 300 L 240 320 A 130 130 0 1 0 160 320 Z"
        fill="url(#ensoGradient)"
      />
    </svg>
  </div>
</template>

<script>
import logoDark from "@/assets/svg/commons/entirius-dark.png";
import logoLight from "@/assets/svg/commons/entirius-light.png";
import { useUserStore } from "@/stores/user";

export default {
  setup() {
    const userStore = useUserStore();
    return { userStore };
  },
  props: {
    size: {
      type: Number,
      default: 32,
    },
    variant: {
      type: String,
      default: "icon",
    },
  },
  computed: {
    logoSrc() {
      return this.userStore.theme === "dark" ? logoLight : logoDark;
    },
  },
};
</script>
