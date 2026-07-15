<template>
  <div class="buttons-controller" :id="`buttons-controller-${componentId}`">
    <div class="mb-50 flex jc-sb ai-ct">
      <span v-if="label">{{ label }}</span>

      <ToolTip
        class="right t-support-300 fs-200"
        :tip="
          value
            ? $t('controllers.tooltip_select_button')
            : $t('controllers.tooltip_add_button')
        "
      >
      </ToolTip>
    </div>

    <div class="grid grid-col-3 gap-100 mt-200" v-if="mode">
      <BasicInput
        class="bg-basic-100 lh-base-elem"
        :label="tFieldLabel('label', $t('controllers.set_label'))"
        v-model="link_label"
        :key="`${force_refresh_v_model}-label`"
      />
      <BasicInput
        class="bg-basic-100 lh-base-elem"
        :label="tFieldLabel('url', $t('controllers.set_url'))"
        v-model="link_url"
        :key="`${force_refresh_v_model}-url`"
      />
      <Dropdown
        class="bg-basic-100 br-50 b-basic-400"
        :placeholder="$t('controllers.link_type')"
        :values="[
          { label: tFieldLabel('internal', 'In'), value: 'internal' },
          { label: tFieldLabel('external', 'Out'), value: 'external' },
        ]"
        :selected="link_type ? [link_type] : []"
        @onSelect="link_type = $event"
      />
    </div>

    <div class="grid grid-col-3 gap-100 mt-100 ai-ct" v-if="mode">
      <Dropdown
        v-if="config && config.decorator && config.decorators.length"
        :placeholder="$t('controllers.select_decorator')"
        class="bg-basic-100 br-50 b-basic-400 fs-200"
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
        class="inline-flex jc-sb ai-ct bg-basic-100 h-100 br-50 b-basic-400 ph-100"
        v-if="
          config && config.decorator && config.decorators.length && config.rtl
        "
      >
        <Switcher
          class="mr-50"
          :label="$t('controllers.rtl_label')"
          :selected="link_rtl"
          @onSelect="link_rtl = !link_rtl"
        />
        <ToolTip
          :tip="$t('controllers.rtl_tip')"
          class="fs-300 right t-primary-100"
        />
      </div>
      <div class="grid">
        <BasicButton
          :text="mode === 'add' ? $t('common.add') : $t('common.save')"
          class="bg-basic-200 b-basic-400 bg-basic-100-hover br-50"
          @click="
            set_button({
              link_url,
              link_label,
              link_type,
              link_decorator,
              link_rtl,
            })
          "
        />
      </div>
    </div>
    <div class="mt-50">
      <div class="flex">
        <BasicButton
          :text="!mode ? $t('routes.set_new') : $t('common.close')"
          class="b-basic-400 bg-basic-100 bg-basic-300-hover br-50 fs-100 mr-50"
          :class="{ 'bg-basic-800 t-basic-100 bg-basic-700-hover': mode }"
          @click="!mode ? (mode = 'add') : (mode = null)"
        />
        <Dropdown
          class="bg-basic-100 br-50 b-basic-400 fg-1"
          :class="[!Boolean(value) ? 'bg-basic-200 t-basic-400' : '']"
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
                    label_ext_class: 't-negative-200',
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
