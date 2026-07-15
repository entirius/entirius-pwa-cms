<template>
  <div class="basic-checkbox">
    <p class="mb-100" v-if="label">{{ label }}</p>
    <label
      class="pointer basic-checkbox-wrapper input-container"
      :class="{ 'mb-50': values.length !== 1 && i !== values.length - 1 }"
      v-for="(c, i) in values"
      :key="`unique-checkbox-key-${i}`"
      @input="updateValue(c)"
    >
      <div
        class="relative checkbox-label pointer"
        :class="[
          type === 'radio' ? 'radio' : '',
          type === 'checkbox' ? 'basic-checkbox' : '',
          { checked: selected.includes(c.value) },
        ]"
      >
        <i
          class="absolute checkbox-mark pointer icon-check fs-100"
          v-if="selected.includes(c.value) && type !== 'radio'"
        ></i>
        <input :type="type" :checked="selected.indexOf(c.value) > -1" />
      </div>
      <span class="basic-checkbox-label" v-if="c.label" v-html="c.label" />
    </label>
  </div>
</template>
<script>
export default {
  props: {
    values: {
      type: [Array],
      default: () => {
        return [
          {
            label: "label 2",
            key: null,
            value: 1,
          },
          {
            label: "label 1",
            key: null,
            value: 2,
          },
        ];
      },
    },
    init_selected: {
      type: Array,
      default: () => [],
    },
    type: {
      type: String,
      default: "checkbox",
    },
    label: {
      type: [String, Boolean],
      default: false,
    },
  },
  data() {
    return {
      selected: [],
    };
  },
  methods: {
    add(c) {
      this.selected.includes(c.value)
        ? (this.selected = this.selected.filter((el) => {
            return el !== c.value;
          }))
        : this.selected.push(c.value);
    },
    override(c) {
      this.selected = [];
      this.selected.push(c.value);
    },
    updateValue(c) {
      this.type === "radio" ? this.override(c) : this.add(c);
      this.$emit("onSelect", this.selected);
    },
  },
  created() {
    if (this.init_selected) this.selected = [...this.init_selected];
  },
};
</script>
<style lang="scss">
.basic-checkbox-wrapper {
  z-index: 2;
  //background: inherit;
  display: flex;
  align-items: center;
  span {
    margin-top: 1px;
  }
  .checkbox-label {
    overflow: hidden;
    display: inline-block;
    height: 1.25rem;
    width: 1.25rem;
    outline: none;
    min-width: 1.25rem;
    margin-right: 16px;
    border: 1px solid var(--c-basic-500);
    .checkbox-mark {
      z-index: 10;
      top: 65%;
      left: 50%;
      transform: translate(-50%, -70%);
    }
    &.basic-checkbox {
      border-radius: 0.125rem;
      color: var(--c-basic-100);
      //  &.checked {
      //   background-color: var(--c-basic-800);
      //   border: 1px solid var(--c-basic-800);
      //  }
      &.checked {
        // background-color: var(--c-basic-800);
        border: 1px solid var(--c-basic-700);
        &::after {
          content: "";
          background-color: var(--c-basic-700);
          position: absolute;
          transform: translate(-50%, -50%);
          top: 50%;
          left: 50%;
          height: 1.25rem;
          width: 1.25rem;
        }
      }
      &:hover {
        border: 1px solid var(--c-basic-700);
      }
    }
    &.radio {
      border-radius: 50%;
      position: relative;
      border: 1px solid var(--c-basic-500);
      &:hover {
        border: 1px solid var(--c-basic-700);
        &::after {
          content: "";
          position: absolute;
          transform: translate(-50%, -50%);
          top: 50%;
          left: 50%;
          height: 0.75rem;
          width: 0.75rem;
          border-radius: 50%;
        }
      }
      &.checked {
        border: 1px solid var(--c-basic-500);
        &::after {
          content: "";
          background-color: var(--c-basic-700);
          position: absolute;
          transform: translate(-50%, -50%);
          top: 50%;
          left: 50%;
          height: 0.8rem;
          width: 0.8rem;
          border-radius: 50%;
        }
      }
    }
  }

  input {
    -webkit-appearance: none;
    -moz-appearance: none;
    appearance: none;
  }
  .icon-check:before {
    color: var(--c-basic-100);
    //font-size: 1.2rem;
  }
}
</style>
