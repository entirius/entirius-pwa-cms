<template>
  <div class="basic-date-picker inline-block">
    <p v-if="label && label.length" class="mb-100">{{ label }}</p>
    <div class="relative">
      <div class="flex ai-ct gap-100">
        <BasicButton
          :icon="`${!value ? 'plus' : 'edit'}`"
          :text="`${value ?? $t('routes.set_new')}`"
          class="bg-support-400 t-basic-100 fs-100 lh-init pl-100 pr-100 pt-50 pb-50 br-50"
          @click="
            () => {
              visible = true;
            }
          "
        />
      </div>
      <div
        class="picker-wrapper bg-inherit bg-basic-100"
        v-show="visible"
        v-out="'visible'"
      >
        <div :data-uid="custom_uid">
          <input type="text" data-input style="display: none" />
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { v4 as uuidv4 } from "uuid";
import { Polish } from "flatpickr/dist/l10n/pl.js";
export default {
  props: {
    custom_uid: {
      type: String,
      default: () => uuidv4(),
    },
    config: {
      type: [Object],
      required: false,
      default: () => {
        return {
          mode: "range",
          wrap: true,
          inline: true,
          altInputClass: "invisible",
          enableTime: false,
          noCalendar: false,
        };
      },
    },
    value: {
      type: [String],
      default: "",
    },
    label: {
      type: [String],
      required: false,
    },
  },
  data() {
    return {
      visible: false,
      instance: null,
      options: {
        emit_event: true,
        event_name: "out_click",
      },
    };
  },
  methods: {
    init() {
      this.instance = flatpickr(`div[data-uid='${this.custom_uid}']`, {
        ...this.config,
        defaultDate: this.value,
        locale: Polish,
        onChange: (e, iso_date, g) => {
          this.$emit("onChange", iso_date);
        },
      });
    },
  },
  mounted() {
    this.init();
  },
  beforeDestroy() {
    this.instance.destroy();
  },
};
</script>

<style lang="scss">
.basic-date-picker {
  background-color: inherit;

  .picker-wrapper {
    position: absolute;
    bottom: 0;
    transform: translateY(100%);
    left: 0;
    z-index: 4;
  }
  // reset picker
  .flatpickr-calendar {
    background-color: inherit;
    color: inherit;
    font-size: inherit;
    border: 1px solid var(--c-basic-400);
    border-radius: var(--space-50);
    box-shadow: unset;
  }
  .flatpickr-day.selected,
  .flatpickr-day.startRange,
  .flatpickr-day.endRange {
    background-color: var(--c-support-400);
    border-radius: var(--space-50);
    box-shadow: unset;
  }

  .flatpickr-calendar.inline {
    top: 0;
  }

  .flatpickr-day.today {
    background: var(--c-support-300);
    color: var(--c-basic-900);
    font-weight: 600;
    border-radius: var(--space-50);
    border: none;

    &.inRange {
      color: var(--c-support-400);
    }
  }
  .flatpickr-day.inRange {
    background: var(--c-basic-200);
    box-shadow: unset;
    border: none;
  }
  .flatpickr-day:hover {
    border-radius: var(--space-50);
  }
  .flatpickr-calendar.hasTime .flatpickr-time {
    border: 0;
  }
  .flatpickr-time input {
    background-color: inherit;
    color: inherit;
    font-size: inherit;
  }
}

[data-theme="dark"] .basic-date-picker {
  .flatpickr-calendar {
    background-color: var(--c-basic-200);
    color: var(--c-basic-700);
  }
  .flatpickr-months .flatpickr-month,
  .flatpickr-current-month .flatpickr-monthDropdown-months {
    background-color: var(--c-basic-200);
    color: var(--c-basic-700);
  }
  .flatpickr-weekdays {
    background-color: var(--c-basic-200);
  }
  span.flatpickr-weekday {
    background-color: var(--c-basic-200);
    color: var(--c-basic-500);
  }
  .flatpickr-day {
    color: var(--c-basic-700);
    &:hover {
      background-color: var(--c-basic-300);
      border-color: var(--c-basic-300);
    }
    &.flatpickr-disabled {
      color: var(--c-basic-500);
    }
  }
  .flatpickr-months .flatpickr-prev-month,
  .flatpickr-months .flatpickr-next-month {
    fill: var(--c-basic-600);
    &:hover svg {
      fill: var(--c-basic-800);
    }
  }
}
</style>
