<template>
  <div
    class="subscriber-setter inline-flex"
    :id="componentUid"
    @click.stop="
      () => {
        if (is_disabled) return;
        open_Handykit({
          handyType,
          options,
          listener: { uuid: componentUid, bindTo: 'payload' },
          defaults,
        });
        $emit('onSet');
      }
    "
  >
    <slot></slot>
  </div>
</template>

<script>
import { getCurrentInstance } from "vue";
import { useHandyKitSubscriber } from "@/composables/useHandyKitSubscriber";
export default {
  setup() {
    const { setupSubscriber, open_Handykit } = useHandyKitSubscriber({
      subscriberId: true,
      type: "flat",
    });
    return { setupSubscriber, open_Handykit };
  },
  props: {
    handyType: {
      type: Object,
      default: () => {
        return {
          id: "images-kit",
          label: "Photos",
        };
      },
    },
    defaults: {
      default: null,
    },
    options: {
      type: [Object, Boolean],
      default: null,
    },
    is_disabled: {
      default: false,
    },
  },
  data() {
    return {
      payload: undefined,
      componentUid: null,
      unsubscribe: null,
    };
  },
  created() {
    this.componentUid = getCurrentInstance().uid;
    this.unsubscribe = this.setupSubscriber(this, this.componentUid);
  },
  beforeUnmount() {
    if (this.unsubscribe) this.unsubscribe();
  },
  watch: {
    payload: function () {
      this.$emit("on_AssetPass", this.payload);
    },
  },
};
</script>
