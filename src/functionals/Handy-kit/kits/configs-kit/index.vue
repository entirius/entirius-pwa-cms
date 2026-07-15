<template>
  <div class="flex-column gap-200 jc-sb">
    <nav
      class="flex ai-ct jc-sb bg-basic-200 pl-400 pr-400 pt-200 pb-200 t-basic-600 br-tl-50 br-tr-50"
    >
      <p class="fw-600 fs-400 uppercase">
        {{ handyType.label ? handyType.label : $t("common.click") }}
      </p>
      <div class="flex ai-ct gap-200">
        <span v-if="handy.isDirty" class="chip bg-warning-100 t-warning-300">
          {{ $t("unsaved.changes") }}
        </span>
        <i class="icon-close-mini pointer t-basic-600" @click="requestClose" />
      </div>
    </nav>
    <div class="fg-1 pl-400 pr-400 ovy-auto pb-400">
      <div>
        <p class="fs-300 t-basic-600">{{ $t("config.config_part") }}</p>
        <hr class="mv-100" />
        <div class="grid grid-col-4 gap-100 t-basic-700">
          <template
            v-for="(
              {
                prop = null,
                label = null,
                type = null,
                __value = null,
                _for = null,
                hidden = false,
              },
              i
            ) in core_config"
          >
            <component
              v-if="
                !hidden &&
                _for[processing_config_type] &&
                !option_visibility(
                  _for[processing_config_type].map(
                    ({ label = null, value = null, variants = null }) => {
                      return cores_dependency_check('options', {
                        label,
                        value,
                        variants,
                      });
                    }
                  )
                )
              "
              :is="props_handlers[type]"
              :placeholder="tConfig(prop)"
              :values="
                _for[processing_config_type].map(
                  ({ label = null, value = null, variants = null }) => {
                    const opt = cores_dependency_check('options', {
                      label,
                      value,
                      variants,
                    });
                    return { ...opt, label: tOption(value) || opt.label };
                  }
                )
              "
              :selected="[__value]"
              @onSelect="
                set_config('core_config', { key: prop, value: $event });
                reset({ setter: prop, _in: 'core_config' });
                reset({ setter: null, _in: 'optional_config' });
              "
              class="bg-basic-100 b-basic-400 mb-50 br-50 shadow-down fs-200 t-basic-700"
            ></component>
          </template>
        </div>

        <hr class="mv-50" />
        <div class="grid grid-col-4 gap-100">
          <template
            v-for="(
              {
                prop = null,
                label = null,
                type = null,
                __value = null,
                _for = null,
                hidden = false,
              },
              i
            ) in optional_config"
          >
            <component
              v-if="
                !hidden &&
                _for[processing_config_type] &&
                !option_visibility(
                  _for[processing_config_type].map(
                    ({ label = null, value = null, variants = null }) => {
                      return cores_dependency_check('options', {
                        label,
                        value,
                        variants,
                      });
                    }
                  )
                )
              "
              :is="props_handlers[type]"
              :placeholder="tConfig(prop)"
              :values="
                _for[processing_config_type].map(
                  ({ label = null, value = null, variants = null }) => {
                    const opt = cores_dependency_check('options', {
                      label,
                      value,
                      variants,
                    });
                    return { ...opt, label: tOption(value) || opt.label };
                  }
                )
              "
              :selected="[__value]"
              @onSelect="
                set_config('optional_config', { key: prop, value: $event })
              "
              :style="prop === 'dye' ? 'grid-column: span 2' : null"
              class="bg-basic-100 b-basic-400 mb-50 br-50 shadow-down fs-200 t-basic-700"
            ></component>
          </template>
        </div>

        <p class="fs-300 t-basic-600 mt-200">
          {{ $t("config.props_handlers") }}
        </p>
        <hr class="mv-100" />
        <template
          v-for="(
            {
              prop = null,
              type = null,
              label = null,
              __value = null,
              _for = null,
            },
            i
          ) in core_properties"
        >
          <!-- SKU picker for product_sku and sku props -->
          <div
            v-if="
              props_handlers[type] === 'BasicInput' &&
              (prop === 'product_sku' || prop === 'sku') &&
              props_dependency_check('props', _for[processing_config_type])
            "
            class="mt-400"
          >
            <div class="flex ai-ct jc-sb mb-50">
              <p class="fs-200 fw-600 t-basic-500 uppercase">{{ tProp(prop) }}</p>
              <button
                v-if="skuPickerChannel"
                class="fs-100 t-support-400 pointer"
                style="background: none; border: none; text-decoration: underline"
                @click="skuManualMode = !skuManualMode"
              >
                {{ skuManualMode ? $t('builder.sku_switch_search') : $t('builder.sku_switch_manual') }}
              </button>
            </div>
            <!-- Search mode -->
            <EntitySearchPicker
              v-if="skuPickerChannel && !skuManualMode"
              :modelValue="__value"
              :displayValue="__value || ''"
              :fetchFn="productFetchFn"
              :placeholder="$t('builder.sku_search_placeholder')"
              @update:modelValue="
                core_properties = core_properties.map((property) => ({
                  ...property,
                  __value: property.prop === prop ? $event : property.__value,
                }))
              "
              @clear="
                core_properties = core_properties.map((property) => ({
                  ...property,
                  __value: property.prop === prop ? null : property.__value,
                }))
              "
            />
            <!-- Manual mode or no channel available -->
            <BasicInput
              v-if="!skuPickerChannel || skuManualMode"
              :modelValue="__value"
              @onFocusout="
                ($event) =>
                  (core_properties = core_properties.map((property) => ({
                    ...property,
                    __value: property.prop === prop ? $event : property.__value,
                  })))
              "
              class="br-50 bg-basic-100 lh-base-elem fs-200"
            />
            <p v-if="skuPickerDisabledMsg && !skuManualMode" class="fs-100 t-basic-500 mt-50">
              <FontAwesomeIcon icon="circle-info" class="mr-50" />
              {{ skuPickerDisabledMsg }}
            </p>
          </div>
          <BasicInput
            v-if="
              props_handlers[type] === 'BasicInput' &&
              prop !== 'product_sku' &&
              prop !== 'sku' &&
              props_dependency_check('props', _for[processing_config_type])
            "
            :modelValue="__value"
            :label="tProp(prop)"
            @onFocusout="
              ($event) =>
                (core_properties = core_properties.map((property) => {
                  return {
                    ...property,
                    __value: property.prop === prop ? $event : property.__value,
                  };
                }))
            "
            class="br-50 bg-basic-100 mt-400 lh-base-elem fs-200"
          />
          <div
            v-if="
              props_handlers[type] === 'BasicWysiwyg' &&
              props_dependency_check('props', _for[processing_config_type])
            "
          >
            <p class="mb-50 mt-200 fs-200" v-if="label">{{ tProp(prop) }}</p>
            <BasicWysiwyg
              class="b-basic-400 br-50 p-100 bg-basic-100 fs-200"
              @onFocusout="
                ($event) =>
                  (core_properties = core_properties.map((property) => {
                    return {
                      ...property,
                      __value:
                        property.prop === prop ? $event : property.__value,
                    };
                  }))
              "
              :body="__value"
            />
          </div>
          <ImagesController
            class="fs-200 mt-200"
            v-if="
              props_handlers[type] === 'ImagesController' &&
              props_dependency_check('props', _for[processing_config_type])
            "
            :value="__value"
            :label="tProp(prop)"
            @onChange="
              ($event) =>
                (core_properties = core_properties.map((property) => {
                  return {
                    ...property,
                    __value: property.prop === prop ? $event : property.__value,
                  };
                }))
            "
          />
          <ButtonsController
            class="fs-200 mt-200"
            v-if="
              props_handlers[type] === 'ButtonsController' &&
              props_dependency_check('props', _for[processing_config_type])
            "
            :configName="
              props_dependency_check('options', _for[processing_config_type])
            "
            :key="`${props_dependency_check(
              'options',
              _for[processing_config_type]
            )}`"
            :config="
              props_options[
                props_dependency_check('options', _for[processing_config_type])
              ]
            "
            :value="__value"
            :label="tProp(prop)"
            @onChange="
              ($event) =>
                (core_properties = core_properties.map((property) => {
                  return {
                    ...property,
                    __value: property.prop === prop ? $event : property.__value,
                  };
                }))
            "
          />

          <GroupFieldsController
            class="fs-200 mt-200"
            v-if="
              props_handlers[type] === 'GroupFieldsController' &&
              props_dependency_check('props', _for[processing_config_type])
            "
            :value="__value"
            :label="tProp(prop)"
            :configName="
              props_dependency_check('options', _for[processing_config_type])
            "
            :key="`${props_dependency_check(
              'options',
              _for[processing_config_type]
            )}`"
            :config="
              props_options[
                props_dependency_check('options', _for[processing_config_type])
              ]
            "
            @onChange="
              ($event) =>
                (core_properties = core_properties.map((property) => {
                  return {
                    ...property,
                    __value: property.prop === prop ? $event : property.__value,
                  };
                }))
            "
          />

          <BasicDatePicker
            class="fs-200 mt-200"
            v-if="
              props_handlers[type] === 'BasicDatePicker' &&
              props_dependency_check('props', _for[processing_config_type])
            "
            :value="__value"
            :label="tProp(prop)"
            :key="`${props_dependency_check(
              'options',
              _for[processing_config_type]
            )}`"
            :config="
              props_options[
                props_dependency_check('options', _for[processing_config_type])
              ]
            "
            @onChange="
              ($event) =>
                (core_properties = core_properties.map((property) => {
                  return {
                    ...property,
                    __value: property.prop === prop ? $event : property.__value,
                  };
                }))
            "
          />

          <StanceSwitcher
            v-if="
              props_handlers[type] === 'StanceSwitcher' &&
              props_dependency_check('props', _for[processing_config_type])
            "
            :value="__value"
            :label="tProp(prop)"
            :config="
              props_options[
                props_dependency_check('options', _for[processing_config_type])
              ]
            "
            @onChange="
              ($event) =>
                (core_properties = core_properties.map((property) => {
                  return {
                    ...property,
                    __value: property.prop === prop ? $event : property.__value,
                  };
                }))
            "
            :key="`${props_dependency_check(
              'options',
              _for[processing_config_type]
            )}`"
          />
        </template>
      </div>
    </div>
    <div
      class="grid grid-col-3 rtl-direction bg-basic-200 pl-400 pr-400 pt-100 pb-100"
    >
      <BasicButton
        class="bg-basic-700 br-50 bg-support-400 b-support-400 fs-200 b-basic-800 t-basic-100 w-100 jc-ct"
        :text="$t('common.save')"
        @click="pass_asset({})"
      />
    </div>
  </div>
</template>
<script>
import { useNotifyStore } from "@/stores/notify";
import { useHandyStore } from "@/stores/handy";
import {
  buildSettedConfigsValues,
  checkCoresDependency,
  checkPropsDependency,
  isAllOptionsDisabled,
} from "@/composables/useVariantMatching";
import { useProductFetch } from "@/composables/useEntityFetch";
export default {
  setup() {
    const notify = useNotifyStore();
    const handy = useHandyStore();
    return { notify, handy };
  },
  data() {
    return {
      type: null,
      props_handlers: null,
      props_options: null,
      core_config: null,
      optional_config: null,
      hidden_config: null,
      core_properties: null,
      processing_config_type: "section_configs",
      skuManualMode: false,
      initialSnapshot: null,
    };
  },

  beforeUnmount() {},
  computed: {
    defaults() {
      return this.handy.defaults;
    },
    options() {
      return this.handy.options;
    },
    handyType() {
      return this.handy.handyType;
    },
    skuPickerChannel() {
      const ch = this.defaults?.__channels || [];
      return ch.length === 1 ? ch[0] : null;
    },
    skuPickerDisabledMsg() {
      const ch = this.defaults?.__channels || [];
      if (ch.length === 0) return this.$t("builder.sku_assign_channel");
      if (ch.length > 1) return this.$t("builder.sku_narrow_channel");
      return null;
    },
    productFetchFn() {
      if (!this.skuPickerChannel) return null;
      return useProductFetch(this.skuPickerChannel);
    },
  },
  watch: {
    defaults() {
      if (this.core_config) {
        this.load_configs();
      }
    },
    core_config: { deep: true, handler() { this.checkDirty(); } },
    optional_config: { deep: true, handler() { this.checkDirty(); } },
    core_properties: { deep: true, handler() { this.checkDirty(); } },
  },
  methods: {
    takeSnapshot() {
      this.initialSnapshot = this.getValuesSnapshot();
    },
    getValuesSnapshot() {
      const extract = (arr) =>
        (arr || []).map(({ prop, __value }) => [prop, JSON.stringify(__value)]);
      return JSON.stringify([
        ...extract(this.core_config),
        ...extract(this.optional_config),
        ...extract(this.core_properties),
      ]);
    },
    checkDirty() {
      if (!this.initialSnapshot) return;
      this.handy.isDirty = this.getValuesSnapshot() !== this.initialSnapshot;
    },
    requestClose() {
      if (this.handy.isDirty) {
        this.$parent.showUnsavedConfirm = true;
        return;
      }
      this.pass_asset({ reset: true });
      this.open_Handykit({ typeId: false });
    },
    open_Handykit(params) {
      this.handy.open_Handykit(params);
    },
    pass_Asset(asset) {
      this.handy.pass_Asset(asset);
    },
    tConfig(prop) {
      return this.$t("config." + prop);
    },
    tOption(value) {
      // Custom $t returns the key itself when a translation is missing.
      // For numeric-valued props (dye, variant) there is no `config_option.N`
      // key, so return "" in that case and let the caller fall back to the
      // option's own `label` from the config.
      const key = "config_option." + value;
      const translated = this.$t(key);
      return translated === key ? "" : translated;
    },
    tProp(prop) {
      return this.$t("prop." + prop);
    },
    async load_configs() {
      try {
        const client = process.env.VUE_APP_CLIENT || "__client";

        // const coreConfig = await import(`@/../${client}/configs/__core_config`);

        const [
          hiddenConfig,
          coreConfig,
          optionalConfig,
          coreProps,
          propsOptions,
          propsHandlers,
        ] = await Promise.all([
          import(`@/../${client}/configs/__hidden_config`),
          import(`@/../${client}/configs/__core_config`),
          import(`@/../${client}/configs/__optional_config`),
          import(`@/../${client}/props/__props`),
          import(`@/../${client}/props/__props_options`),
          import(`@/../${client}/props/__props_handlers`),
        ]);

        // Assign the loaded modules to data properties
        this.hidden_config = hiddenConfig.default || hiddenConfig;
        this.core_config = coreConfig.default || coreConfig;
        this.optional_config = optionalConfig.default || optionalConfig;
        this.core_properties = coreProps.default || coreProps;
        this.props_options = propsOptions.default || propsOptions;
        this.props_handlers = propsHandlers.default || propsHandlers;

        this.set_configs({});
      } catch (error) {
        console.error("Failed to load configs:", error);
        this.notify.spawnNotification({
          title: this.$t("notifications.error"),
          msg: this.$t("notifications.config_load_error"),
          type: "negative",
        });
      }
    },
    reset({ setter = null, _in = "core_config" }) {
      let _cores = [...this[_in]];

      const _index = !setter
        ? 0
        : _cores.map(({ prop = null }) => prop).indexOf(setter) + 1;

      _cores = _cores.map(({ __value, ...config }, index) => {
        return {
          ...config,
          __value: index < _index ? __value : null,
        };
      });

      this[_in] = _cores;
    },
    set_config(config_type = "core_config", { key = null, value = null }) {
      const _config = [...this[config_type]].map(
        ({ prop, __value, ...rest }) => {
          let _c = {
            prop,
            __value,
            ...rest,
          };

          if (key === prop) {
            _c.__value = value;
          }
          return _c;
        }
      );

      this[config_type] = _config;
    },
    option_visibility(options) {
      return isAllOptionsDisabled(options);
    },
    cores_dependency_check(
      check_type = "options",
      { label = null, value = null, variants = null }
    ) {
      const settedValues = buildSettedConfigsValues({
        hidden_config: this.hidden_config,
        core_config: this.core_config,
        optional_config: this.optional_config,
      });

      return checkCoresDependency(settedValues, check_type, {
        label,
        value,
        variants,
      });
    },
    props_dependency_check(check_type = "props", __dependencys = null) {
      const settedValues = buildSettedConfigsValues({
        hidden_config: this.hidden_config,
        core_config: this.core_config,
        optional_config: this.optional_config,
      });

      return checkPropsDependency(settedValues, check_type, __dependencys);
    },
    pass_asset({ reset = false }) {
      const full_config = [
        ...this["core_config"],
        ...this["core_properties"],
        ...this["optional_config"],
      ];

      const _config = full_config.reduce((o, { prop = null, __value }) => {
        if (
          !__value ||
          (typeof __value === "string" && !__value.length) ||
          (Array.isArray(__value) && !__value.length)
        )
          return o;

        o[prop] = __value;
        return o;
      }, {});

      this.handy.isDirty = false;
      this.pass_Asset({
        ..._config,
        reset,
      });
      if (!reset)
        this.notify.spawnNotification({
          title: this.$t("notifications.success"),
          msg: this.$t("notifications.success_fun"),
          type: "informative",
        });
      this.open_Handykit({});
    },
    async set_configs({ type = "init" }) {
      const _defaults = this.defaults;
      const _options = this.options;
      const { config_type = null, prevent_configuration = null } = _options || {};

      this.processing_config_type = config_type;
      this.prevent_configuration = prevent_configuration;

      if (!_defaults) return;
      const _configs = [
        "hidden_config",
        "core_config",
        "optional_config",
        "core_properties",
      ];

      _configs.forEach((c_name) => {
        const _config = [...this[c_name]];
        this[c_name] = _config.map(
          ({ prop = null, __value = null, ...rest }) => {
            return {
              prop,
              ...rest,
              __value: _defaults && _defaults[prop] ? _defaults[prop] : __value,
            };
          }
        );
      });
    },
  },
  async created() {
    await this.load_configs();
    this.$nextTick(() => this.takeSnapshot());
  },
};
</script>
