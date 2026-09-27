<template>
  <div class="buttons-controller" :id="`buttons-controller-${componentId}`">
    <div class="mb-1 flex jc-sb ai-ct">
      <span v-if="label">{{ label }}</span>

      <BasicTooltip
        class="t-accent fs-200"
        :text="
          value
            ? $t('controllers.tooltip_select_button')
            : $t('controllers.tooltip_add_button')
        "
        variant="help"
      >
      </BasicTooltip>
    </div>

    <div class="grid grid-col-3 gap-2 mt-5" v-if="mode">
      <FormField :label="tFieldLabel('label', $t('controllers.set_label'))" :key="`${force_refresh_v_model}-label`">
        <BasicInput
          class="bg-base lh-base-elem"
          v-model="link_label"
        />
      </FormField>
      <FormField :label="tFieldLabel('url', $t('controllers.set_url'))" :key="`${force_refresh_v_model}-url`">
        <BasicInput
          class="bg-base lh-base-elem"
          v-model="link_url"
        />
      </FormField>
      <Dropdown
        class="bg-base rounded b-default"
        :placeholder="$t('controllers.link_type')"
        :values="[
          { label: tFieldLabel('internal', 'In'), value: 'internal' },
          { label: tFieldLabel('external', 'Out'), value: 'external' },
        ]"
        :selected="link_type ? [link_type] : []"
        @onSelect="link_type = $event"
      />
    </div>

    <div class="grid grid-col-3 gap-2 mt-2 ai-ct" v-if="mode">
      <Dropdown
        v-if="config && config.decorator && config.decorators.length"
        :placeholder="$t('controllers.select_decorator')"
        class="bg-base rounded b-default fs-200"
        :values="
          config.decorators.map((d) => {
            return { label: d, value: d };
          })
        "
        :selected="link_decorator ? [link_decorator] : []"
        :isDisabled="Boolean(link_decorator)"
        :can_remove_selected="true"
        @onRemoveSelected="link_decorator = null"
        :icon="link_decorator ? 'close-mini' : 'arrow-right-2'"
        @onSelect="link_decorator = $event"
      />
      <div
        class="inline-flex jc-sb ai-ct bg-base h-100 rounded b-default ph-2"
        v-if="
          config && config.decorator && config.decorators.length && config.rtl
        "
      >
        <BasicSwitch
          class="mr-1"
          :label="$t('controllers.rtl_label')"
          v-model="link_rtl"
        />
        <BasicTooltip
          :text="$t('controllers.rtl_tip')"
          class="fs-300 t-accent"
          variant="help"
        />
      </div>
      <div class="grid">
        <BasicButton
          class="bg-raised b-default bg-base-hover rounded"
          @click="
            set_button({
              link_url,
              link_label,
              link_type,
              link_decorator,
              link_rtl,
            })
          "
        >
          {{ mode === 'add' ? $t('common.add') : $t('common.save') }}
        </BasicButton>
      </div>
    </div>
    <div class="mt-1">
      <div class="flex">
        <BasicButton
          class="b-default bg-base bg-hover-hover rounded fs-200 mr-1"
          :class="{ 'bg-inverse t-inverse bg-inverse-hover': mode }"
          @click="!mode ? (mode = 'add') : (mode = null)"
        >
          {{ !mode ? $t('routes.set_new') : $t('common.close') }}
        </BasicButton>
        <Dropdown
          class="bg-base rounded b-default fg-1"
          :class="[!Boolean(value) ? 'bg-raised t-muted' : '']"
          :placeholder="`${$t('controllers.setted')} (${
            !value ? [].length : value.length
          }/${
            config && config.max ? config.max : $t('controllers.unlimited')
          })`"
          :isDisabled="!Boolean(value)"
          :values="
            !value
              ? []
              : value.map((b, i) => {
                  return {
                    label: `${b.link_label} / [to_: ${b.link_url} | type_: ${b.link_type}]`,
                    value: i,
                    label_ext: $t('common.delete'),
                    label_ext_class: 't-negative',
                  };
                })
          "
          @onSelect="
            ($event) => {
              on_edit($event);
              force_refresh_v_model += force_refresh_v_model;
            }
          "
          @onExtension="
            editing = $event;
            on_delete({
              link_url,
              link_label,
              link_type,
              link_decorator,
              link_rtl,
            });
          "
        />
      </div>
    </div>
  </div>
</template>

<script>
import { getCurrentInstance } from "vue";
import { useNotifyStore } from "@/stores/notify";
export default {
  setup() {
    const notify = useNotifyStore();
    return { notify };
  },
  computed: {
    componentId() {
      return getCurrentInstance()?.uid || "buttons-controller";
    },
  },
  props: {
    value: {
      type: [Array, Boolean],
      default: () => [],
    },
    config: {
      type: [Object, Boolean],
      default: null,
    },
    configName: {
      type: String,
      default: null,
    },
    label: {
      type: [String, Boolean],
      default: null,
    },
  },
  data() {
    return {
      mode: null,
      editing: null,
      link_url: null,
      link_label: null,
      link_type: null,
      link_decorator: null,
      link_rtl: null,
      force_refresh_v_model: 1,
    };
  },
  methods: {
    tFieldLabel(key, fallback) {
      if (!this.configName) return fallback;
      const i18nKey = `prop_option.${this.configName}.${key}`;
      const translated = this.$t(i18nKey);
      return translated !== i18nKey ? translated : fallback;
    },
    set_button({ link_url, link_label, link_type, link_decorator, link_rtl }) {
      if (![link_url, link_label, link_type].every(Boolean)) {
        this.notify.spawnNotification({
          title: this.$t("notifications.error"),
          msg: this.$t("categories.empty_fields"),
          type: "negative",
        });
        return;
      }
      let button = {
        link_url,
        link_label,
        link_type,
        link_decorator,
        link_rtl,
      };

      const _value = this.value ?? [];

      const _limit = this.config && this.config.max;

      if (_limit && _value.length >= _limit && this.mode === "add") {
        this.notify.spawnNotification({
          title: this.$t("notifications.error"),
          msg: this.$t("notifications.save_error"),
          type: "negative",
        });
        return;
      }
      this.mode === "add"
        ? _value.push(button)
        : (_value[this.editing] = button);

      this.$emit("onChange", _value);
      this.on_clear(button);
    },
    on_edit(index) {
      this.editing = index;
      const _link = this.value[index];
      if (!_link) {
        this.notify.spawnNotification({
          title: this.$t("notifications.error"),
          msg: this.$t("notifications.unexpected_error"),
          type: "negative",
        });
        return;
      }
      Object.entries(_link).forEach((entry) => {
        const [key, value] = entry;

        this[key] = value;
      });
      this.mode = "edit";
      return;
    },
    on_clear({ link_url, link_label, link_type, link_decorator, link_rtl }) {
      let button = {
        link_url,
        link_label,
        link_type,
        link_decorator,
        link_rtl,
      };
      Object.entries(button).forEach((entry) => {
        const [key, value] = entry;

        this[key] = null;
      });
      this.editing = null;
      this.force_refresh_v_model += this.force_refresh_v_model;
      this.mode = "add";
    },
    on_delete({ link_url, link_label, link_type, link_decorator, link_rtl }) {
      let _value = this.value;
      const _item = _value[this.editing];
      if (!this.editing && !_item) {
        this.notify.spawnNotification({
          title: this.$t("notifications.error"),
          msg: this.$t("notifications.unexpected_error"),
          type: "negative",
        });

        return;
      }
      _value.splice(this.editing, 1);

      let button = {
        link_url,
        link_label,
        link_type,
        link_decorator,
        link_rtl,
      };

      !_value.length ? (_value = null) : _value;

      this.$emit("onChange", _value);
      this.on_clear(button);
    },
  },
};
</script>
