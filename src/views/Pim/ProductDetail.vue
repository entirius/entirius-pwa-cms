<template>
  <div class="p-500 fs-300 t-basic-800 h-100 ov-h">
    <Teleport to="#pim-toolbar-left" defer>
      <BasicButton
        text=""
        icon="arrow-left"
        class="bg-basic-200 t-basic-600"
        @click="$router.push('/pim/products')"
      />
    </Teleport>
    <Teleport to="#pim-toolbar-right" defer>
      <span v-if="isDirty" class="chip bg-warning-100 t-warning-300">
        {{ $t("unsaved.changes") }}
      </span>
      <button
        class="toolbar-action"
        :title="$t('pim.channels')"
        @click="showAddToChannelDialog = true"
      >
        <font-awesome-icon icon="globe" class="toolbar-action__icon" />
        <span class="toolbar-action__text">{{ $t("pim.channels") }}</span>
      </button>
      <template v-if="!pimChannel.isDefaultChannel">
        <button
          class="toolbar-action"
          :title="$t('pim.copy_translations')"
          @click="showCopyDialog = true"
        >
          <font-awesome-icon icon="copy" class="toolbar-action__icon" />
          <span class="toolbar-action__text">{{
            $t("pim.copy_translations")
          }}</span>
        </button>
        <div
          v-if="pimChannel.activeChannelInheritanceEnabled"
          class="inheritance-picker"
        >
          <button
            type="button"
            class="inheritance-picker__btn"
            :class="{ 'inheritance-picker__btn--active': inheritanceCount > 0 }"
            :title="$t('pim.inheritance')"
            @click="showInheritancePicker = !showInheritancePicker"
          >
            <font-awesome-icon
              icon="diagram-next"
              class="toolbar-action__icon"
            />
            <span class="toolbar-action__text">{{
              $t("pim.inheritance")
            }}</span>
            <span
              v-if="inheritanceCount > 0"
              class="inheritance-picker__count"
              >{{ inheritanceCount }}</span
            >
          </button>
          <div
            v-if="showInheritancePicker"
            class="inheritance-picker__dropdown"
          >
            <label
              class="inheritance-picker__item"
              :class="{
                'inheritance-picker__item--active': product.inherit_attributes,
              }"
              @click.prevent="toggleInheritanceFlag('inherit_attributes')"
            >
              <span class="inheritance-picker__check">{{
                product.inherit_attributes ? "✓" : ""
              }}</span>
              {{ $t("pim.inherit_attributes") }}
            </label>
            <label
              class="inheritance-picker__item"
              :class="{
                'inheritance-picker__item--active':
                  product.inherit_descriptions,
              }"
              @click.prevent="toggleInheritanceFlag('inherit_descriptions')"
            >
              <span class="inheritance-picker__check">{{
                product.inherit_descriptions ? "✓" : ""
              }}</span>
              {{ $t("pim.inherit_descriptions") }}
            </label>
            <label
              class="inheritance-picker__item"
              :class="{
                'inheritance-picker__item--active': product.inherit_images,
              }"
              @click.prevent="toggleInheritanceFlag('inherit_images')"
            >
              <span class="inheritance-picker__check">{{
                product.inherit_images ? "✓" : ""
              }}</span>
              {{ $t("pim.inherit_images") }}
            </label>
          </div>
        </div>
      </template>
      <button
        v-if="hasEnricherPanel"
        class="toolbar-action"
        :title="$t('enrichment.spawn.send_single')"
        data-testid="enrichment-spawn-button"
        @click="showSpawnDialog = true"
      >
        <font-awesome-icon icon="wand-magic-sparkles" class="toolbar-action__icon" />
        <span class="toolbar-action__text">{{ $t("enrichment.spawn.send_single") }}</span>
      </button>
      <button
        class="toolbar-action toolbar-action--save"
        :title="$t('common.save')"
        @click="saveProduct"
      >
        <font-awesome-icon icon="floppy-disk" class="toolbar-action__icon" />
        <span class="toolbar-action__text">{{ $t("common.save") }}</span>
      </button>
      <BasicButton
        text=""
        icon="trash-can"
        class="bg-negative-100 t-negative-300"
        @click="showDeleteConfirm = true"
      />
    </Teleport>
    <div class="bg-basic-100 b-basic-300 br-50 h-100 ovy-auto p-500">
      <Loader v-if="loading" />

      <!-- etap-12 #25: 404 on the chosen channel auto-switches to default and warns. -->
      <div
        v-if="channelMismatchWarning"
        class="channel-mismatch-warning bg-warning-100 t-warning-300 p-300 br-50 mb-300"
        role="alert"
      >
        <font-awesome-icon icon="triangle-exclamation" class="mr-200" />
        {{ $t("pim.channel_mismatch_warning") }}
      </div>

      <template v-else-if="!loading">
        <!-- Two-column layout -->
        <div class="product-layout">
          <!-- Left column: Media Gallery -->
          <div class="product-layout__media">
            <MediaGallery :channel-idx="channelIdx" :sku="product.sku" />
          </div>

          <!-- Right column: Info + Tabs -->
          <div class="product-layout__content">
            <!-- Product info card -->
            <div class="info-card mb-400">
              <h2 class="fs-600 fw-600 mb-200">
                {{ product.name || product.sku }}
              </h2>
              <div class="info-card__meta flex flex-wrap ai-ct gap-200 mb-300">
                <span class="meta-item"
                  >SKU: <strong>{{ product.sku }}</strong></span
                >
                <span v-if="product.product_class_name" class="meta-dot"></span>
                <span v-if="product.product_class_name" class="meta-item">
                  {{ $t("pim.product_class") }}:
                  <strong :class="productClassColor">{{
                    productClassLabel
                  }}</strong>
                </span>
                <span v-if="product.feature_set_idx" class="meta-dot"></span>
                <span v-if="product.feature_set_idx" class="meta-item">
                  {{ $t("pim.feature_set") }}:
                  <strong>{{ product.feature_set_idx }}</strong>
                </span>
                <span v-if="product.ean" class="meta-dot"></span>
                <span v-if="product.ean" class="meta-item"
                  >EAN: <strong>{{ product.ean }}</strong></span
                >
              </div>
              <div class="product-controls">
                <div class="product-controls__field">
                  <label class="product-controls__label">{{
                    $t("pim.visibility")
                  }}</label>
                  <Dropdown
                    :values="visibilityOptions"
                    :selected="[form.visibility]"
                    @onSelect="(val) => (form.visibility = val)"
                  />
                </div>
                <div class="product-controls__field">
                  <label class="product-controls__label">{{
                    $t("pim.feature_set")
                  }}</label>
                  <Dropdown
                    v-if="featureSetOptions.length"
                    :values="featureSetOptions"
                    :selected="
                      form.feature_set_idx ? [form.feature_set_idx] : []
                    "
                    :placeholder="$t('pim.select_feature_set')"
                    @onSelect="onFeatureSetSelect"
                  />
                </div>
                <Switcher
                  :label="$t('pim.enabled')"
                  :selected="form.is_enabled"
                  @onSelect="form.is_enabled = !form.is_enabled"
                />
              </div>
              <div
                v-if="
                  pimChannel.isDefaultChannel &&
                  product.inheriting_channels_count
                "
                class="info-card__inheritance mt-200"
              >
                <span class="chip bg-support-100 t-support-400">
                  {{
                    $t("pim.channels_inherit", {
                      count: product.inheriting_channels_count,
                    })
                  }}
                </span>
              </div>

              <!-- Name field -->
              <div class="translation-field mt-300">
                <div class="translation-field__header">
                  <label class="detail-label"
                    >{{ $t("pim.name") }} ({{
                      defaultLang.toUpperCase()
                    }})</label
                  >
                  <BasicButton
                    v-if="secondaryLanguages.length"
                    :text="$t('pim.translations')"
                    class="btn-outline translation-field__btn"
                    @click="openTranslations('name')"
                  />
                </div>
                <InheritanceField
                  v-if="!pimChannel.isDefaultChannel"
                  :inherited="!!product.inherit_descriptions"
                  :language="defaultLang"
                  :overridden-langs="overriddenLangsMap.name || []"
                  :inherited-value="defaultNameT9n[defaultLang] || ''"
                  @toggle-override="
                    ({ language, override }) =>
                      onToggleOverride({
                        featureIdx: 'name',
                        language,
                        override,
                      })
                  "
                >
                  <template #default="{ readonly }">
                    <BasicInput
                      v-model="form.name_t9n[defaultLang]"
                      :disabled="readonly"
                    />
                  </template>
                </InheritanceField>
                <BasicInput v-else v-model="form.name_t9n[defaultLang]" />
              </div>

              <!-- Physical properties (shared across channels) -->
              <div class="info-card__physical mt-300">
                <p class="fs-200 t-warning-300 mb-200">
                  {{ $t("pim.shared_warning") }}
                </p>
                <div class="physical-row mb-200">
                  <div class="detail-field">
                    <label class="detail-label">EAN</label>
                    <BasicInput v-model="form.ean" />
                  </div>
                  <div class="detail-field">
                    <label class="detail-label">{{ $t("pim.weight") }}</label>
                    <BasicInput v-model="form.weight" />
                  </div>
                </div>
                <div class="physical-row physical-row--3">
                  <div class="detail-field">
                    <label class="detail-label">{{ $t("pim.width") }}</label>
                    <BasicInput v-model="form.width" />
                  </div>
                  <div class="detail-field">
                    <label class="detail-label">{{ $t("pim.height") }}</label>
                    <BasicInput v-model="form.height" />
                  </div>
                  <div class="detail-field">
                    <label class="detail-label">{{ $t("pim.depth") }}</label>
                    <BasicInput v-model="form.deep" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Tabs (full width, below 2-column grid) -->
        <BasicTabs v-model="activeTab" :options="tabs" class="mb-400 mt-400" />

        <div class="tab-content">
          <!-- Attributes tab -->
          <div v-if="activeTab === 'attributes'">
            <AttributeEditor
              :attributes="product.attributes || []"
              :feature-set-idx="form.feature_set_idx"
              :channel-idx="channelIdx"
              :languages="pimChannel.activeChannelLanguages"
              @update:attributes="onAttributesChange"
            />
          </div>

          <!-- Descriptions tab -->
          <div v-if="activeTab === 'descriptions'" class="detail-section">
            <div class="translation-field">
              <div class="translation-field__header">
                <label class="detail-label"
                  >Short Description ({{ defaultLang.toUpperCase() }})</label
                >
                <BasicButton
                  v-if="secondaryLanguages.length"
                  :text="$t('pim.translations')"
                  class="btn-outline translation-field__btn"
                  @click="openTranslations('short_description')"
                />
              </div>
              <InheritanceField
                v-if="!pimChannel.isDefaultChannel"
                :inherited="!!product.inherit_descriptions"
                :language="defaultLang"
                :overridden-langs="overriddenLangsMap.short_description || []"
                :inherited-value="''"
                @toggle-override="
                  ({ language, override }) =>
                    onToggleOverride({
                      featureIdx: 'short_description',
                      language,
                      override,
                    })
                "
              >
                <template #default="{ readonly }">
                  <BasicWysiwyg
                    variant="lite"
                    v-model="form.short_description_t9n[defaultLang]"
                    :disabled="readonly"
                  />
                </template>
              </InheritanceField>
              <BasicWysiwyg
                v-else
                variant="lite"
                v-model="form.short_description_t9n[defaultLang]"
              />
            </div>
            <div class="translation-field mt-300">
              <div class="translation-field__header">
                <label class="detail-label"
                  >{{ $t("pim.description") }} ({{
                    defaultLang.toUpperCase()
                  }})</label
                >
                <BasicButton
                  v-if="secondaryLanguages.length"
                  :text="$t('pim.translations')"
                  class="btn-outline translation-field__btn"
                  @click="openTranslations('description')"
                />
              </div>
              <InheritanceField
                v-if="!pimChannel.isDefaultChannel"
                :inherited="!!product.inherit_descriptions"
                :language="defaultLang"
                :overridden-langs="overriddenLangsMap.description || []"
                :inherited-value="defaultDescriptionT9n[defaultLang] || ''"
                @toggle-override="
                  ({ language, override }) =>
                    onToggleOverride({
                      featureIdx: 'description',
                      language,
                      override,
                    })
                "
              >
                <template #default="{ readonly }">
                  <BasicWysiwyg
                    variant="lite"
                    v-model="form.description_t9n[defaultLang]"
                    :disabled="readonly"
                  />
                </template>
              </InheritanceField>
              <BasicWysiwyg
                v-else
                variant="lite"
                v-model="form.description_t9n[defaultLang]"
              />
            </div>
          </div>

          <!-- Product Tile tab -->
          <div v-if="activeTab === 'product_tile'" class="detail-section">
            <div class="translation-field">
              <div class="translation-field__header">
                <label class="detail-label"
                  >Subname ({{ defaultLang.toUpperCase() }})</label
                >
                <BasicButton
                  v-if="secondaryLanguages.length"
                  :text="$t('pim.translations')"
                  class="btn-outline translation-field__btn"
                  @click="openTranslations('subname')"
                />
              </div>
              <InheritanceField
                v-if="!pimChannel.isDefaultChannel"
                :inherited="!!product.inherit_attributes"
                :language="defaultLang"
                :overridden-langs="overriddenLangsMap.subname || []"
                :inherited-value="''"
                @toggle-override="
                  ({ language, override }) =>
                    onToggleOverride({
                      featureIdx: 'subname',
                      language,
                      override,
                    })
                "
              >
                <template #default="{ readonly }">
                  <BasicInput
                    v-model="form.subname_t9n[defaultLang]"
                    :disabled="readonly"
                  />
                </template>
              </InheritanceField>
              <BasicInput v-else v-model="form.subname_t9n[defaultLang]" />
            </div>
            <div class="translation-field mt-300">
              <div class="translation-field__header">
                <label class="detail-label"
                  >Subname 2 ({{ defaultLang.toUpperCase() }})</label
                >
                <BasicButton
                  v-if="secondaryLanguages.length"
                  :text="$t('pim.translations')"
                  class="btn-outline translation-field__btn"
                  @click="openTranslations('subname2')"
                />
              </div>
              <InheritanceField
                v-if="!pimChannel.isDefaultChannel"
                :inherited="!!product.inherit_attributes"
                :language="defaultLang"
                :overridden-langs="overriddenLangsMap.subname2 || []"
                :inherited-value="''"
                @toggle-override="
                  ({ language, override }) =>
                    onToggleOverride({
                      featureIdx: 'subname2',
                      language,
                      override,
                    })
                "
              >
                <template #default="{ readonly }">
                  <BasicInput
                    v-model="form.subname2_t9n[defaultLang]"
                    :disabled="readonly"
                  />
                </template>
              </InheritanceField>
              <BasicInput v-else v-model="form.subname2_t9n[defaultLang]" />
            </div>
          </div>

          <!-- SEO tab -->
          <div v-if="activeTab === 'seo'" class="detail-section">
            <div class="translation-field">
              <div class="translation-field__header">
                <label class="detail-label"
                  >URL Key ({{ defaultLang.toUpperCase() }})</label
                >
                <BasicButton
                  v-if="secondaryLanguages.length"
                  :text="$t('pim.translations')"
                  class="btn-outline translation-field__btn"
                  @click="openTranslations('url_key')"
                />
              </div>
              <InheritanceField
                v-if="!pimChannel.isDefaultChannel"
                :inherited="!!product.inherit_attributes"
                :language="defaultLang"
                :overridden-langs="overriddenLangsMap.url_key || []"
                :inherited-value="''"
                @toggle-override="
                  ({ language, override }) =>
                    onToggleOverride({
                      featureIdx: 'url_key',
                      language,
                      override,
                    })
                "
              >
                <template #default="{ readonly }">
                  <BasicInput
                    v-model="form.url_key_t9n[defaultLang]"
                    :disabled="readonly"
                  />
                </template>
              </InheritanceField>
              <BasicInput v-else v-model="form.url_key_t9n[defaultLang]" />
            </div>
            <div class="translation-field mt-300">
              <div class="translation-field__header">
                <label class="detail-label"
                  >Meta Title ({{ defaultLang.toUpperCase() }})</label
                >
                <BasicButton
                  v-if="secondaryLanguages.length"
                  :text="$t('pim.translations')"
                  class="btn-outline translation-field__btn"
                  @click="openTranslations('meta_title')"
                />
              </div>
              <InheritanceField
                v-if="!pimChannel.isDefaultChannel"
                :inherited="!!product.inherit_attributes"
                :language="defaultLang"
                :overridden-langs="overriddenLangsMap.meta_title || []"
                :inherited-value="''"
                @toggle-override="
                  ({ language, override }) =>
                    onToggleOverride({
                      featureIdx: 'meta_title',
                      language,
                      override,
                    })
                "
              >
                <template #default="{ readonly }">
                  <BasicInput
                    v-model="form.meta_title_t9n[defaultLang]"
                    :disabled="readonly"
                  />
                </template>
              </InheritanceField>
              <BasicInput v-else v-model="form.meta_title_t9n[defaultLang]" />
            </div>
            <div class="translation-field mt-300">
              <div class="translation-field__header">
                <label class="detail-label"
                  >Meta Description ({{ defaultLang.toUpperCase() }})</label
                >
                <BasicButton
                  v-if="secondaryLanguages.length"
                  :text="$t('pim.translations')"
                  class="btn-outline translation-field__btn"
                  @click="openTranslations('meta_description')"
                />
              </div>
              <InheritanceField
                v-if="!pimChannel.isDefaultChannel"
                :inherited="!!product.inherit_attributes"
                :language="defaultLang"
                :overridden-langs="overriddenLangsMap.meta_description || []"
                :inherited-value="''"
                @toggle-override="
                  ({ language, override }) =>
                    onToggleOverride({
                      featureIdx: 'meta_description',
                      language,
                      override,
                    })
                "
              >
                <template #default="{ readonly }">
                  <TextAreaBasic
                    v-model="form.meta_description_t9n[defaultLang]"
                    rows="3"
                    :disabled="readonly"
                  />
                </template>
              </InheritanceField>
              <TextAreaBasic
                v-else
                v-model="form.meta_description_t9n[defaultLang]"
                rows="3"
              />
            </div>
            <div class="translation-field mt-300">
              <div class="translation-field__header">
                <label class="detail-label"
                  >{{ $t("pim.canonical_url") }} ({{ defaultLang.toUpperCase() }})</label
                >
                <BasicButton
                  v-if="secondaryLanguages.length"
                  :text="$t('pim.translations')"
                  class="btn-outline translation-field__btn"
                  @click="openTranslations('canonical_url')"
                />
              </div>
              <InheritanceField
                v-if="!pimChannel.isDefaultChannel"
                :inherited="!!product.inherit_attributes"
                :language="defaultLang"
                :overridden-langs="overriddenLangsMap.canonical_url || []"
                :inherited-value="''"
                @toggle-override="
                  ({ language, override }) =>
                    onToggleOverride({
                      featureIdx: 'canonical_url',
                      language,
                      override,
                    })
                "
              >
                <template #default="{ readonly }">
                  <BasicInput
                    v-model="form.canonical_url_t9n[defaultLang]"
                    :disabled="readonly"
                  />
                </template>
              </InheritanceField>
              <BasicInput v-else v-model="form.canonical_url_t9n[defaultLang]" />
            </div>
            <div class="translation-field mt-300">
              <label class="detail-label">{{ $t("pim.og_image_url") }}</label>
              <p class="fs-200 t-basic-500 mb-100">{{ $t("pim.og_image_url_help") }}</p>
              <BasicInput v-model="form.og_image" />
            </div>
          </div>

          <!-- Categories tab -->
          <div v-if="activeTab === 'categories'">
            <CategoryAssignment
              :categories="product.categories || []"
              :channel-idx="channelIdx"
              @update:category-idxs="onCategoryIdxsChange"
            />
          </div>

          <!-- Files tab -->
          <div v-if="activeTab === 'files'">
            <ProductFiles :channel-idx="channelIdx" :sku="product.sku" />
          </div>

          <!-- Linked products tab -->
          <div v-if="activeTab === 'links'">
            <ProductLinks :channel-idx="channelIdx" :sku="product.sku" />
          </div>

          <!-- Variants tab (placeholder) -->
          <div v-if="activeTab === 'variants'" class="tab-placeholder">
            <p class="t-basic-500">{{ $t("pim.coming_soon") }}</p>
          </div>

          <!-- Audit Log tab (placeholder) -->
          <div v-if="activeTab === 'audit_log'" class="tab-placeholder">
            <p class="t-basic-500">{{ $t("pim.coming_soon") }}</p>
          </div>

          <!-- Pricing tab -->
          <div v-if="activeTab === 'pricing'">
            <PriceDetail
              :sku="product.sku || product.real_product?.sku || ''"
              :channel-idx-prop="channelIdx"
              :embedded="true"
            />
          </div>

          <div v-if="activeTab === 'stock'">
            <StockTab
              :sku="product.sku || product.real_product?.sku || ''"
              :embedded="true"
            />
          </div>

          <div v-if="activeTab === 'supplier' && hasSupplierTab">
            <SupplierTab
              :sku="product.sku || product.real_product?.sku || ''"
              @refreshed="onSupplierRefreshed"
            />
          </div>

          <div v-if="activeTab === 'quality' && hasQualityData">
            <QualityTab
              :key="`${channelIdx}:${product.pk}`"
              :product-pk="product.pk"
              :channel-idx="channelIdx"
              :evaluated-at="product.gap_evaluated_at"
            />
          </div>
        </div>
      </template>
    </div>

    <Confirmation-modal
      :visible="showDeleteConfirm"
      @accept="deleteProduct"
      @reject="showDeleteConfirm = false"
    >
      <template #header
        ><h2>{{ $t("pim.confirm_delete_title") }}</h2></template
      >
      <template #description
        ><p>{{ $t("pim.confirm_delete_product") }}</p></template
      >
    </Confirmation-modal>

    <Confirmation-modal
      :visible="!!pendingInheritanceFlag"
      @accept="confirmInheritanceFlag"
      @reject="pendingInheritanceFlag = null"
    >
      <template #header
        ><h2>{{ $t("pim.confirm_inheritance_title") }}</h2></template
      >
      <template #description
        ><p>{{ $t("pim.confirm_inheritance_warning") }}</p></template
      >
    </Confirmation-modal>

    <Confirmation-modal
      :visible="!!pendingFeatureSetIdx"
      @accept="confirmFeatureSetChange"
      @reject="pendingFeatureSetIdx = null"
    >
      <template #header
        ><h2>{{ $t("pim.confirm_change_feature_set_title") }}</h2></template
      >
      <template #description
        ><p>{{ $t("pim.confirm_change_feature_set_warning") }}</p></template
      >
    </Confirmation-modal>

    <UnsavedChangesModal
      :visible="!!pendingNav"
      @save="saveAndLeave"
      @discard="confirmLeave"
      @stay="cancelLeave"
    />

    <CopyTranslationsDialog
      :visible="showCopyDialog"
      :channel-idx="channelIdx"
      :sku="product.sku || ''"
      @close="showCopyDialog = false"
      @copied="fetchProduct"
    />

    <AddToChannelDialog
      :visible="showAddToChannelDialog"
      :channel-idx="channelIdx"
      :sku="product.sku || ''"
      :present-in-channels="product.present_in_channels || []"
      @close="showAddToChannelDialog = false"
      @added="onAddedToChannel"
    />

    <SpawnDialog
      v-if="hasEnricherPanel"
      :visible="showSpawnDialog"
      :skus="product.sku ? [product.sku] : []"
      @close="showSpawnDialog = false"
    />

    <!-- Translations drawer -->
    <TranslationsDrawer
      :visible="!!translatingField"
      :title="translatingFieldLabel"
      :languages="pimChannel.activeChannelLanguages"
      :default-language="defaultLang"
      :values="translatingField ? form[translatingFieldFormKey] : {}"
      @cancel="translatingField = null"
      @save="onTranslationsSave"
    >
      <template #input="{ lang, modelValue, onUpdate }">
        <InheritanceField
          v-if="!pimChannel.isDefaultChannel"
          :inherited="!!translatingFieldInheritFlag"
          :language="lang"
          :overridden-langs="overriddenLangsMap[translatingField] || []"
          :inherited-value="''"
          @toggle-override="
            ({ language, override }) =>
              onToggleOverride({
                featureIdx: translatingField,
                language,
                override,
              })
          "
        >
          <template #default="{ readonly }">
            <BasicWysiwyg
              v-if="translatingFieldIsWysiwyg"
              variant="lite"
              :model-value="modelValue"
              @update:model-value="onUpdate"
              :disabled="readonly"
            />
            <TextAreaBasic
              v-else-if="translatingFieldIsTextArea"
              :model-value="modelValue"
              @update:model-value="onUpdate"
              rows="3"
              :disabled="readonly"
            />
            <BasicInput
              v-else
              :model-value="modelValue"
              @update:model-value="onUpdate"
              :disabled="readonly"
            />
          </template>
        </InheritanceField>
        <template v-else>
          <BasicWysiwyg
            v-if="translatingFieldIsWysiwyg"
            variant="lite"
            :model-value="modelValue"
            @update:model-value="onUpdate"
          />
          <TextAreaBasic
            v-else-if="translatingFieldIsTextArea"
            :model-value="modelValue"
            @update:model-value="onUpdate"
            rows="3"
          />
          <BasicInput
            v-else
            :model-value="modelValue"
            @update:model-value="onUpdate"
          />
        </template>
      </template>
    </TranslationsDrawer>
  </div>
</template>

<script>
import { defineAsyncComponent } from "vue";
import { useLoaderStore } from "@/stores/loader";
import { useNotifyStore } from "@/stores/notify";
import { usePimChannelStore } from "@/stores/pimChannel";
import { useMuninStore } from "@/stores/munin";
import { useUnsavedChanges } from "@/composables/useUnsavedChanges";
import UnsavedChangesModal from "@/functionals/Unsaved-changes-modal/index.vue";
import ConfirmationModal from "@/functionals/Confirmation-modal/index.vue";
import MediaGallery from "./components/MediaGallery.vue";
import AttributeEditor from "./components/AttributeEditor.vue";
import CategoryAssignment from "./components/CategoryAssignment.vue";
import InheritanceField from "./components/InheritanceField.vue";
import ProductFiles from "./components/ProductFiles.vue";
import CopyTranslationsDialog from "./components/CopyTranslationsDialog.vue";
import AddToChannelDialog from "./components/AddToChannelDialog.vue";
import {
  GET_Product,
  PATCH_Product,
  DELETE_Product,
  POST_ToggleOverride,
  GET_FeatureSetsGlobal,
} from "@/api/pim/api";
import { GET_BulkHasChanges } from "@/api/atlas/api";
import { hasQualityFields } from "./quality";
import { extractApiMessage } from "@/composables/useFormErrors";

export default {
  name: "ProductDetail",
  components: {
    UnsavedChangesModal,
    ConfirmationModal,
    MediaGallery,
    AttributeEditor,
    CategoryAssignment,
    InheritanceField,
    ProductFiles,
    CopyTranslationsDialog,
    AddToChannelDialog,
    PriceDetail: defineAsyncComponent(() => import("@/views/PriceManager/PriceDetail.vue")),
    StockTab: defineAsyncComponent(() => import("@/views/Stock/StockTab.vue")),
    SupplierTab: defineAsyncComponent(() => import("./components/SupplierTab.vue")),
    QualityTab: defineAsyncComponent(() => import("./components/QualityTab.vue")),
    SpawnDialog: defineAsyncComponent(() => import("./components/enrichment/SpawnDialog.vue")),
    ProductLinks: defineAsyncComponent(() => import("./components/ProductLinks.vue")),
  },
  beforeRouteLeave(to, from, next) {
    this.guardNavigation(to, from, next);
  },
  setup() {
    const loader = useLoaderStore();
    const notify = useNotifyStore();
    const pimChannel = usePimChannelStore();
    const munin = useMuninStore();
    const unsaved = useUnsavedChanges();
    return { loader, notify, pimChannel, munin, ...unsaved };
  },
  data() {
    return {
      product: {},
      loading: true,
      showDeleteConfirm: false,
      pendingInheritanceFlag: null,
      activeTab: "attributes",
      changedAttributes: null,
      changedCategoryIdxs: null,
      showCopyDialog: false,
      showAddToChannelDialog: false,
      showSpawnDialog: false,
      showInheritancePicker: false,
      translatingField: null,
      overriddenLangsMap: {},
      featureSetOptions: [],
      pendingFeatureSetIdx: null,
      form: {
        visibility: null,
        is_enabled: true,
        feature_set_idx: null,
        ean: "",
        weight: "",
        width: "",
        height: "",
        deep: "",
        name_t9n: {},
        description_t9n: {},
        short_description_t9n: {},
        url_key_t9n: {},
        meta_title_t9n: {},
        meta_description_t9n: {},
        canonical_url_t9n: {},
        og_image: "",
        subname_t9n: {},
        subname2_t9n: {},
      },
      visibilityOptions: [
        { label: "Not visible individually", value: 1 },
        { label: "Catalog", value: 2 },
        { label: "Search", value: 3 },
        { label: "Catalog & Search", value: 4 },
      ],
      supplierStatus: null,
      _suppressHashSync: false,
      channelMismatchWarning: false,
    };
  },
  computed: {
    channelIdx() {
      return this.pimChannel.activeChannelIdx;
    },
    hasEnricherPanel() {
      return this.munin.isPanelEnabled("enricher");
    },
    tabs() {
      const tabs = [
        { value: "attributes", label: this.$t("pim.tab_attributes") },
        { value: "descriptions", label: this.$t("pim.tab_descriptions") },
        { value: "product_tile", label: "Product Tile" },
        { value: "seo", label: "SEO" },
        { value: "categories", label: this.$t("pim.categories") },
        { value: "files", label: this.$t("pim.tab_files") },
        { value: "links", label: this.$t("pim.tab_links") },
        { value: "variants", label: this.$t("pim.tab_variants") },
        { value: "audit_log", label: this.$t("pim.tab_audit_log") },
      ];
      if (this.munin.isPanelEnabled("pricing")) {
        tabs.push({ value: "pricing", label: this.$t("pm.tab_pricing") });
      }
      if (this.munin.isPanelEnabled("stock")) {
        tabs.push({ value: "stock", label: this.$t("stock.tab_stock") });
      }
      if (this.hasSupplierTab) {
        tabs.push({ value: "supplier", label: this.$t("pim.tab_supplier") });
      }
      if (this.hasQualityData) {
        tabs.push({ value: "quality", label: this.$t("pim.quality_tab") });
      }
      return tabs;
    },
    hasSupplierTab() {
      return (
        this.munin.isPanelEnabled("atlas") &&
        this.supplierStatus?.has_source === true
      );
    },
    hasQualityData() {
      // Soft-compat gate: detail response carries gap_* only when the backend supports it.
      return hasQualityFields(this.product);
    },
    productClassLabel() {
      // etap-12 #24: ProductBase rows previously fell through to "Custom" via missing key.
      const name = this.product.product_class_name;
      const map = {
        productbase: this.$t("pim.type_base"),
        productsimple: this.$t("pim.type_simple"),
        productconfigurable: this.$t("pim.type_configurable"),
        productbundle: this.$t("pim.type_bundle"),
      };
      return map[name?.toLowerCase()] || this.$t("pim.type_custom");
    },
    productClassColor() {
      const name = this.product.product_class_name;
      const map = {
        productbase: "t-basic-700",
        productsimple: "t-support-400",
        productconfigurable: "t-primary-300",
        productbundle: "t-warning-300",
      };
      return map[name?.toLowerCase()] || "t-basic-700";
    },
    inheritanceCount() {
      let n = 0;
      if (this.product.inherit_attributes) n++;
      if (this.product.inherit_descriptions) n++;
      if (this.product.inherit_images) n++;
      return n;
    },
    defaultNameT9n() {
      return this.product.default_channel_name_t9n || {};
    },
    defaultDescriptionT9n() {
      return this.product.default_channel_description_t9n || {};
    },
    defaultLang() {
      return (
        this.pimChannel.activeChannel?.default_language ||
        this.pimChannel.activeChannelLanguages[0] ||
        "en"
      );
    },
    secondaryLanguages() {
      return this.pimChannel.activeChannelLanguages.filter(
        (l) => l !== this.defaultLang
      );
    },
    translatingFieldFormKey() {
      if (!this.translatingField) return null;
      return `${this.translatingField}_t9n`;
    },
    translatingFieldLabel() {
      const labels = {
        name: this.$t("pim.name"),
        description: this.$t("pim.description"),
        short_description: "Short Description",
        url_key: "URL Key",
        meta_title: "Meta Title",
        meta_description: "Meta Description",
        canonical_url: this.$t("pim.canonical_url"),
        subname: "Subname",
        subname2: "Subname 2",
      };
      return labels[this.translatingField] || this.translatingField;
    },
    translatingFieldIsWysiwyg() {
      return ["description", "short_description"].includes(
        this.translatingField
      );
    },
    translatingFieldIsTextArea() {
      return ["meta_description"].includes(this.translatingField);
    },
    translatingFieldInheritFlag() {
      const descriptionFields = ["name", "description", "short_description"];
      if (descriptionFields.includes(this.translatingField)) {
        return this.product.inherit_descriptions;
      }
      return this.product.inherit_attributes;
    },
  },
  watch: {
    "pimChannel.activeChannelIdx"() {
      this.fetchProduct();
    },
    "$route.hash"(newHash) {
      this.applyHashToTab(newHash);
    },
    activeTab(newTab) {
      this.syncTabToHash(newTab);
    },
    hasSupplierTab(enabled) {
      // Supplier tab appears asynchronously after fetchSupplierStatus(). If the user
      // landed on the page with #supplier hash, applyHashToTab() in mounted() found
      // no matching tab and bailed. Reapply once the tab becomes available.
      if (enabled) this.applyHashToTab(this.$route.hash);
    },
    hasQualityData(enabled) {
      // Quality tab appears once fetchProduct() resolves (gap_* fields present).
      // Re-apply a #quality deep-link that mounted() couldn't match yet.
      if (enabled) this.applyHashToTab(this.$route.hash);
    },
  },
  mounted() {
    this.fetchProduct();
    this.fetchFeatureSets();
    this.fetchSupplierStatus();
    this.applyHashToTab(this.$route.hash);
    this._closeInheritancePicker = (e) => {
      if (
        this.showInheritancePicker &&
        !e.target.closest(".inheritance-picker")
      ) {
        this.showInheritancePicker = false;
      }
    };
    document.addEventListener("click", this._closeInheritancePicker);
  },
  beforeUnmount() {
    document.removeEventListener("click", this._closeInheritancePicker);
  },
  methods: {
    openTranslations(fieldName) {
      this.translatingField = fieldName;
    },
    onTranslationsSave({ values }) {
      this.form[this.translatingFieldFormKey] = values;
      this.translatingField = null;
    },
    async fetchProduct() {
      this.loading = true;
      try {
        const { data } = await GET_Product(
          this.channelIdx,
          this.$route.params.sku
        );
        this.product = data;
        this.channelMismatchWarning = false;
        this.resetForm();
      } catch (err) {
        // etap-12 #25: product missing in selected channel → switch to default + warn.
        if (
          (err?.response?.status === 404 || err?.error === "NOT_FOUND") &&
          this.pimChannel.defaultChannelIdx &&
          this.channelIdx !== this.pimChannel.defaultChannelIdx
        ) {
          this.channelMismatchWarning = true;
          this.pimChannel.setActiveChannel(this.pimChannel.defaultChannelIdx);
          // pimChannel watcher will re-trigger fetchProduct().
          return;
        }
        const msg = extractApiMessage(err, this.$t("notifications.error"));
        this.notify.spawnNotification({ type: "negative", msg });
      } finally {
        this.loading = false;
      }
    },
    onFeatureSetSelect(val) {
      if (val === this.form.feature_set_idx) return;
      this.pendingFeatureSetIdx = val;
    },
    confirmFeatureSetChange() {
      this.form.feature_set_idx = this.pendingFeatureSetIdx;
      this.pendingFeatureSetIdx = null;
    },
    async fetchFeatureSets() {
      try {
        const { data } = await GET_FeatureSetsGlobal({ page_size: 100 });
        const results = data.results || data || [];
        this.featureSetOptions = results.map((fs) => ({
          label: fs.name || fs.idx,
          value: fs.idx,
        }));
      } catch {
        this.featureSetOptions = [];
      }
    },
    resetForm() {
      this.changedAttributes = null;
      this.changedCategoryIdxs = null;
      this.translatingField = null;
      const map = {};
      for (const attr of this.product.attributes || []) {
        if (attr.overridden_langs)
          map[attr.feature_idx] = [...attr.overridden_langs];
      }
      this.overriddenLangsMap = map;
      const t9nKeys = [
        "name_t9n",
        "description_t9n",
        "short_description_t9n",
        "url_key_t9n",
        "meta_title_t9n",
        "meta_description_t9n",
        "canonical_url_t9n",
        "subname_t9n",
        "subname2_t9n",
      ];
      const t9nData = {};
      for (const key of t9nKeys) {
        const src = { ...(this.product[key] || {}) };
        for (const lang of this.pimChannel.activeChannelLanguages) {
          if (!(lang in src)) src[lang] = "";
        }
        t9nData[key] = src;
      }
      this.form = {
        visibility: this.product.visibility,
        is_enabled: this.product.is_enabled,
        feature_set_idx: this.product.feature_set_idx || null,
        ean: this.product.ean || "",
        weight: this.product.weight || "",
        width: this.product.width || "",
        height: this.product.height || "",
        deep: this.product.deep || "",
        og_image: this.product.og_image || "",
        ...t9nData,
      };
      this.snapshot(this.form);
      this.track(this.form);
    },
    async toggleInheritanceFlag(flag) {
      const newVal = !this.product[flag];
      if (newVal) {
        this.pendingInheritanceFlag = flag;
        return;
      }
      await this._applyInheritanceFlag(flag, newVal);
    },
    async confirmInheritanceFlag() {
      const flag = this.pendingInheritanceFlag;
      this.pendingInheritanceFlag = null;
      if (flag) {
        await this._applyInheritanceFlag(flag, true);
      }
    },
    async _applyInheritanceFlag(flag, newVal) {
      try {
        await PATCH_Product(this.channelIdx, this.product.sku, {
          [flag]: newVal,
        });
        this.product[flag] = newVal;
        await this.fetchProduct();
      } catch (err) {
        this.notify.spawnNotification({
          type: "negative",
          msg: extractApiMessage(err, this.$t("notifications.error")),
        });
      }
    },
    async onToggleOverride({ featureIdx, language, override }) {
      try {
        await POST_ToggleOverride(this.channelIdx, this.product.sku, {
          feature_idx: featureIdx,
          language,
          override,
        });
        const langs = [...(this.overriddenLangsMap[featureIdx] || [])];
        if (override) {
          if (!langs.includes(language)) langs.push(language);
        } else {
          const idx = langs.indexOf(language);
          if (idx !== -1) langs.splice(idx, 1);
        }
        this.overriddenLangsMap = {
          ...this.overriddenLangsMap,
          [featureIdx]: langs,
        };
      } catch (err) {
        this.notify.spawnNotification({
          type: "negative",
          msg: extractApiMessage(err, this.$t("notifications.error")),
        });
      }
    },
    onAddedToChannel(targetChannelIdx) {
      this.pimChannel.setActiveChannel(targetChannelIdx);
    },
    onAttributesChange(attrs) {
      this.changedAttributes = attrs;
      this.isDirty = true;
    },
    onCategoryIdxsChange(idxs) {
      this.changedCategoryIdxs = idxs;
      this.isDirty = true;
    },
    async saveProduct() {
      this.loader.loaderStart();
      try {
        const payload = {};
        if (this.form.visibility !== this.product.visibility)
          payload.visibility = this.form.visibility;
        if (this.form.is_enabled !== this.product.is_enabled)
          payload.is_enabled = this.form.is_enabled;
        if (this.form.ean !== (this.product.ean || ""))
          payload.ean = this.form.ean || null;
        if (this.form.weight !== (this.product.weight || ""))
          payload.weight = this.form.weight || null;
        if (this.form.width !== (this.product.width || ""))
          payload.width = this.form.width || null;
        if (this.form.height !== (this.product.height || ""))
          payload.height = this.form.height || null;
        if (this.form.deep !== (this.product.deep || ""))
          payload.deep = this.form.deep || null;
        if (
          this.form.feature_set_idx !== (this.product.feature_set_idx || null)
        )
          payload.feature_set_idx = this.form.feature_set_idx;

        // System features — send via attributes array
        const t9nAttrs = [];
        const systemT9nFields = [
          { formKey: "name_t9n", featureIdx: "name" },
          { formKey: "description_t9n", featureIdx: "description" },
          { formKey: "short_description_t9n", featureIdx: "short_description" },
          { formKey: "url_key_t9n", featureIdx: "url_key" },
          { formKey: "meta_title_t9n", featureIdx: "meta_title" },
          { formKey: "meta_description_t9n", featureIdx: "meta_description" },
          { formKey: "canonical_url_t9n", featureIdx: "canonical_url" },
          { formKey: "subname_t9n", featureIdx: "subname" },
          { formKey: "subname2_t9n", featureIdx: "subname2" },
        ];
        for (const { formKey, featureIdx } of systemT9nFields) {
          const orig = this.product[formKey] || {};
          for (const lang of Object.keys(this.form[formKey])) {
            if (this.form[formKey][lang] !== (orig[lang] || "")) {
              t9nAttrs.push({
                feature_idx: featureIdx,
                value_txt_t9n: this.form[formKey],
              });
              break;
            }
          }
        }

        // og_image — plain VARCHAR255 system feature
        if (this.form.og_image !== (this.product.og_image || "")) {
          t9nAttrs.push({ feature_idx: "og_image", value_txt: this.form.og_image });
        }

        if (this.changedAttributes || t9nAttrs.length) {
          payload.attributes = [...(this.changedAttributes || []), ...t9nAttrs];
        }

        if (this.changedCategoryIdxs) {
          payload.category_idxs = this.changedCategoryIdxs;
        }

        if (Object.keys(payload).length === 0) {
          this.notify.spawnNotification({
            type: "informative",
            msg: this.$t("pim.no_changes_detected"),
          });
          this.loader.loaderFinish();
          return;
        }

        await PATCH_Product(this.channelIdx, this.product.sku, payload);
        const changedKeys = Object.keys(payload);
        const fieldLabels = changedKeys.map((k) => {
          const map = {
            visibility: this.$t("pim.visibility"),
            is_enabled: this.$t("pim.enabled"),
            ean: "EAN",
            weight: this.$t("pim.weight"),
            width: this.$t("pim.width"),
            height: this.$t("pim.height"),
            deep: this.$t("pim.depth"),
            attributes: this.$t("pim.tab_attributes"),
            category_idxs: this.$t("pim.categories"),
            feature_set_idx: this.$t("pim.feature_set"),
          };
          return map[k] || k;
        });
        this.notify.spawnNotification({
          type: "positive",
          msg: `${this.$t("pim.product_saved")}: ${fieldLabels.join(", ")}`,
        });
        await this.fetchProduct();
      } catch (err) {
        const errData = err?.response?.data || err;
        let msg = this.$t("notifications.save_error");
        if (errData?.message) {
          msg = errData.message;
          if (errData.details?.length) {
            const fieldErrors = errData.details
              .map((d) =>
                d.field ? `${d.field}: ${d.description}` : d.description
              )
              .join(", ");
            msg += ` (${fieldErrors})`;
          }
        } else if (errData?.detail) {
          msg = errData.detail;
        }
        this.notify.spawnNotification({ type: "negative", msg });
      } finally {
        this.loader.loaderFinish();
      }
    },
    async saveAndLeave() {
      await this.saveProduct();
      this.confirmLeave();
    },
    async deleteProduct() {
      this.showDeleteConfirm = false;
      this.loader.loaderStart();
      try {
        await DELETE_Product(this.channelIdx, this.product.sku);
        this.notify.spawnNotification({
          type: "positive",
          msg: this.$t("notifications.deleted"),
        });
        this.confirmLeave();
        this.$router.push("/pim/products");
      } catch (err) {
        const msg = extractApiMessage(err, this.$t("notifications.error"));
        this.notify.spawnNotification({ type: "negative", msg });
      } finally {
        this.loader.loaderFinish();
      }
    },
    async fetchSupplierStatus() {
      if (!this.munin.isPanelEnabled("atlas")) {
        this.supplierStatus = null;
        return;
      }
      const sku = this.$route.params.sku;
      if (!sku) return;
      try {
        const { data } = await GET_BulkHasChanges([sku]);
        this.supplierStatus = data?.skus?.[sku] || null;
      } catch {
        this.supplierStatus = null;
      }
    },
    onSupplierRefreshed() {
      this.fetchSupplierStatus();
    },
    applyHashToTab(rawHash) {
      const hash = (rawHash || "").replace(/^#/, "");
      if (!hash) return;
      const match = this.tabs.find((t) => t.value === hash);
      if (match && this.activeTab !== hash) {
        this._suppressHashSync = true;
        this.activeTab = hash;
        this.$nextTick(() => {
          this._suppressHashSync = false;
        });
      }
    },
    syncTabToHash(tabValue) {
      if (this._suppressHashSync) return;
      const currentHash = (this.$route.hash || "").replace(/^#/, "");
      if (currentHash === tabValue) return;
      this.$router.replace({
        path: this.$route.path,
        query: this.$route.query,
        hash: `#${tabValue}`,
      });
    },
  },
};
</script>

<style lang="scss" scoped>
.product-layout {
  display: grid;
  grid-template-columns: 380px 1fr;
  gap: var(--space-400);

  @media (max-width: 960px) {
    grid-template-columns: 1fr;
  }
}

.product-layout__media {
  min-width: 0;
}

.product-layout__content {
  min-width: 0;
}

.info-card {
  border: 1px solid var(--c-basic-200);
  border-radius: 6px;
  padding: 20px;
}

.info-card__inheritance {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.inheritance-picker {
  position: relative;
  display: inline-block;
}

.inheritance-picker__btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 0 12px;
  height: var(--elem-height);
  border: 1px solid var(--c-basic-200);
  border-radius: var(--radius-sm);
  background: var(--c-basic-100);
  color: var(--c-basic-600);
  font-size: var(--fs-300);
  font-weight: 500;
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s;

  &:hover {
    border-color: var(--c-support-300);
  }

  &--active {
    border-color: var(--c-support-300);
    background: var(--c-support-100);
    color: var(--c-support-400);
  }
}

.inheritance-picker__count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 18px;
  height: 18px;
  border-radius: 9px;
  background: var(--c-support-400);
  color: var(--c-basic-100);
  font-size: 11px;
  font-weight: 600;
}

.inheritance-picker__dropdown {
  position: absolute;
  top: calc(100% + 4px);
  right: 0;
  min-width: 200px;
  background: var(--c-basic-100);
  border: 1px solid var(--c-basic-200);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-lg);
  z-index: 100;
  padding: 4px 0;
}

.inheritance-picker__item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  cursor: pointer;
  font-size: var(--fs-300);
  color: var(--c-basic-700);
  transition: background 0.1s;

  &:hover {
    background: var(--c-basic-200);
  }

  &--active {
    color: var(--c-support-400);
    font-weight: 500;
  }
}

.inheritance-picker__check {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--c-basic-300);
  font-size: 12px;
  flex-shrink: 0;

  .inheritance-picker__item--active & {
    background: var(--c-support-400);
    border-color: var(--c-support-400);
    color: var(--c-basic-100);
  }
}

.toolbar-action {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 0 12px;
  height: var(--elem-height);
  border: 1px solid var(--c-basic-300);
  border-radius: var(--radius-sm);
  background: var(--c-basic-100);
  color: var(--c-basic-600);
  font-size: var(--fs-300);
  font-weight: 500;
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s;

  &:hover {
    border-color: var(--c-basic-500);
  }

  &__icon {
    font-size: 14px;
    flex-shrink: 0;
  }

  &--save {
    border: none;
    background: var(--c-support-400);
    color: var(--c-basic-100);

    &:hover {
      background: var(--c-support-300);
    }
  }
}

@media (max-width: 960px) {
  .toolbar-action {
    justify-content: center;
    width: var(--elem-height);
    padding: 0;
  }

  .toolbar-action__text {
    display: none;
  }

  .inheritance-picker__btn {
    justify-content: center;
    width: var(--elem-height);
    padding: 0;
  }

  .inheritance-picker__btn .toolbar-action__text {
    display: none;
  }
}

.tab-content {
  padding-top: var(--space-300);
}

.tab-placeholder {
  padding: 40px;
  text-align: center;
}

.detail-section {
  border: 1px solid var(--c-basic-200);
  border-radius: 6px;
  padding: 20px;
}

.detail-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: var(--space-200);
}

.detail-field {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.detail-label {
  font-size: var(--fs-200);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  color: var(--c-basic-500);
}

.meta-item {
  font-size: var(--fs-200);
  color: var(--c-basic-500);

  strong {
    font-weight: 600;
    color: var(--c-basic-700);
  }
}

.meta-dot {
  width: 3px;
  height: 3px;
  border-radius: 50%;
  background: var(--c-basic-400);
  flex-shrink: 0;
}

.product-controls {
  display: flex;
  align-items: flex-end;
  gap: var(--space-300);
  flex-wrap: wrap;

  &__field {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  &__label {
    font-size: var(--fs-200);
    color: var(--c-basic-500);
    font-weight: 500;
  }
}

.info-card__physical {
  border-top: 1px solid var(--c-basic-200);
  padding-top: var(--space-300);
}

.physical-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-200);

  &--3 {
    grid-template-columns: 1fr 1fr 1fr;
  }
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
</style>

