<template>
  <FormField :label="label" :required="row.is_required">
    <div class="flex ai-st gap-3">
      <div class="flex-1 min-w-0">
        <BasicSwitch
          v-if="type === 1"
          :label="row.value_bool ? $t('pim.yes') : $t('pim.no')"
          :model-value="row.value_bool || false"
          @update:model-value="(on) => $emit('update', 'value_bool', on)"
        />
        <div v-else-if="type in NUMBER_UNITS" class="flex ai-ct gap-3">
          <BasicInput
            :model-value="row.value_decimal"
            type="number"
            @update:model-value="(val) => $emit('update', 'value_decimal', val)"
          />
          <span v-if="NUMBER_UNITS[type]" class="t-muted nowrap">{{ NUMBER_UNITS[type] }}</span>
        </div>
        <BasicInput
          v-else-if="type === 3"
          :model-value="row.value_txt"
          @update:model-value="(val) => $emit('update', 'value_txt', val)"
        />
        <BasicInput
          v-else-if="type === 4"
          :model-value="(row.value_txt_t9n || {})[language]"
          @update:model-value="(val) => $emit('update-t9n', 'value_txt_t9n', val)"
        />
        <BasicWysiwyg
          v-else-if="type === 5"
          variant="lite"
          :model-value="row.value_txt"
          @update:model-value="(val) => $emit('update', 'value_txt', val)"
        />
        <BasicWysiwyg
          v-else-if="type === 6"
          variant="lite"
          :model-value="(row.value_txt_t9n || {})[language]"
          @update:model-value="(val) => $emit('update-t9n', 'value_txt_t9n', val)"
        />
        <BasicSelect
          v-else-if="type === 7"
          :options="singleOptions"
          :model-value="row.attribute_idx"
          :placeholder="$t('pim.add_attribute_value')"
          searchable
          clearable
          @focusin="$emit('open-options')"
          @update:model-value="onSinglePick"
        />
        <BasicSelect
          v-else-if="type === 8"
          :options="multiOptions"
          :model-value="row.attribute_idxs || []"
          :placeholder="$t('pim.no_values_selected')"
          multiple
          searchable
          @focusin="$emit('open-options')"
          @update:model-value="onMultiPick"
        />
        <BasicTextarea
          v-else-if="type === 9"
          :model-value="jsonToString(row.value_json)"
          :placeholder="'{}'"
          @update:model-value="(raw) => $emit('update-json', raw)"
        />
        <BasicDatePicker
          v-else-if="type === 10"
          :model-value="row.value_datetime"
          :config="DATE_PICKER_CONFIG"
          @update:model-value="(val) => $emit('update', 'value_datetime', val)"
        />
        <BasicTextarea
          v-else-if="type === 11"
          :model-value="jsonToString((row.value_json || {})[language])"
          :placeholder="'{}'"
          @update:model-value="(raw) => $emit('update-json-t9n', raw)"
        />
      </div>
      <IconButton
        v-if="translatable && T9N_TYPES.includes(type)"
        icon="translate"
        variant="outline"
        :label="`${$t('pim.translations')}: ${name}`"
        @click="$emit('translate')"
      />
      <router-link
        :to="`/pim/features/${row.feature_idx}`"
        class="attribute-field__link inline-flex ai-ct jc-ct t-muted"
        :aria-label="$t('pim.open_feature', { name })"
        :title="$t('pim.open_feature', { name })"
      >
        <FontAwesomeIcon :icon="$icons.external" aria-hidden="true" />
      </router-link>
    </div>
  </FormField>
</template>

<script setup>
// One attribute of a product (AttributeEditor): the control for the feature type in the channel's default language,
// the per-field translations action for the translatable types and a link to the feature. Every change goes up as
// an event; the editor owns the rows and the payload.
import { computed } from "vue";
import { withStoredOption } from "@/utils/options";
import { t } from "@/i18n";
import { jsonToString } from "../helpers/attributeValues";

// Number types and their unit suffix (decimal has none).
const NUMBER_UNITS = { 2: "", 12: "°C", 13: "cm", 14: "kg" };
const T9N_TYPES = [4, 6, 11];
// The last option of a select whose values have a next page: picking it loads that page, it is never a value.
const LOAD_MORE = "__load_more__";
// Datetime attributes (feature_type 10) hold one date.
const DATE_PICKER_CONFIG = { mode: "single", wrap: true, inline: true };

const props = defineProps({
  row: { type: Object, required: true },
  options: { type: Array, default: () => [] },
  language: { type: String, required: true },
  translatable: { type: Boolean, default: false },
  hasMore: { type: Boolean, default: false },
});
const emit = defineEmits(["update", "update-t9n", "update-json", "update-json-t9n", "translate", "open-options", "load-more"]);

const type = computed(() => props.row.feature_type);
const name = computed(() => props.row.feature_name || props.row.feature_idx);
const label = computed(() => (T9N_TYPES.includes(type.value) ? `${name.value} (${props.language.toUpperCase()})` : name.value));
// A stored value the loaded options lack still shows (its idx as the label).
const moreOption = computed(() => (props.hasMore ? [{ label: t("pim.attribute_values_more"), value: LOAD_MORE }] : []));
const singleOptions = computed(() => [...withStoredOption(props.options, props.row.attribute_idx), ...moreOption.value]);
const multiOptions = computed(() => [
  ...(props.row.attribute_idxs || []).reduce((options, idx) => withStoredOption(options, idx), props.options),
  ...moreOption.value,
]);

function onSinglePick(value) {
  if (value === LOAD_MORE) emit("load-more");
  else emit("update", "attribute_idx", value);
}

function onMultiPick(values) {
  if (values.includes(LOAD_MORE)) emit("load-more");
  else emit("update", "attribute_idxs", values);
}
</script>

<style lang="scss" scoped>
.attribute-field__link {
  width: var(--elem-height);
  height: var(--elem-height);
  flex-shrink: 0;
  border-radius: var(--radius-base);

  &:hover {
    color: var(--accent);
  }
}
</style>
