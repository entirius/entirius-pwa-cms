<template>
  <div class="attribute-editor">
    <div
      v-if="!featureSetIdx"
      class="attribute-editor__empty t-basic-500 fs-300"
    >
      {{ $t("pim.no_feature_set_attributes") }}
    </div>

    <Loader v-else-if="loading" />

    <template v-else>
      <!-- Ungrouped features -->
      <div
        v-for="row in groupedRows.ungrouped"
        :key="row.feature_idx"
        class="attribute-row"
      >
        <div class="attribute-row__label">
          <router-link
            :to="'/pim/features/' + row.feature_idx"
            class="fw-600 t-basic-800 attribute-row__link"
          >
            {{ row.feature_name || row.feature_idx }}
          </router-link>
          <span
            v-if="row.is_required"
            class="required-mark t-negative-300"
            :title="$t('pim.required_field')"
            >*</span
          >
        </div>
        <div class="attribute-row__input">
          <template v-if="row.feature_type === 1">
            <Switcher
              :label="row.value_bool ? $t('pim.yes') : $t('pim.no')"
              :selected="row.value_bool || false"
              @onSelect="
                updateField(
                  row.feature_idx,
                  'value_bool',
                  !(row.value_bool || false)
                )
              "
            />
          </template>
          <template v-else-if="row.feature_type === 2">
            <BasicInput
              :model-value="row.value_decimal"
              type="number"
              @update:model-value="
                (val) => updateField(row.feature_idx, 'value_decimal', val)
              "
            />
          </template>
          <template v-else-if="row.feature_type === 3">
            <BasicInput
              :model-value="row.value_txt"
              @update:model-value="
                (val) => updateField(row.feature_idx, 'value_txt', val)
              "
            />
          </template>
          <template v-else-if="row.feature_type === 4">
            <div class="translation-field">
              <div class="translation-field__header">
                <span class="lang-tag fs-200 t-basic-500">{{ defaultLang }}</span>
                <BasicButton
                  v-if="hasSecondaryLanguages"
                  :text="$t('pim.translations')"
                  class="btn-outline translation-field__btn"
                  @click="openTranslationsDrawer(row.feature_idx)"
                />
              </div>
              <BasicInput
                :model-value="(row.value_txt_t9n || {})[defaultLang]"
                @update:model-value="
                  (val) =>
                    updateT9nField(
                      row.feature_idx,
                      'value_txt_t9n',
                      defaultLang,
                      val
                    )
                "
              />
            </div>
          </template>
          <template v-else-if="row.feature_type === 5">
            <BasicWysiwyg
              variant="lite"
              :model-value="row.value_txt"
              @update:model-value="
                (val) => updateField(row.feature_idx, 'value_txt', val)
              "
            />
          </template>
          <template v-else-if="row.feature_type === 6">
            <div class="translation-field">
              <div class="translation-field__header">
                <span class="lang-tag fs-200 t-basic-500">{{ defaultLang }}</span>
                <BasicButton
                  v-if="hasSecondaryLanguages"
                  :text="$t('pim.translations')"
                  class="btn-outline translation-field__btn"
                  @click="openTranslationsDrawer(row.feature_idx)"
                />
              </div>
              <BasicWysiwyg
                variant="lite"
                :model-value="(row.value_txt_t9n || {})[defaultLang]"
                @update:model-value="
                  (val) =>
                    updateT9nField(
                      row.feature_idx,
                      'value_txt_t9n',
                      defaultLang,
                      val
                    )
                "
              />
            </div>
          </template>
          <template v-else-if="row.feature_type === 7">
            <SearchableSelect
              :options="getOptions(row.feature_idx).options"
              :selected="row.attribute_idx"
              :feature-idx="row.feature_idx"
              :channel-idx="channelIdx"
              :option-count="getOptions(row.feature_idx).count"
              :placeholder="$t('pim.add_attribute_value')"
              @update:selected="
                (val) => updateField(row.feature_idx, 'attribute_idx', val)
              "
            />
          </template>
          <template v-else-if="row.feature_type === 8">
            <MultiselectPicker
              :options="getOptions(row.feature_idx).options"
              :selected="row.attribute_idxs || []"
              :feature-idx="row.feature_idx"
              :channel-idx="channelIdx"
              :option-count="getOptions(row.feature_idx).count"
              @update:selected="
                (idxs) => onMultiselectUpdate(row.feature_idx, idxs)
              "
            />
          </template>
          <template v-else-if="row.feature_type === 9">
            <TextAreaBasic
              :model-value="jsonToString(row.value_json)"
              :placeholder="'{}'"
              @update:model-value="
                (val) => updateJsonField(row.feature_idx, val)
              "
            />
          </template>
          <template v-else-if="row.feature_type === 10">
            <BasicDatePicker
              :model-value="row.value_datetime"
              @update:model-value="
                (val) => updateField(row.feature_idx, 'value_datetime', val)
              "
            />
          </template>
          <template v-else-if="row.feature_type === 11">
            <div class="translation-field">
              <div class="translation-field__header">
                <span class="lang-tag fs-200 t-basic-500">{{ defaultLang }}</span>
                <BasicButton
                  v-if="hasSecondaryLanguages"
                  :text="$t('pim.translations')"
                  class="btn-outline translation-field__btn"
                  @click="openTranslationsDrawer(row.feature_idx)"
                />
              </div>
              <TextAreaBasic
                :model-value="jsonToString((row.value_json || {})[defaultLang])"
                :placeholder="'{}'"
                @update:model-value="
                  (val) => updateJsonT9nField(row.feature_idx, defaultLang, val)
                "
              />
            </div>
          </template>
          <template v-else-if="row.feature_type === 12">
            <div class="input-with-unit">
              <BasicInput
                :model-value="row.value_decimal"
                type="number"
                @update:model-value="
                  (val) => updateField(row.feature_idx, 'value_decimal', val)
                "
              />
              <span class="unit-suffix t-basic-500">°C</span>
            </div>
          </template>
          <template v-else-if="row.feature_type === 13">
            <div class="input-with-unit">
              <BasicInput
                :model-value="row.value_decimal"
                type="number"
                @update:model-value="
                  (val) => updateField(row.feature_idx, 'value_decimal', val)
                "
              />
              <span class="unit-suffix t-basic-500">cm</span>
            </div>
          </template>
          <template v-else-if="row.feature_type === 14">
            <div class="input-with-unit">
              <BasicInput
                :model-value="row.value_decimal"
                type="number"
                @update:model-value="
                  (val) => updateField(row.feature_idx, 'value_decimal', val)
                "
              />
              <span class="unit-suffix t-basic-500">kg</span>
            </div>
          </template>
        </div>
      </div>

      <!-- Grouped features -->
      <div
        v-for="group in groupedRows.groups"
        :key="group.idx"
        class="attribute-group"
      >
        <div
          class="attribute-group__header"
          @click="toggleGroupCollapse(group.idx)"
        >
          <span
            class="collapse-chevron"
            :class="{ 'is-collapsed': collapsedGroups.has(group.idx) }"
            >&#x25BC;</span
          >
          <span class="attribute-group__name">{{ group.name }}</span>
          <span
            class="chip chip--pill bg-basic-200 t-basic-600 fs-200"
          >
            {{ group.rows.length }}
          </span>
        </div>

        <div
          v-show="!collapsedGroups.has(group.idx)"
          class="attribute-group__body"
        >
          <div
            v-for="row in group.rows"
            :key="row.feature_idx"
            class="attribute-row"
          >
            <div class="attribute-row__label">
              <router-link
                :to="'/pim/features/' + row.feature_idx"
                class="fw-600 t-basic-800 attribute-row__link"
              >
                {{ row.feature_name || row.feature_idx }}
              </router-link>
              <span
                v-if="row.is_required"
                class="required-mark t-negative-300"
                :title="$t('pim.required_field')"
                >*</span
              >
            </div>
            <div class="attribute-row__input">
              <template v-if="row.feature_type === 1">
                <Switcher
                  :label="row.value_bool ? $t('pim.yes') : $t('pim.no')"
                  :selected="row.value_bool || false"
                  @onSelect="
                    updateField(
                      row.feature_idx,
                      'value_bool',
                      !(row.value_bool || false)
                    )
                  "
                />
              </template>
              <template v-else-if="row.feature_type === 2">
                <BasicInput
                  :model-value="row.value_decimal"
                  type="number"
                  @update:model-value="
                    (val) => updateField(row.feature_idx, 'value_decimal', val)
                  "
                />
              </template>
              <template v-else-if="row.feature_type === 3">
                <BasicInput
                  :model-value="row.value_txt"
                  @update:model-value="
                    (val) => updateField(row.feature_idx, 'value_txt', val)
                  "
                />
              </template>
              <template v-else-if="row.feature_type === 4">
                <div class="translation-field">
                  <div class="translation-field__header">
                    <span class="lang-tag fs-200 t-basic-500">{{ defaultLang }}</span>
                    <BasicButton
                      v-if="hasSecondaryLanguages"
                      :text="$t('pim.translations')"
                      class="btn-outline translation-field__btn"
                      @click="openTranslationsDrawer(row.feature_idx)"
                    />
                  </div>
                  <BasicInput
                    :model-value="(row.value_txt_t9n || {})[defaultLang]"
                    @update:model-value="
                      (val) =>
                        updateT9nField(
                          row.feature_idx,
                          'value_txt_t9n',
                          defaultLang,
                          val
                        )
                    "
                  />
                </div>
              </template>
              <template v-else-if="row.feature_type === 5">
                <BasicWysiwyg
                  variant="lite"
                  :model-value="row.value_txt"
                  @update:model-value="
                    (val) => updateField(row.feature_idx, 'value_txt', val)
                  "
                />
              </template>
              <template v-else-if="row.feature_type === 6">
                <div class="translation-field">
                  <div class="translation-field__header">
                    <span class="lang-tag fs-200 t-basic-500">{{ defaultLang }}</span>
                    <BasicButton
                      v-if="hasSecondaryLanguages"
                      :text="$t('pim.translations')"
                      class="btn-outline translation-field__btn"
                      @click="openTranslationsDrawer(row.feature_idx)"
                    />
                  </div>
                  <BasicWysiwyg
                    variant="lite"
                    :model-value="(row.value_txt_t9n || {})[defaultLang]"
                    @update:model-value="
                      (val) =>
                        updateT9nField(
                          row.feature_idx,
                          'value_txt_t9n',
                          defaultLang,
                          val
                        )
                    "
                  />
                </div>
              </template>
              <template v-else-if="row.feature_type === 7">
                <SearchableSelect
                  :options="getOptions(row.feature_idx).options"
                  :selected="row.attribute_idx"
                  :feature-idx="row.feature_idx"
                  :channel-idx="channelIdx"
                  :option-count="getOptions(row.feature_idx).count"
                  :placeholder="$t('pim.add_attribute_value')"
                  @update:selected="
                    (val) => updateField(row.feature_idx, 'attribute_idx', val)
                  "
                />
              </template>
              <template v-else-if="row.feature_type === 8">
                <MultiselectPicker
                  :options="getOptions(row.feature_idx).options"
                  :selected="row.attribute_idxs || []"
                  :feature-idx="row.feature_idx"
                  :channel-idx="channelIdx"
                  :option-count="getOptions(row.feature_idx).count"
                  @update:selected="
                    (idxs) => onMultiselectUpdate(row.feature_idx, idxs)
                  "
                />
              </template>
              <template v-else-if="row.feature_type === 9">
                <TextAreaBasic
                  :model-value="jsonToString(row.value_json)"
                  :placeholder="'{}'"
                  @update:model-value="
                    (val) => updateJsonField(row.feature_idx, val)
                  "
                />
              </template>
              <template v-else-if="row.feature_type === 10">
                <BasicDatePicker
                  :model-value="row.value_datetime"
                  @update:model-value="
                    (val) => updateField(row.feature_idx, 'value_datetime', val)
                  "
                />
              </template>
              <template v-else-if="row.feature_type === 11">
                <div class="translation-field">
                  <div class="translation-field__header">
                    <span class="lang-tag fs-200 t-basic-500">{{ defaultLang }}</span>
                    <BasicButton
                      v-if="hasSecondaryLanguages"
                      :text="$t('pim.translations')"
                      class="btn-outline translation-field__btn"
                      @click="openTranslationsDrawer(row.feature_idx)"
                    />
                  </div>
                  <TextAreaBasic
                    :model-value="jsonToString((row.value_json || {})[defaultLang])"
                    :placeholder="'{}'"
                    @update:model-value="
                      (val) => updateJsonT9nField(row.feature_idx, defaultLang, val)
                    "
                  />
                </div>
              </template>
              <template v-else-if="row.feature_type === 12">
                <div class="input-with-unit">
                  <BasicInput
                    :model-value="row.value_decimal"
                    type="number"
                    @update:model-value="
                      (val) =>
                        updateField(row.feature_idx, 'value_decimal', val)
                    "
                  />
                  <span class="unit-suffix t-basic-500">°C</span>
                </div>
              </template>
              <template v-else-if="row.feature_type === 13">
                <div class="input-with-unit">
                  <BasicInput
                    :model-value="row.value_decimal"
                    type="number"
                    @update:model-value="
                      (val) =>
                        updateField(row.feature_idx, 'value_decimal', val)
                    "
                  />
                  <span class="unit-suffix t-basic-500">cm</span>
                </div>
              </template>
              <template v-else-if="row.feature_type === 14">
                <div class="input-with-unit">
                  <BasicInput
                    :model-value="row.value_decimal"
                    type="number"
                    @update:model-value="
                      (val) =>
                        updateField(row.feature_idx, 'value_decimal', val)
                    "
                  />
                  <span class="unit-suffix t-basic-500">kg</span>
                </div>
              </template>
            </div>
          </div>
        </div>
      </div>
    </template>

    <!-- Translations drawer -->
    <TranslationsDrawer
      :visible="!!translatingRow"
      :title="translatingRowLabel"
      :languages="effectiveLanguages"
      :default-language="defaultLang"
      :values="translatingRowValues"
      @cancel="translatingRow = null"
      @save="onTranslationsSave"
    >
      <template #input="{ lang, modelValue, onUpdate }">
        <BasicWysiwyg
          v-if="translatingRowData?.feature_type === 6"
          variant="lite"
          :model-value="modelValue"
          @update:model-value="onUpdate"
        />
        <TextAreaBasic
          v-else-if="translatingRowData?.feature_type === 11"
          :model-value="jsonToString(modelValue)"
          :placeholder="'{}'"
          @update:model-value="onUpdate"
        />
        <BasicInput
          v-else
          :model-value="modelValue"
          @update:model-value="onUpdate"
        />
      </template>
    </TranslationsDrawer>
  </div>
</template>

<script setup>
import { ref, reactive, computed, watch, onMounted } from "vue";
import { GET_FeatureSetFeatures, GET_FeatureAttributes } from "@/api/pim/api";
import { isSelectType } from "../helpers/pimEnums";
import SearchableSelect from "./SearchableSelect.vue";
import MultiselectPicker from "./MultiselectPicker.vue";

const props = defineProps({
  attributes: { type: Array, default: () => [] },
  featureSetIdx: { type: String, default: null },
  channelIdx: { type: String, required: true },
  languages: { type: Array, default: () => [] },
});

const emit = defineEmits(["update:attributes"]);

const effectiveLanguages = computed(() =>
  props.languages.length > 0 ? props.languages : ["en"]
);

const loading = ref(false);
const editableRows = ref([]);
const optionsCache = ref({});
const collapsedGroups = reactive(new Set());
const translatingRow = ref(null);

function openTranslationsDrawer(featureIdx) {
  translatingRow.value = featureIdx;
}

function onTranslationsSave({ values }) {
  if (!translatingRowData.value) return;
  const field =
    translatingRowData.value.feature_type === 11 ? "value_json" : "value_txt_t9n";
  // For JSON fields, parse string values back to objects
  if (field === "value_json") {
    const parsed = {};
    for (const [lang, val] of Object.entries(values)) {
      try {
        parsed[lang] = typeof val === "string" ? JSON.parse(val) : val;
      } catch {
        parsed[lang] = val;
      }
    }
    translatingRowData.value[field] = parsed;
  } else {
    translatingRowData.value[field] = values;
  }
  emitAttributes();
  translatingRow.value = null;
}

const defaultLang = computed(() =>
  (effectiveLanguages.value[0] || "en").toLowerCase()
);

const hasSecondaryLanguages = computed(() => effectiveLanguages.value.length > 1);

const translatingRowLabel = computed(() => {
  if (!translatingRow.value) return "";
  const row = editableRows.value.find(
    (r) => r.feature_idx === translatingRow.value
  );
  return row ? row.feature_name || row.feature_idx : translatingRow.value;
});

const translatingRowData = computed(() => {
  if (!translatingRow.value) return null;
  return editableRows.value.find(
    (r) => r.feature_idx === translatingRow.value
  );
});

const translatingRowValues = computed(() => {
  if (!translatingRowData.value) return {};
  const field =
    translatingRowData.value.feature_type === 11 ? "value_json" : "value_txt_t9n";
  return translatingRowData.value[field] || {};
});

// --- Grouping ---

const groupedRows = computed(() => {
  const groups = {};
  const ungrouped = [];
  for (const row of editableRows.value) {
    const gIdx = row.attributes_group_idx;
    if (!gIdx) {
      ungrouped.push(row);
      continue;
    }
    if (!groups[gIdx]) {
      groups[gIdx] = {
        idx: gIdx,
        name: row.attributes_group_name || gIdx,
        rows: [],
      };
    }
    groups[gIdx].rows.push(row);
  }
  return { ungrouped, groups: Object.values(groups) };
});

function toggleGroupCollapse(groupIdx) {
  if (collapsedGroups.has(groupIdx)) {
    collapsedGroups.delete(groupIdx);
  } else {
    collapsedGroups.add(groupIdx);
  }
}

// --- Data fetching ---

function buildEmptyAttribute(featureIdx) {
  return {
    feature_idx: featureIdx,
    value_bool: null,
    value_decimal: null,
    value_txt: null,
    value_txt_t9n: null,
    value_datetime: null,
    value_json: null,
    attribute_idx: null,
    attribute_idxs: [],
  };
}

function mergeWithExisting(features) {
  return features.map((f) => {
    const matchingAttrs = props.attributes.filter(
      (a) => a.feature_idx === f.feature_idx
    );
    const firstMatch = matchingAttrs[0] || null;
    const base = buildEmptyAttribute(f.feature_idx);
    const aggregatedIdxs = matchingAttrs
      .map((a) => a.attribute_idx)
      .filter(Boolean);
    return {
      ...base,
      ...(firstMatch || {}),
      attribute_idxs: aggregatedIdxs.length ? aggregatedIdxs : [],
      feature_idx: f.feature_idx,
      feature_name: f.feature_name,
      feature_type: f.feature_type,
      is_required: f.is_required,
      attributes_group_idx: f.attributes_group_idx,
      attributes_group_name: f.attributes_group_name,
    };
  });
}

async function fetchFeatureSet() {
  if (!props.featureSetIdx) return;
  loading.value = true;
  try {
    const { data } = await GET_FeatureSetFeatures(
      props.channelIdx,
      props.featureSetIdx
    );
    const results = data.results || data || [];
    const normalized = results.map((f) => ({
      feature_idx: f.feature?.idx || f.feature_idx,
      feature_name: f.feature?.name || f.feature_name,
      feature_type: f.feature?.feature_type ?? f.feature_type,
      is_required: f.feature?.is_required ?? f.is_required ?? false,
      attributes_group_idx: f.attributes_group_idx || null,
      attributes_group_name: f.attributes_group_name || null,
      position: f.position || 0,
    }));
    editableRows.value = mergeWithExisting(normalized);
    await prefetchSelectOptions(normalized);
  } finally {
    loading.value = false;
  }
}

async function prefetchSelectOptions(features) {
  const selectFeatures = features.filter((f) => isSelectType(f.feature_type));
  await Promise.all(
    selectFeatures.map((f) => fetchAttributeOptions(f.feature_idx))
  );
}

async function fetchAttributeOptions(featureIdx) {
  if (optionsCache.value[featureIdx]) return;
  try {
    const { data } = await GET_FeatureAttributes(featureIdx, props.channelIdx, {
      page_size: 100,
    });
    const results = data.results || data || [];
    const count = data.count ?? results.length;
    optionsCache.value[featureIdx] = {
      options: results.map((a) => ({ label: a.name || a.idx, value: a.idx })),
      count,
    };
  } catch {
    optionsCache.value[featureIdx] = { options: [], count: 0 };
  }
}

function getOptions(featureIdx) {
  return optionsCache.value[featureIdx] || { options: [], count: 0 };
}

// --- Field updates ---

function updateField(featureIdx, field, value) {
  const row = editableRows.value.find((r) => r.feature_idx === featureIdx);
  if (!row) return;
  row[field] = value;
  emitAttributes();
}

function updateT9nField(featureIdx, field, lang, value) {
  const row = editableRows.value.find((r) => r.feature_idx === featureIdx);
  if (!row) return;
  if (!row[field]) row[field] = {};
  row[field] = { ...row[field], [lang]: value };
  emitAttributes();
}

function updateJsonField(featureIdx, rawString) {
  const row = editableRows.value.find((r) => r.feature_idx === featureIdx);
  if (!row) return;
  try {
    row.value_json = JSON.parse(rawString);
  } catch {
    row.value_json = rawString;
  }
  emitAttributes();
}

function updateJsonT9nField(featureIdx, lang, rawString) {
  const row = editableRows.value.find((r) => r.feature_idx === featureIdx);
  if (!row) return;
  if (!row.value_json || typeof row.value_json !== "object")
    row.value_json = {};
  try {
    row.value_json = { ...row.value_json, [lang]: JSON.parse(rawString) };
  } catch {
    row.value_json = { ...row.value_json, [lang]: rawString };
  }
  emitAttributes();
}

function onMultiselectUpdate(featureIdx, idxs) {
  const row = editableRows.value.find((r) => r.feature_idx === featureIdx);
  if (!row) return;
  row.attribute_idxs = idxs;
  emitAttributes();
}

function jsonToString(value) {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  return JSON.stringify(value, null, 2);
}

function emitAttributes() {
  const payload = editableRows.value.map((r) => ({
    feature_idx: r.feature_idx,
    value_bool: r.value_bool ?? null,
    value_decimal: r.value_decimal ?? null,
    value_txt: r.value_txt ?? null,
    value_txt_t9n: r.value_txt_t9n ?? null,
    value_datetime: r.value_datetime ?? null,
    value_json: r.value_json ?? null,
    attribute_idx: r.attribute_idx ?? null,
    attribute_idxs: r.attribute_idxs || [],
  }));
  emit("update:attributes", payload);
}

// --- Watchers ---

watch(
  () => props.featureSetIdx,
  (val) => {
    if (val) fetchFeatureSet();
    else editableRows.value = [];
  }
);

watch(
  () => props.attributes,
  () => {
    if (editableRows.value.length) {
      editableRows.value = mergeWithExisting(editableRows.value);
    }
  },
  { deep: true }
);

onMounted(() => {
  if (props.featureSetIdx) fetchFeatureSet();
});
</script>

<style lang="scss" scoped>
.attribute-editor {
  display: flex;
  flex-direction: column;

  &__empty {
    padding: var(--space-400);
    text-align: center;
  }
}

.attribute-group {
  border: 1px solid var(--c-basic-200);
  border-radius: var(--radius-md);
  margin-bottom: var(--space-300);

  &__header {
    display: flex;
    align-items: center;
    gap: var(--space-200);
    padding: 10px 16px;
    background: var(--c-basic-200);
    cursor: pointer;
    border-left: 3px solid var(--c-support-400);
    user-select: none;
  }

  &__name {
    font-weight: 600;
    text-transform: uppercase;
    font-size: var(--fs-200);
    color: var(--c-support-400);
  }

  &__body {
    padding: 0 16px;
  }
}

.collapse-chevron {
  cursor: pointer;
  transition: transform 0.2s;
  font-size: 10px;
  color: var(--c-basic-500);

  &.is-collapsed {
    transform: rotate(-90deg);
  }
}

.attribute-row {
  display: grid;
  grid-template-columns: 240px 1fr;
  gap: var(--space-300);
  align-items: start;
  padding: 14px 0;
  border-bottom: 1px solid var(--c-basic-200);

  &:last-child {
    border-bottom: none;
  }

  &__label {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: var(--space-100);
    padding-top: 6px;
  }

  &__link {
    text-decoration: none;
    &:hover {
      text-decoration: underline;
      color: var(--c-support-400);
    }
  }

  &__input {
    min-width: 0;
  }
}

.required-mark {
  font-size: var(--fs-400);
  font-weight: 700;
  line-height: 1;
}

.lang-tag {
  display: inline-block;
  padding: 2px 6px;
  border-radius: 3px;
  background: var(--c-basic-200);
  color: var(--c-basic-500);
  font-weight: 600;
  text-transform: uppercase;
  min-width: 28px;
  text-align: center;
  flex-shrink: 0;
}

.translation-field {
  &__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 6px;
  }

  &__btn {
    line-height: 1;
    padding: 4px 10px;
    font-size: var(--fs-200);
  }
}

.input-with-unit {
  display: flex;
  align-items: center;
  gap: var(--space-200);

  .unit-suffix {
    font-size: var(--fs-300);
    white-space: nowrap;
    flex-shrink: 0;
  }
}
</style>

