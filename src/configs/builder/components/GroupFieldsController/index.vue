<template>
  <div>
    <div class="">
      <div class="flex jc-sb ai-ct mb-100">
        <p v-if="label">{{ label }}</p>
        <ToolTip
          class="right t-support-300 fs-200"
          :tip="
            Object.keys(groups).length
              ? $t('controllers.tooltip_select_group')
              : $t('controllers.tooltip_add_group')
          "
        >
        </ToolTip>
      </div>
      <div class="flex gap-100">
        <BasicButton
          :text="!mode ? $t('routes.set_new') : $t('common.close')"
          class="b-basic-400 bg-basic-100 bg-basic-300-hover br-50 t-support-400 fs-200"
          :class="{
            'bg-basic-300 t-basic-700 bg-support-400-hover t-basic-100-hover b-support-400-hover':
              mode,
          }"
          @click="!mode ? (mode = 'add') : (mode = null)"
        />

        <Dropdown
          :custom_droplist="true"
          :placeholder="`${$t('controllers.setted')} (${
            !value ? [].length : value.length
          }${
            group_rules && group_rules.max
              ? `/${group_rules.max}`
              : `/${$t('controllers.unlimited')}`
          })`"
          class="br-50 fs-200 fg-1"
          :class="[
            !Boolean(value)
              ? 'bg-basic-200 t-basic-400 b-basic-300'
              : 'bg-basic-100 b-basic-400 t-basic-600 ',
          ]"
          :values="
            !value
              ? []
              : value.map((value, index) => {
                  const [_first_key, _first_value] = Object.entries(value)[0];

                  return {
                    label: `${$t('controllers.position')}: ${
                      index + 1
                    } (${_first_key} : ${_first_value})`,

                    value: index,
                    label_ext: $t('common.delete'),
                    label_ext_class: 't-negative-200',
                  };
                })
          "
          :isDisabled="!Boolean(value)"
          @onSelect="
            ($event) => {
              on_edit($event);
              force_refresh += force_refresh;
            }
          "
          @onExtension="
            ($event) => {
              editing = $event;
              on_delete($event);
            }
          "
        >
          <template v-slot:custom>
            <div v-if="value && value.length">
              <draggable
                v-model="value_cp"
                ghost-class="bg-support-400"
                handle=".dropdown-leaf-group-fields-controller"
                :item-key="(_, idx) => `custom-dropdown-leaf-${idx}`"
              >
                <template #item="{ element, index: idx }">
                  <div
                    class="ph-100 flex jc-sb"
                    @click="
                      () => {
                        on_edit(idx);
                        force_refresh += force_refresh;
                      }
                    "
                  >
                    <p>{{ $t("controllers.position") }}: {{ idx + 1 }}</p>
                    <div class="grid grid-col-2 gap-50">
                      <p
                        class="t-negative-200"
                        @click.stop="
                          () => {
                            editing = idx;
                            on_delete(idx);
                          }
                        "
                      >
                        {{ $t("common.delete") }}
                      </p>
                      <p
                        class="t-basic-500 dropdown-leaf-group-fields-controller"
                      >
                        {{ $t("controllers.drag") }}
                      </p>
                    </div>
                  </div>
                </template>
              </draggable>
            </div>
          </template>
        </Dropdown>
      </div>
    </div>
    <div v-if="group && Object.keys(group).length && mode" class="mt-200">
      <div
        class="grid gap-100 ai-fe"
        :class="{
          'grid-col-1': Object.keys(group).length === 1,
          'grid-col-2': Object.keys(group).length === 2,
          'grid-col-3': Object.keys(group).length >= 3,
        }"
      >
        <div
          v-for="(field, key, index) in config['fields']"
          :class="{
            'gc-s-1 gc-e-4': ['BasicWysiwyg'].includes(
              props_handlers[field.type]
            ),
          }"
        >
          <BasicInput
            v-if="props_handlers[field.type] === 'BasicInput'"
            v-model="group[key]"
            :label="tFieldLabel(key, field.label)"
            class="br-50 bg-basic-100 mt-300 lh-base-elem"
            :key="`${force_refresh}-${index}`"
          />
          <div
            v-if="props_handlers[field.type] === 'BasicWysiwyg'"
            class="gc-1 gc-4"
          >
            <p class="mb-50">{{ tFieldLabel(key, field.label) }}</p>
            <BasicWysiwyg v-model="group[key]" :key="`wysiwyg-${key}`" />
          </div>
          <div v-if="props_handlers[field.type] === 'Dropdown'">
            <p class="mb-50">{{ tFieldLabel(key, field.label) }}</p>
            <Dropdown
              :selected="[group[key]]"
              class="br-50 b-basic-400 bg-basic-100"
              :values="field.options"
              @onSelect="
                ($event) => {
                  group[key] = $event;
                  force_refresh += force_refresh;
                }
              "
              :key="`${force_refresh}-${index}`"
            />
          </div>
          <div v-if="props_handlers[field.type] === 'Switcher'">
            <p class="mb-50">{{ tFieldLabel(key, field.label) }}</p>
            <Switcher
              class="mv-100"
              :selected="group[key]"
              @onSelect="
                () => {
                  group[key] = !group[key];
                  force_refresh += force_refresh;
                }
              "
              :key="`${force_refresh}-${index}`"
            />
          </div>
        </div>
      </div>
      <BasicButton
        class="bg-basic-300 bg-basic-400-hover br-50 t-basic-600 mt-200 b-basic-400"
        :text="mode === 'add' ? $t('controllers.add_group') : $t('common.save')"
        @click="set_group({ ...group })"
      />
    </div>
  </div>
</template>

<script>
import props_handlers from "@/../__client/props/__props_handlers";
import { useNotifyStore } from "@/stores/notify";
import draggable from "vuedraggable";
export default {
  setup() {
    const notify = useNotifyStore();
    return { notify };
  },
  props: {
    config: {
      type: [Object],
      required: true,
    },
    configName: {
      type: String,
      default: null,
    },
    value: {
      type: [Array, Object],
      default: () => [],
    },
    label: {
      type: [String],
      required: false,
    },
  },
  data() {
    return {
      props_handlers,
      mode: null,
      editing: null,
      group: null,
      group_rules: null,
      groups: {},
      force_refresh: 1,
    };
  },
  methods: {
    tFieldLabel(key, fallback) {
      if (!this.configName) return fallback;
      const i18nKey = `prop_option.${this.configName}.${key}`;
      const translated = this.$t(i18nKey);
      return translated !== i18nKey ? translated : fallback;
    },
    on_clear() {
      const _config = { ...this.config };
      const { fields = {}, group_rules = null } = _config;
      const entries = Object.entries(fields);
      entries.forEach(([key, config]) => {
        if (!this.group) this.group = {};
        this.group[key] = null;
      });
      this.group_rules = group_rules;
      this.editing = null;
      this.force_refresh += this.force_refresh;
      this.mode = null;
    },
    set_group(group) {
      const _value = this.value ?? [];
      let allow = true;
      if (this.mode === "add" && this.group_rules) {
        const { max = null } = this.group_rules;

        if (max && _value.length === max) {
          this.notify.spawnNotification({
            title: this.$t("controllers.max_group_size"),
            type: "negative",
          });
          return;
        }
      }
      this.mode === "add" ? _value.push(group) : (_value[this.editing] = group);

      this.$emit("onChange", _value);
      this.on_clear();
    },
    on_edit(index) {
      this.editing = index;
      const _group = this.value[index];
      if (!_group) {
        this.notify.spawnNotification({
          title: this.$t("notifications.error"),
          msg: this.$t("notifications.unexpected_error"),
          type: "negative",
        });
        return;
      }
      this.group = _group;
      this.mode = "edit";
      return;
    },

    on_delete(index) {
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
      this.$emit("onChange", _value);
      this.on_clear();
    },
  },
  created() {
    this.on_clear();
  },
  computed: {
    value_cp: {
      get: function () {
        return this.value;
      },
      set: function (changed_order) {
        this.$emit("onChange", changed_order);
      },
    },
  },
  components: {
    draggable,
  },
};
</script>
