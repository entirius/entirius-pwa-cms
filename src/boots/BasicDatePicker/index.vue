<template>
  <div class="basic-date-picker inline-block">
    <p v-if="label && label.length" class="mb-2">{{ label }}</p>
    <div class="relative">
      <div class="flex ai-ct gap-2">
        <BasicButton
          :icon="`${!value ? 'plus' : 'edit'}`"
          :text="`${value ?? $t('routes.set_new')}`"
          class="bg-accent-fill t-on-accent-fill fs-100 lh-init pl-2 pr-2 pt-1 pb-1 rounded"
          @click="
            () => {
              visible = true;
            }
          "
        />
      </div>
      <div
        class="picker-wrapper bg-inherit bg-base"
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
    border: 1px solid var(--border-default);
    border-radius: var(--radius-base);
    box-shadow: unset;
  }
  .flatpickr-day.selected,
  .flatpickr-day.startRange,
  .flatpickr-day.endRange {
    background-color: var(--accent-fill);
    border-radius: var(--radius-base);
    box-shadow: unset;
  }

  .flatpickr-calendar.inline {
    top: 0;
  }

  .flatpickr-day.today {
    background: var(--accent-fill);
    color: var(--text-strong);
    font-weight: 600;
    border-radius: var(--radius-base);
    border: none;

    &.inRange {
      color: var(--text-accent);
    }
  }
  .flatpickr-day.inRange {
    background: var(--surface-raised);
    box-shadow: unset;
    border: none;
  }
  .flatpickr-day:hover {
    border-radius: var(--radius-base);
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
    background-color: var(--surface-raised);
    color: var(--text-body);
  }
  .flatpickr-months .flatpickr-month,
  .flatpickr-current-month .flatpickr-monthDropdown-months {
    background-color: var(--surface-raised);
    color: var(--text-body);
  }
  .flatpickr-weekdays {
    background-color: var(--surface-raised);
  }
  span.flatpickr-weekday {
    background-color: var(--surface-raised);
    color: var(--text-muted);
  }
  .flatpickr-day {
    color: var(--text-body);
    &:hover {
      background-color: var(--surface-hover);
      border-color: var(--border-subtle);
    }
    &.flatpickr-disabled {
      color: var(--text-muted);
    }
  }
  .flatpickr-months .flatpickr-prev-month,
  .flatpickr-months .flatpickr-next-month {
    fill: var(--text-secondary);
    &:hover svg {
      fill: var(--text-body);
    }
  }
}
</style>
