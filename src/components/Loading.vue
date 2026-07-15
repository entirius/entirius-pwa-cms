<template>
  <transition name="fade">
    <div class="loading" :class="isHandy ? 'loading-handy' : 'loading-page'">
      <svg
        version="1.1"
        xmlns="http://www.w3.org/2000/svg"
        xmlns:xlink="http://www.w3.org/1999/xlink"
        x="0px"
        y="0px"
        viewBox="0 0 100 100"
        enable-background="new 0 0 0 0"
        xml:space="preserve"
        class="loader"
      >
        <defs>
          <linearGradient id="MyGradient">
            <stop offset="5%" stop-color="var(--c-basic-900)" />
            <stop offset="95%" stop-color="var(--c-basic-400)" />
          </linearGradient>
        </defs>
        <path
          fill="url(#MyGradient)"
          d="M73,50c0-12.7-10.3-23-23-23S27,37.3,27,50 M30.9,50c0-10.5,8.5-19.1,19.1-19.1S69.1,39.5,69.1,50"
        ></path>
      </svg>
    </div>
  </transition>
</template>

<script>
export default {
  props: {
    isHandy: {
      type: Boolean,
      default: false,
    },
  },
};
</script>

<style lang="scss">
.loading-page {
  position: fixed;
}
.loading-handy {
  position: absolute;
}
.loading {
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: grid;
  place-items: center;
  background: var(--overlay-loading);
  z-index: 999;
  .loader {
    width: 100px;
    height: 100px;
    margin: 20px;
    display: inline-block;
    animation: loader 0.45s infinite;
    .svg-path {
      fill: linear-gradient(
        90deg,
        rgba(0, 0, 0, 1) 0%,
        rgba(255, 255, 255, 1) 100%
      );
    }
  }
  @keyframes loader {
    to {
      transform: rotate(360deg);
    }
  }
}
</style>
