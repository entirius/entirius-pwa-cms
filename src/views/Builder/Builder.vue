<template>
  <div
    class="fs-300 t-basic-700 fg-1 flex-column relative pl-500 pr-500 pt-200 pb-700 ovy-auto builder-wrap"
    :id="`container-${componentId}`"
  >
    <ConfirmationModal
      :visible="confirmation_modal"
      @accept="
        () => {
          on_delete(section_to_delete);

          confirmation_modal = false;
          section_to_delete = null;
        }
      "
      @reject="
        () => {
          confirmation_modal = false;
          section_to_delete = null;
        }
      "
    >
      <template #header>
        <h2>{{ $t("builder.confirm_title") }}</h2>
      </template>
      <template #description>
        <p>{{ $t("builder.confirm_msg") }}</p>
      </template>
    </ConfirmationModal>
    <ConfirmationModal
      :visible="tile_confirmation_modal"
      @accept="
        () => {
          on_tile_delete(tile_to_delete.tile_uid, tile_to_delete.section_uid);
          tile_confirmation_modal = false;
          tile_to_delete = { tile_uid: null, section_uid: null };
        }
      "
      @reject="
        () => {
          tile_confirmation_modal = false;
          tile_to_delete = { tile_uid: null, section_uid: null };
        }
      "
    >
      <template #header>
        <h2>{{ $t("builder.confirm_title") }}</h2>
      </template>
      <template #description>
        <p>{{ $t("builder.confirm_msg") }}</p>
      </template>
    </ConfirmationModal>
    <RenameModal
      :visible="rename_modal"
      @reject="rename_modal = false"
      @accept="
        () => {
          if (!copy_doc_label) {
            return;
          }
          if (copy_doc_label === custom_doc_name) {
            return;
          }
          copy_content();
          rename_modal = false;
        }
      "
    >
      <template #header>
        <p class="mb-300">{{ $t("builder.enter_new_doc_name") }}</p>
      </template>

      <template #description>
        <BasicInput
          class="bg-basic-100 lh-base-elem"
          :label="$t('builder.document_name')"
          v-model="copy_doc_label"
          :key="`copy-name-label`"
        />
      </template>
    </RenameModal>
    <!-- Left toolbar: back button, doc name, access level -->
    <Teleport to="#builder-toolbar-left" defer>
      <BasicButton
        text=""
        icon="arrow-left"
        class="bg-basic-200 t-basic-600"
        @click="$router.push(`/pages/${content_type}`)"
      />
      <div v-if="!loading" class="builder-toolbar-name">
        <span class="fs-200 t-basic-500">{{ $t("builder.doc_name") }}</span>
        <span class="fs-300 fw-600 t-basic-700">
          {{ custom_doc_name || $t("builder.set_name") }}
        </span>
      </div>
      <ChannelMultiSelect
        v-if="!loading"
        v-model="channels"
        :channels="available_channels"
        :label="$t('builder.channels')"
        :all-label="$t('builder.all')"
      />
      <HomeVariantSwitcher
        v-if="!loading && isHomeDoc"
        ref="homeVariantSwitcher"
        :content-type="content_type"
        :type="type"
        :current-uid="uid"
        :current-channel="channels && channels.length === 1 ? channels[0] : null"
        :available-channels="available_channels"
        @switch="onHomeVariantSwitch"
      />
    </Teleport>

    <!-- Right toolbar: unsaved badge, save, publish, duplicate, settings, advanced -->
    <Teleport to="#builder-toolbar-right" defer>
      <template v-if="!loading">
        <span v-if="isDirty" class="chip bg-warning-100 t-warning-300">
          {{ $t("unsaved.changes") }}
        </span>
        <button
          class="builder-tb-btn builder-tb-btn--secondary pointer"
          @click="saveDraft"
        >
          <FontAwesomeIcon icon="floppy-disk" />
          <span class="builder-tb-btn__label">{{
            uid ? $t("builder.save_draw") : $t("builder.post_draw")
          }}</span>
        </button>
        <button
          class="builder-tb-btn builder-tb-btn--primary pointer"
          :class="{ 'builder-tb-btn--disabled': !uid }"
          :disabled="!uid"
          @click="saveAndPublish"
        >
          <FontAwesomeIcon icon="upload" />
          <span class="builder-tb-btn__label">{{
            $t("builder.publish_document")
          }}</span>
        </button>
        <button
          class="builder-toolbar-icon pointer"
          :title="$t('builder.copy_document')"
          @click="rename_modal = true"
        >
          <FontAwesomeIcon icon="copy" />
        </button>
        <SubscriberSetter
          v-if="has_options('document_configs')"
          @on_AssetPass="
            ({ reset, ...config }) => {
              document_configs = config;
            }
          "
          :handyType="{
            id: 'configs-kit',
            label: 'Document configurator',
          }"
          :options="{ config_type: 'document_configs' }"
          :defaults="{
            doc_type: type,
            ...document_configs,
            __channels: channels,
          }"
          class="builder-toolbar-icon pointer"
          :title="$t('builder.document_options')"
        >
          <FontAwesomeIcon icon="pen-to-square" />
        </SubscriberSetter>
        <NoticeMe
          :active="
            !advanced_options
              ? !(Boolean(routes && routes.length) && Boolean(custom_doc_name))
              : false
          "
          :stroke_color_class="'stroke-basic-600'"
          class="flex jc-ct ai-ct"
        >
          <button
            @click="advanced_options = !advanced_options"
            class="builder-toolbar-icon pointer"
            :class="{ 't-negative-200': advanced_options }"
            :title="$t('builder.advanced')"
          >
            <FontAwesomeIcon :icon="advanced_options ? 'xmark' : 'gears'" />
          </button>
        </NoticeMe>
      </template>
    </Teleport>

    <!-- Advanced options row (collapsible, below toolbar) -->
    <div
      v-if="advanced_options && !loading"
      class="builder-advanced-row flex ai-ct gap-200 bg-basic-100"
    >
      <NoticeMe
        :stroke_color_class="'stroke-basic-600'"
        :active="Boolean(!custom_doc_name)"
        :style="[!custom_doc_name ? { padding: '1px' } : {}]"
        class="lh-base-elem"
      >
        <BasicInput
          :placeholder="$t('builder.custom_doc_name')"
          class="fs-200 t-basic-600 h-100"
          v-model="custom_doc_name"
        />
      </NoticeMe>
      <SubscriberSetter
        v-if="content_type !== 'layout-extender'"
        :is_disabled="isHomeDoc"
        @on_AssetPass="routes = $event"
        :handyType="{ id: 'routes-kit', label: $t('routes.title') }"
        :defaults="{ type, routes }"
      >
        <NoticeMe
          :active="!routes || !routes.length"
          :stroke_color_class="'stroke-basic-600'"
          class="pointer"
        >
          <div
            class="builder-adv-btn pointer"
            :class="{ 'builder-adv-btn--disabled': isHomeDoc }"
          >
            <FontAwesomeIcon icon="pen-to-square" />
            {{
              !routes || !routes.length
                ? $t("builder.set_url")
                : $t("builder.edit_url")
            }}
          </div>
        </NoticeMe>
      </SubscriberSetter>
      <SubscriberSetter
        v-if="content_type !== 'layout-extender'"
        @on_AssetPass="meta = $event"
        :handyType="{ id: 'meta-kit', label: $t('builder.meta') }"
        :defaults="{ meta }"
        class="builder-adv-btn pointer"
      >
        <FontAwesomeIcon icon="circle-info" />
        {{ $t("builder.meta") }}
      </SubscriberSetter>
      <SubscriberSetter
        v-if="content_type !== 'layout-extender'"
        @on_AssetPass="category = $event"
        :handyType="{ id: 'categories-kit', label: $t('builder.categories') }"
        :defaults="{ category }"
        class="builder-adv-btn pointer"
      >
        <FontAwesomeIcon icon="tag" />
        {{ $t("builder.categories") }}
      </SubscriberSetter>
    </div>

    <!-- Author picker (shown when content type supports authors) -->
    <div
      v-if="advanced_options && supportsAuthors && !loading"
      class="builder-author-panel"
    >
      <div
        class="builder-author-panel__header"
        @click="authorPanelOpen = !authorPanelOpen"
      >
        <FontAwesomeIcon icon="user-pen" />
        <span>{{ $t('authors.title') }}</span>
        <span class="builder-author-panel__count">
          {{ authors.length + co_authors.length }}
        </span>
        <FontAwesomeIcon
          :icon="authorPanelOpen ? 'chevron-up' : 'chevron-down'"
          class="builder-author-panel__chevron"
        />
      </div>
      <div v-if="authorPanelOpen" class="builder-author-panel__body">
        <div class="flex-1" style="min-width: 240px">
          <AuthorPicker
            v-model="authors"
            :label="$t('authors.primary')"
            :exclude="co_authors"
            :placeholder-search="$t('authors.search_authors')"
            :placeholder-empty="$t('authors.no_authors')"
          />
        </div>
        <div class="flex-1" style="min-width: 240px">
          <AuthorPicker
            v-model="co_authors"
            :label="$t('authors.co_authors')"
            :exclude="authors"
            :placeholder-search="$t('authors.search_authors')"
            :placeholder-empty="$t('authors.no_authors')"
          />
        </div>
      </div>
    </div>

    <UnsavedChangesModal
      :visible="!!pendingNav"
      @save="saveAndLeave"
      @discard="confirmLeave"
      @stay="cancelLeave"
    />

    <!-- Hidden SubscriberSetters triggered by FAB -->
    <div style="display: none">
      <SubscriberSetter
        ref="newSectionSetter"
        @on_AssetPass="set_section"
        :handyType="{ id: 'configs-kit', label: $t('builder.new_section') }"
        :options="{ config_type: 'section_configs' }"
        :defaults="{ doc_type: type, __channels: channels }"
        :is_disabled="isSectionLimitReached"
      />
      <SubscriberSetter
        ref="manageOrderSetter"
        @on_AssetPass="sections_order = $event"
        :handyType="{ id: 'order-kit', label: $t('builder.manage_order') }"
        :options="{ config_type: 'section_configs' }"
        :defaults="{
          order: sections_order,
          inserts: sections_order.reduce((o, uid) => {
            const s = sections[uid] || {};
            o[uid] = { title: s.title || null, core_type: s.core_type || null };
            return o;
          }, {}),
        }"
      />
    </div>

    <div v-if="!handyKitOpen" class="builder-fab-stack">
      <div class="builder-fab-aux">
        <button
          v-if="isScrolled"
          class="builder-fab-aux__btn pointer"
          @click="scroll_into(`container-${componentId}`)"
          :aria-label="$t('builder.scroll_top')"
        >
          <FontAwesomeIcon icon="chevron-up" />
        </button>
        <button
          class="builder-fab-aux__btn pointer"
          @click="$refs.manageOrderSetter?.$el?.click()"
          :aria-label="$t('builder.manage_order')"
        >
          <FontAwesomeIcon icon="grip" />
        </button>
      </div>
      <FloatingActions :actions="fabActions" />
    </div>

    <nav
      class="sections-options-menu flex ai-ct jc-fe pv-200 pt-200 pb-200 pl-500 pr-500 br-50 bb-basic-300 bg-basic-100 mb-600"
      v-if="type === 'blog-post'"
    >
      <div class="inline-flex ai-ct gap-100 mr-200">
        <ToolTip
          class="right t-support-300 fs-200 relative"
          :tip="$t('builder.blog_repr_tip')"
          :is_wrapper="true"
        >
          <SubscriberSetter
            @on_AssetPass="blog_extension = $event"
            :handyType="{ id: 'configs-kit', label: 'Blog tile repr.' }"
            :options="{
              config_type: 'tile_configs',
              prevent_configuration: ['core_type'],
            }"
            :defaults="
              blog_extension
                ? { doc_type: type, ...blog_extension, __channels: channels }
                : { doc_type: type, core_type: 'blog-extension-tile', __channels: channels }
            "
          >
            <NoticeMe
              :active="!blog_extension"
              :stroke_color_class="'stroke-warning-200'"
            >
              <div
                class="flex ai-ct gap-100 p-50 fs-200 pointer br-50"
                :class="[
                  !blog_extension
                    ? 'p-50 bg-basic-300 t-warning-200  bg-basic-800-hover'
                    : 't-basic-600 bg-basic-400 b-basic-500',
                ]"
              >
                <span
                  class="relative"
                  style="width: 15px; height: 15px"
                  v-if="!blog_extension"
                >
                  <i
                    class="icon-cookie"
                    :class="{
                      'pulse-animation t-warning-200': !blog_extension,
                    }"
                  ></i>
                </span>
                <span> {{ $t("builder.blog_repr_tile") }} </span>
                <span v-if="blog_extension" @click.stop="blog_extension = null">
                  <i class="icon-close-mini"></i>
                </span>
              </div>
            </NoticeMe>
          </SubscriberSetter>
        </ToolTip>
      </div>
    </nav>
    <div class="grid grid-col-12">
      <div class="grid gap-400 gc-s-1 gc-e-13">
        <div
          class="fs-300 grid b-basic-300 br-50 ov-h"
          v-for="(s_uid, s_idx) in sections_order"
          :key="s_idx"
        >
          <div class="grid grid-col-4 t-basic-600">
            <div class="gc-s-1 gc-e-5 br-50 bb-basic-400">
              <div class="pt-200 pb-200 pl-500 pr-500 bg-basic-100">
                <div class="section-header-row flex jc-sb mb-200">
                  <div class="section-title-wrap">
                    <p class="section-title fs-600 fw-600 t-basic-700">
                      {{ formatCoreType(sections[s_uid]["core_type"]) }}
                      <span class="fs-200 t-basic-500 fw-400 ml-100"
                        >· {{ tileCountLabel(s_uid) }}</span
                      >
                    </p>
                    <p
                      v-if="sections[s_uid].title"
                      class="fs-200 t-basic-600 lc-1"
                    >
                      {{ sections[s_uid].title }}
                    </p>
                    <p
                      class="section-uid fs-100 t-basic-400 pointer"
                      @click="copyToClipboard(s_uid)"
                      :title="s_uid"
                    >
                      {{ s_uid.substring(0, 8) }}
                    </p>
                  </div>
                  <div class="section-actions flex gap-50 as-s ai-ct">
                    <ToolTip
                      class="right relative"
                      :tip="sectionConfigSummary(s_uid)"
                      :is_wrapper="true"
                    >
                      <button
                        class="section-icon-btn pointer"
                        :aria-label="$t('builder.setted_config')"
                      >
                        <FontAwesomeIcon icon="eye" />
                      </button>
                    </ToolTip>
                    <SubscriberSetter
                      @onSet="edited_section_uid = s_uid"
                      @on_AssetPass="set_section"
                      :handyType="{
                        id: 'configs-kit',
                        label: $t('builder.section'),
                      }"
                      :options="{ config_type: 'section_configs' }"
                      :defaults="{ ...sections[s_uid], __channels: channels }"
                      class="section-icon-btn pointer"
                    >
                      <FontAwesomeIcon icon="pen" />
                    </SubscriberSetter>
                    <button
                      class="section-icon-btn pointer"
                      :aria-label="$t('common.copy')"
                      @click="
                        copy_elem({
                          _to: [`sections_order`, 'sections'],
                          _after: s_idx,
                          copy: sections[s_uid],
                        })
                      "
                    >
                      <FontAwesomeIcon icon="copy" />
                    </button>
                    <button
                      class="section-icon-btn section-icon-btn--danger pointer"
                      :aria-label="$t('common.delete')"
                      @click="
                        () => {
                          confirmation_modal = true;
                          section_to_delete = s_uid;
                        }
                      "
                    >
                      <FontAwesomeIcon icon="trash-can" />
                    </button>
                  </div>
                </div>
                <div>
                  <div
                    v-for="(
                      { prop = null, __value, type = null }, i
                    ) in core_properties"
                  >
                    <div v-if="sections[s_uid][prop]" class="mb-200">
                      <p class="t-basic-500 fs-100 mb-50">
                        {{ props_dictionary[prop] }}:
                      </p>
                      <p v-if="type === 'text'" class="fs-200">
                        {{ sections[s_uid][prop] }}
                      </p>
                      <div
                        v-if="type === 'wysiwyg'"
                        v-html="sections[s_uid][prop]"
                        class="wysiwyg-container-preview lc-3 fs-200"
                      ></div>
                      <ImagesControllPreview
                        v-if="type === 'images'"
                        :value="sections[s_uid][prop]"
                      />
                      <GroupFieldsControllerPreview
                        class="w-50 w-100-m"
                        v-if="type === 'group-fields'"
                        :value="sections[s_uid][prop]"
                      />
                      <div v-if="type === 'buttons'" class="flex wrap gap-50">
                        <span
                          v-for="(link, idx) in sections[s_uid][prop]"
                          :key="idx"
                          class="builder-btn-chip"
                        >
                          {{ link.link_label || link.link_url || "—" }}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div class="gc-s-1 gc-e-5 bg-basic-200 pt-200 pb-200 pl-500 pr-500">
              <div
                class="t-basic-700 br-50"
                v-if="
                  sections[s_uid]['core_type'] !== 'section-slider' ||
                  sections[s_uid]['slider_type'] === 'tiles'
                "
              >
                <template
                  v-if="
                    Boolean(
                      section_options(sections[s_uid]['core_type']) ===
                        'no_options' ||
                        section_options(
                          sections[s_uid]['core_type'],
                          'max_tiles'
                        ) > 0
                    )
                  "
                >
                  <div class="tiles-header flex jc-sb ai-ct">
                    <p class="fs-300 fw-500">
                      {{ $t("builder.tiles") }} ({{
                        `${
                          tiles_order && tiles_order[s_uid]
                            ? tiles_order[s_uid].length
                            : "0"
                        }/${
                          section_options(sections[s_uid]["core_type"]) ===
                          "no_options"
                            ? "~"
                            : section_options(
                                sections[s_uid]["core_type"],
                                "max_tiles"
                              )
                        }`
                      }})
                    </p>
                    <div class="flex gap-50 ai-ct">
                      <SubscriberSetter
                        @onSet="
                          () => {
                            edited_section_uid = s_uid;
                          }
                        "
                        @on_AssetPass="set_tile"
                        :handyType="{
                          id: 'configs-kit',
                          label: $t('builder.add_tile'),
                        }"
                        :options="{ config_type: 'tile_configs' }"
                        :defaults="{
                          doc_type: type,
                          section_core_type: sections[s_uid]['core_type'],
                          __channels: channels,
                        }"
                        class="section-icon-btn section-icon-btn--primary pointer"
                        :is_disabled="
                          !Boolean(
                            section_options(sections[s_uid]['core_type']) ===
                              'no_options'
                          ) &&
                          Boolean(
                            tiles_order[s_uid] &&
                              tiles_order[s_uid].length ==
                                section_options(
                                  sections[s_uid]['core_type'],
                                  'max_tiles'
                                )
                          )
                        "
                      >
                        <FontAwesomeIcon icon="plus" />
                      </SubscriberSetter>

                      <SubscriberSetter
                        v-if="tiles_order[s_uid] && tiles_order[s_uid].length"
                        @on_AssetPass="tiles_order[s_uid] = $event"
                        :handyType="{
                          id: 'order-kit',
                          label: $t('builder.manage_tile_order'),
                        }"
                        :options="{ config_type: 'tiles_configs' }"
                        :defaults="{
                          order: tiles_order[s_uid],
                          inserts: tiles_order[s_uid].reduce((o, uid) => {
                            const t = tiles[uid] || {};
                            o[uid] = {
                              title: t.title || null,
                              core_type: t.core_type || null,
                              sku: t.sku || null,
                              product_sku: t.product_sku || null,
                            };
                            return o;
                          }, {}),
                        }"
                        class="section-icon-btn pointer"
                      >
                        <FontAwesomeIcon icon="grip" />
                      </SubscriberSetter>
                      <button
                        v-if="tiles_order[s_uid] && tiles_order[s_uid].length"
                        class="section-icon-btn pointer"
                        @click="
                          section_tiles_details &&
                          section_tiles_details == s_uid
                            ? (section_tiles_details = null)
                            : (section_tiles_details = s_uid)
                        "
                      >
                        <FontAwesomeIcon
                          :icon="
                            section_tiles_details === s_uid ? 'eye' : 'eye'
                          "
                        />
                      </button>
                    </div>
                  </div>
                </template>
              </div>
              <div class="mt-200">
                <div
                  class="tile-swiper-wrap"
                  v-if="
                    tiles_order[s_uid] &&
                    tiles_order[s_uid].length &&
                    section_tiles_details !== s_uid
                  "
                >
                  <BasicSwiper
                    :key="tiles_order[s_uid].length"
                    :uid_class="`tiles-slider-${s_uid}`"
                    :options="{
                      slidesPerView: 1.25,
                      spaceBetween: 10,
                      breakpoints: {
                        480: {
                          slidesPerView: 2.15,
                        },
                        768: {
                          slidesPerView: 3.25,
                        },
                        1200: {
                          slidesPerView: 4.25,
                        },
                        1700: {
                          slidesPerView: 5.15,
                        },
                      },
                    }"
                  >
                    <template
                      v-for="(t_uid, index) in tiles_order[s_uid]"
                      :key="t_uid"
                    >
                      <div v-if="tiles[t_uid] && tiles[t_uid].core_type" class="swiper-slide pointer">
                        <div
                          class="bg-basic-300 t-basic-700 br-50 pl-100 pr-100 pt-100 pb-100 ai-ct grid gap-50"
                        >
                          <div class="flex-column ai-fe">
                            <p class="fs-200 t-basic-700 fw-600 txt-right lc-1">
                              {{ formatCoreType(tiles[t_uid]["core_type"]) }}
                            </p>
                            <p
                              v-if="tiles[t_uid].title"
                              class="fs-100 t-basic-500 lc-1 txt-right"
                            >
                              {{ tiles[t_uid].title }}
                            </p>
                            <p
                              v-else-if="
                                tiles[t_uid].product_sku || tiles[t_uid].sku
                              "
                              class="fs-100 t-support-400 lc-1 txt-right"
                            >
                              SKU:
                              {{ tiles[t_uid].product_sku || tiles[t_uid].sku }}
                            </p>
                            <div
                              v-if="tileFirstImage(t_uid)"
                              class="tile-card-thumb mt-50"
                            >
                              <img
                                :src="tileFirstImage(t_uid)"
                                alt=""
                                class="tile-card-thumb__img"
                                @error="
                                  (e) => (e.target.style.display = 'none')
                                "
                              />
                            </div>
                          </div>

                          <div class="flex gap-50 jc-fe mt-200">
                            <button
                              class="section-icon-btn pointer"
                              :aria-label="$t('common.copy')"
                              :disabled="
                                !Boolean(
                                  section_options(
                                    sections[s_uid]['core_type']
                                  ) === 'no_options'
                                ) &&
                                Boolean(
                                  tiles_order[s_uid] &&
                                    tiles_order[s_uid].length ==
                                      section_options(
                                        sections[s_uid]['core_type'],
                                        'max_tiles'
                                      )
                                )
                              "
                              @click="
                                copy_elem({
                                  _to: [`tiles_order:${s_uid}`, 'tiles'],
                                  _after: index,
                                  copy: tiles[t_uid],
                                })
                              "
                            >
                              <FontAwesomeIcon icon="copy" />
                            </button>
                            <SubscriberSetter
                              @onSet="
                                () => {
                                  edited_section_uid = s_uid;
                                  edited_tile_uid = t_uid;
                                }
                              "
                              @on_AssetPass="set_tile"
                              :handyType="{
                                id: 'configs-kit',
                                label: $t('builder.tile'),
                              }"
                              :options="{ config_type: 'tile_configs' }"
                              :defaults="{
                                doc_type: type,
                                section_core_type: sections[s_uid]['core_type'],
                                ...tiles[t_uid],
                                __channels: channels,
                              }"
                              class="section-icon-btn pointer"
                            >
                              <FontAwesomeIcon icon="pen" />
                            </SubscriberSetter>
                            <button
                              class="section-icon-btn section-icon-btn--danger pointer"
                              :aria-label="$t('common.delete')"
                              @click="
                                () => {
                                  tile_confirmation_modal = true;
                                  tile_to_delete = {
                                    tile_uid: t_uid,
                                    section_uid: s_uid,
                                  };
                                }
                              "
                            >
                              <FontAwesomeIcon icon="trash-can" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </template>
                  </BasicSwiper>
                </div>
                <div
                  class="grid grid-col-4 gap-100 bg-basic-200"
                  v-if="section_tiles_details === s_uid"
                >
                  <template
                    v-for="(t_uid, index) in tiles_order[s_uid]"
                    :key="t_uid"
                  >
                    <div v-if="tiles[t_uid] && tiles[t_uid].core_type">
                      <div
                        class="br-50 p-100 bg-basic-300 grid gap-100 b-basic-400"
                      >
                        <div class="">
                          <div class="mb-200">
                            <div class="flex jc-sb ai-st">
                              <div>
                                <p class="fs-200 fw-500 t-basic-600">
                                  {{
                                    formatCoreType(tiles[t_uid]["core_type"])
                                  }}
                                </p>
                                <p
                                  class="fs-100 t-basic-400 pointer mt-50"
                                  @click="copyToClipboard(t_uid)"
                                  :title="t_uid"
                                >
                                  {{ t_uid.substring(0, 8) }}
                                </p>
                              </div>
                            </div>
                          </div>

                          <template
                            v-for="(
                              { prop = null, type = null }, i
                            ) in core_properties"
                          >
                            <div
                              v-if="tiles[t_uid][prop]"
                              class="mb-100 fs-200"
                            >
                              <p
                                class="t-basic-500 fw-600 underline fs-100 mb-50"
                              >
                                {{ props_dictionary[prop] }}:
                              </p>
                              <p v-if="type === 'text'">
                                {{ tiles[t_uid][prop] }}
                              </p>
                              <p
                                v-if="type === 'wysiwyg'"
                                v-html="tiles[t_uid][prop]"
                                class="lc-3 fs-100"
                              ></p>
                              <ImagesControllPreview
                                v-if="type === 'images'"
                                :value="tiles[t_uid][prop]"
                              />
                              <GroupFieldsControllerPreview
                                class=""
                                v-if="type === 'group-fields'"
                                :value="tiles[t_uid][prop]"
                              />
                              <div
                                v-if="type === 'buttons'"
                                class="flex wrap gap-50"
                              >
                                <span
                                  v-for="(link, idx) in tiles[t_uid][prop]"
                                  :key="idx"
                                  class="builder-btn-chip"
                                >
                                  {{ link.link_label || link.link_url || "—" }}
                                </span>
                              </div>
                            </div>
                          </template>
                        </div>

                        <div class="flex jc-fe gap-50 as-fe">
                          <button
                            class="section-icon-btn pointer"
                            :aria-label="$t('common.copy')"
                            :disabled="
                              !Boolean(
                                section_options(
                                  sections[s_uid]['core_type']
                                ) === 'no_options'
                              ) &&
                              Boolean(
                                tiles_order[s_uid] &&
                                  tiles_order[s_uid].length ==
                                    section_options(
                                      sections[s_uid]['core_type'],
                                      'max_tiles'
                                    )
                              )
                            "
                            @click="
                              copy_elem({
                                _to: [`tiles_order:${s_uid}`, 'tiles'],
                                _after: index,
                                copy: tiles[t_uid],
                              })
                            "
                          >
                            <FontAwesomeIcon icon="copy" />
                          </button>
                          <SubscriberSetter
                            @onSet="
                              () => {
                                edited_section_uid = s_uid;
                                edited_tile_uid = t_uid;
                              }
                            "
                            @on_AssetPass="set_tile"
                            :handyType="{
                              id: 'configs-kit',
                              label: $t('builder.tile'),
                            }"
                            :options="{ config_type: 'tile_configs' }"
                            :defaults="{
                              doc_type: type,
                              section_core_type: sections[s_uid]['core_type'],
                              ...tiles[t_uid],
                              __channels: channels,
                            }"
                            class="section-icon-btn pointer"
                          >
                            <FontAwesomeIcon icon="pen" />
                          </SubscriberSetter>
                          <button
                            class="section-icon-btn section-icon-btn--danger pointer"
                            :aria-label="$t('common.delete')"
                            @click="
                              () => {
                                tile_confirmation_modal = true;
                                tile_to_delete = {
                                  tile_uid: t_uid,
                                  section_uid: s_uid,
                                };
                              }
                            "
                          >
                            <FontAwesomeIcon icon="trash-can" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </template>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { cloneDeep } from "lodash";
import { useNotifyStore } from "@/stores/notify";
import { useUserStore } from "@/stores/user";
import { useHandyStore } from "@/stores/handy";
import { v4 as uuidv4 } from "uuid";
import { getCurrentInstance } from "vue";

import { _METHOD_content, GET_ContentTypes } from "@/api/contentDB/api";
import { useContentDBChannelStore } from "@/stores/contentDBChannel";

import { useUnsavedChanges } from "@/composables/useUnsavedChanges";
import UnsavedChangesModal from "@/functionals/Unsaved-changes-modal/index.vue";
import ImagesControllPreview from "@/configs/builder/components/ImagesController/_preview.vue";
import GroupFieldsControllerPreview from "@/configs/builder/components/GroupFieldsController/_preview.vue";
import RenameModal from "@/functionals/Rename-modal/index.vue";
import ConfirmationModal from "@/functionals/Confirmation-modal/index.vue";
import AuthorPicker from "@/views/Authors/AuthorPicker.vue";
import HomeVariantSwitcher from "@/views/Builder/HomeVariantSwitcher.vue";

export default {
  components: {
    UnsavedChangesModal,
    ImagesControllPreview,
    GroupFieldsControllerPreview,
    RenameModal,
    ConfirmationModal,
    AuthorPicker,
    HomeVariantSwitcher,
  },
  beforeRouteLeave(to, from, next) {
    this.guardNavigation(to, from, next);
  },
  setup() {
    const notify = useNotifyStore();
    const userStore = useUserStore();
    const handy = useHandyStore();
    const unsaved = useUnsavedChanges();
    const contentDBChannel = useContentDBChannelStore();
    return { notify, userStore, handy, ...unsaved, contentDBChannel };
  },
  computed: {
    user() {
      return this.userStore.user;
    },
    handyKitOpen() {
      return this.handy.handyType;
    },
    available_channels() {
      return this.contentDBChannel.channels;
    },
    isHomeDoc() {
      return Array.isArray(this.routes) && this.routes.includes("home");
    },
    componentId() {
      return getCurrentInstance()?.uid || "builder-container";
    },
    isSectionLimitReached() {
      return (
        !Boolean(this.section_options(this.type) === "no_options") &&
        Boolean(
          this.sections_order &&
            this.sections_order.length ==
              this.section_options(this.type, "max_sections")
        )
      );
    },
    fabActions() {
      return [
        {
          icon: "plus",
          label: this.$t("builder.new_section"),
          handler: () => this.$refs.newSectionSetter?.$el?.click(),
          disabled: this.isSectionLimitReached,
        },
      ];
    },
  },
  data() {
    return {
      loading: false,
      config_options: null,
      props_dictionary: {},
      core_config: null,
      optional_config: null,
      core_properties: null,
      languages: null,
      // ------------------
      asset: null,
      param: null,

      language: null,
      custom_doc_name: "",
      content_type: null,
      type: null,
      uid: null,
      // -------------------------------
      blog_extension: null,
      // -------------------------------
      attributes: {},
      category: null,
      document_configs: {},
      content: {},
      sections: {},
      sections_order: [],
      tiles: {},
      tiles_order: {},
      access_rights: [],
      channels: [],
      //----------------------
      processing_section: null,
      // ----------------------
      meta: null,
      // ----------------------
      routes: null,
      // ----------------------
      mode: null,
      edited_section_uid: null,
      edited_tile_uid: null,
      section_tiles_details: null,
      //
      advanced_options: false,
      authors: [],
      co_authors: [],
      supportsAuthors: false,
      authorPanelOpen: false,
      rename_modal: false,
      copy_doc_label: "",
      confirmation_modal: false,
      section_to_delete: null,
      tile_confirmation_modal: false,
      tile_to_delete: { tile_uid: null, section_uid: null },
      isScrolled: false,
      _scrollContainer: null,
    };
  },
  methods: {
    formatCoreType(coreType) {
      if (!coreType) return "";
      return coreType
        .replace(/^(section|tile)-/, "")
        .split("-")
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" ");
    },
    tileCountLabel(s_uid) {
      const count = this.tiles_order[s_uid]?.length || 0;
      return `${count} ${count === 1 ? "tile" : "tiles"}`;
    },
    copyToClipboard(text) {
      navigator.clipboard.writeText(text);
      this.notify.spawnNotification({
        title: "Copied",
        msg: text.substring(0, 8) + "...",
        type: "informative",
      });
    },
    tileFirstImage(t_uid) {
      const imageSet = this.tiles[t_uid]?.images_set;
      if (!imageSet) return null;
      const first = Object.values(imageSet)[0];
      const url = first?.image;
      if (!url) return null;
      return url.startsWith("http")
        ? url
        : (process.env.VUE_APP_API_URL || "") + url;
    },
    async load_configs() {
      try {
        const client = process.env.VUE_APP_CLIENT || "__client";

        const [configOptions, coreConfig, optionalConfig, coreProps] =
          await Promise.all([
            import(`@/../${client}/configs/__config_options`),
            import(`@/../${client}/configs/__core_config`),
            import(`@/../${client}/configs/__optional_config`),
            import(`@/../${client}/props/__props`),
          ]);

        this.config_options = configOptions.default;
        this.core_config = coreConfig.default;
        this.optional_config = optionalConfig.default;
        this.core_properties = coreProps.default;

        // Build props dictionary after loading configs
        this.props_dictionary = [
          ...this.optional_config,
          ...this.core_config,
          ...this.core_properties,
        ].reduce((d, { prop = null, label = null }) => {
          const propVal = this.$t("prop." + prop);
          const configVal = this.$t("config." + prop);
          d[prop] =
            propVal !== "prop." + prop
              ? propVal
              : configVal !== "config." + prop
              ? configVal
              : label;
          return d;
        }, {});
      } catch (error) {
        console.error("Failed to load configs:", error);
        this.notify.spawnNotification({
          title: this.$t("notifications.error"),
          msg: this.$t("notifications.config_load_error"),
          type: "negative",
        });
      }
    },
    has_options(NAME) {
      if (!this.core_config || !this.optional_config) return false;
      const configs = [...this.core_config, ...this.optional_config];
      const _options = configs.some(({ _for = null }) => {
        if (!_for) return false;
        if (_for[NAME]) return true;
        return false;
      });
      return _options;
    },
    handleBuilderScroll(e) {
      this.isScrolled = e.target.scrollTop > 200;
    },
    sectionConfigSummary(s_uid) {
      if (!this.core_config || !this.optional_config) return "";
      return (
        [...this.core_config, ...this.optional_config]
          .filter(({ prop }) => this.sections[s_uid]?.[prop])
          .map(
            ({ prop }) =>
              `${this.props_dictionary[prop]}: ${this.sections[s_uid][prop]}`
          )
          .join("\n") || "—"
      );
    },
    section_options(value, look_for = null) {
      if (!this.config_options || !this.config_options[value])
        return "no_options";
      if (look_for) return this.config_options[value][look_for];
      return this.config_options[value];
    },
    set_section({ reset, ...section }) {
      if (reset) {
        this.edited_section_uid = null;
        return;
      }

      delete section["reset"];

      const uid = this.edited_section_uid ?? uuidv4();
      const _sections = { ...this.sections };
      const _sections_order = [...this.sections_order];
      _sections[uid] = section;

      const _index = this.sections_order.indexOf(uid);

      _index === -1
        ? _sections_order.push(uid)
        : _sections_order.splice(_index, 1, uid);

      this.sections = _sections;
      this.sections_order = _sections_order;

      this.edited_section_uid = null;
    },
    copy_elem({ _to = null, _after = null, copy = null }) {
      const uid = uuidv4();
      const _copy = cloneDeep(copy);
      const [order, group] = _to;
      const [context, param] = order.split(":");

      !param
        ? this[context].splice(_after + 1, 0, uid)
        : this[context][param].splice(_after + 1, 0, uid);

      this[group][uid] = _copy;
      // this.sections_order.splice(_after + 1, 0, uid);
      // this[_from][uid] = _copy;
    },
    set_tile(tile, type = "add") {
      const _relared = this.edited_section_uid;
      const uid = this.edited_tile_uid ?? uuidv4();
      const _tiles = { ...this.tiles };
      const _tiles_order = { ...this.tiles_order };

      if (!_tiles_order[_relared]) _tiles_order[_relared] = [];

      const _index = _tiles_order[_relared].indexOf(uid);

      _tiles[uid] = tile;

      _index === -1
        ? _tiles_order[_relared].push(uid)
        : _tiles_order[_relared].splice(_index, 1, uid);

      this.tiles = _tiles;
      this.tiles_order = _tiles_order;

      this.edited_section_uid = null;
      this.edited_tile_uid = null;
    },
    on_delete(uid) {
      const _sections = { ...this.sections };
      let _sections_order = [...this.sections_order];

      delete _sections[uid];
      _sections_order = _sections_order.filter((_uid) => _uid !== uid);

      this.sections = _sections;
      this.sections_order = _sections_order;

      // clear tiles if need
      //const _tiles = { ...this.tiles };
      let _tiles_order = { ...this.tiles_order };

      if (_tiles_order[uid]) {
        const relative_ids = _tiles_order[uid];
        const _tiles = { ...this.tiles };
        relative_ids.forEach((relative_id) => delete _tiles[relative_id]);

        delete _tiles_order[uid];

        this.tiles = _tiles;
        this.tiles_order = _tiles_order;
      }
    },
    on_tile_delete(tile_uid, relation) {
      const _tiles = { ...this.tiles };
      let _tiles_order = [...this.tiles_order[relation]];

      delete _tiles[tile_uid];
      _tiles_order = _tiles_order.filter((_uid) => _uid !== tile_uid);

      this.tiles = _tiles;

      _tiles_order.length
        ? (this.tiles_order[relation] = _tiles_order)
        : delete this.tiles_order[relation];
    },
    async copy_content() {
      this.Modify_content({
        method: "post",
        url: `/${this.content_type}/${this.type}/`,
        payload: {
          attributes: this.attributes,
          category: this.category,
          content: {
            document_configs: this.document_configs,
            sections: this.sections,
            sections_order: this.sections_order,
            tiles: this.tiles,
            tiles_order: this.tiles_order,
          },
          extension: this.blog_extension,
          language: this.language,
          meta: this.meta,
          routes: [],
          name: this.copy_doc_label,
          access_rights: this.access_rights,
          channels: this.channels,
        },
      });
      this.custom_doc_name = this.copy_doc_label;
      this.routes = [];
    },
    getPayload() {
      return {
        attributes: this.attributes,
        category: this.category,
        content: {
          document_configs: this.document_configs,
          sections: this.sections,
          sections_order: this.sections_order,
          tiles: this.tiles,
          tiles_order: this.tiles_order,
        },
        extension: this.blog_extension,
        language: this.language,
        meta: this.meta,
        routes:
          this.content_type !== "layout-extender"
            ? this.routes ?? []
            : [`${this.content_type}-${this.type}`],
        name: this.custom_doc_name,
        access_rights: this.access_rights,
        channels: this.channels,
        ...(this.supportsAuthors
          ? {
              author_uids: this.authors,
              co_author_uids: this.co_authors,
            }
          : {}),
      };
    },
    async validateHomeRules({ channels, exclude_uid } = {}) {
      if (!this.isHomeDoc) return null;
      const ch = channels ?? this.channels ?? [];
      if (ch.length === 0) return this.$t("builder.home_no_channel_error");
      if (ch.length > 1) return this.$t("builder.home_multi_channel_error");
      const channel_idx = ch[0];
      try {
        const { data: response } = await _METHOD_content({
          method: "get",
          url: `/${this.content_type}/${this.type}/`,
          params: { routes: ["home"], channel: channel_idx },
        });
        const list = response?.data || [];
        const exclude = exclude_uid === undefined ? this.uid : exclude_uid;
        const conflict = list.find(
          (d) => d.uid !== exclude && (d.channels || []).includes(channel_idx)
        );
        if (conflict) {
          return this.$t("builder.home_duplicate_error", { channel: channel_idx });
        }
      } catch (error) {
        console.warn("validateHomeRules: API check failed", error);
      }
      return null;
    },
    notifyHomeError(msg) {
      this.notify.spawnNotification({
        type: "negative",
        title: this.$t("notifications.error"),
        msg,
      });
    },
    async saveDraft() {
      const error = await this.validateHomeRules();
      if (error) {
        this.notifyHomeError(error);
        return;
      }
      this.Modify_content({
        method: this.uid ? "put" : "post",
        url: `/${this.content_type}/${this.type}/${
          this.uid ? `${this.uid}/` : ""
        }`,
        payload: this.getPayload(),
      });
    },
    async saveAndPublish() {
      if (!this.uid) return;
      const error = await this.validateHomeRules();
      if (error) {
        this.notifyHomeError(error);
        return;
      }
      await this.Modify_content({
        method: "put",
        url: `/${this.content_type}/${this.type}/${this.uid}/`,
        payload: this.getPayload(),
        silent: true,
      });
      await this.Modify_content({
        method: "post",
        url: `/${this.content_type}/${this.type}/${this.uid}/published/`,
        payload: this.getPayload(),
      });
    },
    async saveAndLeave() {
      await this.saveDraft();
      this.confirmLeave();
    },
    async onHomeVariantSwitch({ channel_idx, target_uid }) {
      if (target_uid) {
        this.$router.push(`/pages/${this.content_type}/${target_uid}`);
        return;
      }
      if (this.isDirty) {
        const ok = window.confirm(
          this.$t("builder.home_create_confirm_dirty", { channel: channel_idx })
        );
        if (!ok) return;
      }
      await this.createHomeForChannel(channel_idx);
    },
    async createHomeForChannel(channel_idx) {
      const error = await this.validateHomeRules({
        channels: [channel_idx],
        exclude_uid: null,
      });
      if (error) {
        this.notifyHomeError(error);
        return;
      }
      const default_lang = (
        this.contentDBChannel.defaultLanguage || "en"
      ).toUpperCase();
      const clone = JSON.parse(
        JSON.stringify({
          attributes: this.attributes ?? {},
          category: this.category ?? null,
          content: {
            document_configs: this.document_configs ?? {},
            sections: this.sections ?? {},
            sections_order: this.sections_order ?? [],
            tiles: this.tiles ?? {},
            tiles_order: this.tiles_order ?? {},
          },
          extension: this.blog_extension ?? null,
          meta: this.meta ?? { title: "Home", description: "" },
          access_rights: this.access_rights?.length ? this.access_rights : [1],
        })
      );
      const payload = {
        ...clone,
        language: this.language || default_lang,
        routes: ["home"],
        name: `Home (${channel_idx})`,
        channels: [channel_idx],
      };
      try {
        const { data: response } = await _METHOD_content({
          method: "post",
          url: `/${this.content_type}/${this.type}/`,
          payload,
        });
        const new_uid = response?.data?.uid;
        if (new_uid) {
          this.notify.spawnNotification({
            type: "informative",
            title: this.$t("notifications.success"),
            msg: this.$t("builder.home_created"),
          });
          this.$router.push(`/pages/${this.content_type}/${new_uid}`);
        }
      } catch (error) {
        this.notify.spawnNotification({
          type: "negative",
          title: this.$t("notifications.error"),
          msg: this.$t("notifications.save_error"),
        });
      }
    },
    snapshotFormState() {
      const state = {
        custom_doc_name: this.custom_doc_name,
        routes: this.routes,
        meta: this.meta,
        category: this.category,
        access_rights: this.access_rights,
        channels: this.channels,
        document_configs: this.document_configs,
        sections: this.sections,
        sections_order: this.sections_order,
        tiles: this.tiles,
        tiles_order: this.tiles_order,
        blog_extension: this.blog_extension,
        attributes: this.attributes,
      };
      this.snapshot(state);
      this.track(state);
    },
    async Modify_content({
      method = "post",
      url = null,
      param = null,
      payload = null,
      silent = false,
      ...options
    }) {
      try {
        const { data: response } = await _METHOD_content({
          method,
          url,
          param,
          payload,
          ...options,
        });

        if (!silent) {
          this.notify.spawnNotification({
            title: this.$t("notifications.success"),
            msg: this.$t("notifications.doc_saved"),
            type: "informative",
          });
        }

        this.$nextTick(() => this.snapshotFormState());

        if (method === "post") {
          const { data = {} } = response;
          const { content = [], uid = null } = data;
          // check if PUBLISH
          const is_publishing = url.split("/").includes("published");
          if (is_publishing) return;
          // -------------------------
          this.uid = uid;
          this.$router.replace({
            name: "Builder",
            params: { type: this.type, uid: uid },
            query: { lg: this.language },
          });
        }
      } catch (error) {
        console.log("Error!", error);
        this.notify.spawnNotification({
          title: this.$t("notifications.error"),
          msg: this.$t("notifications.save_error"),
          type: "negative",
        });
      }
    },
    async GET_content({ url = null, method = "get" }) {
      try {
        const { data: response } = await _METHOD_content({
          method,
          url,
        });
        const { data = null, meta: r_meta = null } = response;

        if (![data, r_meta].every(Boolean)) return;

        const {
          attributes = {},
          category = null,
          content = {},
          meta = null,
          language = this.contentDBChannel.defaultLanguage.toUpperCase(),
          name = null,
          routes = null,
          extension = null,
          access_rights = [],
          channels = [],
          authors: authorsData = [],
          co_authors: coAuthorsData = [],
          content_type: contentTypeSlug = "",
        } = data;
        const {
          document_configs = {},
          sections = {},
          sections_order = [],
          tiles = {},
          tiles_order = {},
        } = content;
        this.attributes = attributes;
        this.document_configs = document_configs;
        this.category = category;
        this.sections = sections;
        this.sections_order = sections_order;
        this.tiles = tiles;
        this.tiles_order = tiles_order;
        this.meta = meta;
        this.routes = routes;
        this.language = language;
        this.custom_doc_name = name;
        this.blog_extension = extension;
        this.access_rights = !access_rights.length ? [1] : access_rights;
        this.channels = channels;
        this.authors = (authorsData || []).map((a) => a.uid);
        this.co_authors = (coAuthorsData || []).map((a) => a.uid);

        // Check if content type supports authors
        try {
          const { data: ctRes } = await GET_ContentTypes({ CDB_TYPE: "content" });
          const cts = ctRes?.data || [];
          const ct = cts.find((t) => t.slug === contentTypeSlug);
          this.supportsAuthors = Boolean(ct && ct.supports_authors);
        } catch {
          this.supportsAuthors = false;
        }
      } catch (error) {
        console.log("error ", error);
      }
    },

    async SET_PREVIEW() {
      let _uid = this.uid;
      // REMOVE ALL OTHER PREVIEWS
      // -----
      // -----
      try {
        const { data: response } = await _METHOD_content({
          method: "get",
          url: `/${this.content_type}/${this.type}/`,
          params: { routes: ["preview"] },
        });
        const { data = [] } = response;
        const _data = data.filter(({ uid }) => uid !== _uid);

        if (Array.isArray(_data) && _data.length) {
          _data.forEach(({ uid = null, routes = [], ...doc }) => {
            // remove PREVIEW ROUTE FROM OTHERS
            // this.Modify_content({
            //   method: "put",
            //   url: `/${this.content_type}/${this.type}/${uid}/`,
            //   payload: {
            //     ...doc,
            //     routes: routes.filter((r) => r !== "preview"),
            //   },
            // });

            _METHOD_content({
              method: "put",
              url: `/${this.content_type}/${this.type}/${uid}/`,
              payload: {
                ...doc,
                routes: routes.filter((r) => r !== "preview"),
              },
            });
            _METHOD_content({
              method: "post",
              url: `/${this.content_type}/${this.type}/${uid}/published/`,
              payload: {
                ...doc,
                routes: routes.filter((r) => r !== "preview"),
              },
            });
            // TODO check if not need to remove from published
          });
        }
      } catch (error) {
        console.log("Error");
        console.log(error);
      }
      // return;
      // SAVE DRAFT
      // -----
      // -----
      try {
        await this.Modify_content({
          method: _uid ? "put" : "post",
          url: `/${this.content_type}/${this.type}/${_uid ? `${_uid}/` : ""}`,
          payload: {
            attributes: this.attributes,
            category: this.category,
            content: {
              sections: this.sections,
              sections_order: this.sections_order,
              tiles: this.tile,
              tiles_order: this.tiles_order,
            },
            extension: this.blog_extension,
            language: this.language,
            meta: this.meta,
            routes: this.routes ? [...this.routes, "preview"] : ["preview"],
            name: this.custom_doc_name,
          },
        });

        this.notify.spawnNotification({
          title: this.$t("notifications.preview_generated"),
          msg: this.$t("notifications.preview_available"),
          type: "positive",
        });
      } catch (error) {
        console.log(error);
        this.notify.spawnNotification({
          title: this.$t("notifications.error"),
          msg: this.$t("notifications.save_error"),
          type: "negative",
        });
      }
      // POST Publish
      try {
        const { data: response } = await _METHOD_content({
          method: "post",
          url: `/${this.content_type}/${this.type}/${this.uid}/published/`,
          payload: {
            attributes: this.attributes,
            category: this.category,
            content: {
              sections: this.sections,
              sections_order: this.sections_order,
              tiles: this.tile,
              tiles_order: this.tiles_order,
            },
            extension: this.blog_extension,
            language: this.language,
            meta: this.meta,
            routes: this.routes ? [...this.routes, "preview"] : ["preview"],
            name: this.custom_doc_name,
          },
        });
      } catch (error) {
        console.log(error);
        this.notify.spawnNotification({
          title: this.$t("notifications.error"),
          msg: this.$t("notifications.save_error"),
          type: "negative",
        });
      }
    },
    async init() {
      const {
        content_type = "content",
        type = "static-page",
        uid = null,
      } = this.$route.params;
      const { lg = null } = this.$route.query;
      this.content_type = content_type;
      this.type = type;
      this.uid = uid;
      this.language = lg ? lg.toUpperCase() : null;
      try {
        this.loading = true;
        // Load configs first
        await this.load_configs();
        await this.contentDBChannel.fetchChannelsAndLanguages();

        // Use store's default language when no ?lg= query param
        if (!this.language) {
          this.language = this.contentDBChannel.defaultLanguage.toUpperCase();
        }

        if (uid) {
          await this.GET_content({
            method: "get",
            url: `/${content_type}/${type}/${uid}/`,
          });
        }

        // await this.GET_languages();
      } catch (error) {
        console.error("Initialization error:", error);
      } finally {
        this.loading = false;
        this.$nextTick(() => this.snapshotFormState());
      }
    },
    scroll_into(id) {
      return scroll_into(id);
    },
  },
  created() {
    this.init();
  },
  mounted() {
    this.$nextTick(() => {
      this._scrollContainer = document.querySelector(
        `#container-${this.componentId}`
      );
      if (this._scrollContainer) {
        this._scrollContainer.addEventListener(
          "scroll",
          this.handleBuilderScroll
        );
      }
    });
  },
  beforeUnmount() {
    if (this._scrollContainer) {
      this._scrollContainer.removeEventListener(
        "scroll",
        this.handleBuilderScroll
      );
    }
  },
};

const scroll_into = (id) => {
  if (!window || !document) return;
  const _elem = document.querySelector(`#${id}`);
  _elem.scroll({
    behavior: "smooth",
    top: 0,
  });
};
</script>

<style lang="scss">
.builder-wrap {
  flex: 1;
  min-height: 0;

  @media screen and (max-width: 40rem) {
    .grid {
      display: flex;
      flex-direction: column;
    }
    .pl-500 {
      padding-left: 16px;
    }
    .pr-500 {
      padding-right: 16px;
    }
  }
}

.sections-options-menu {
  position: sticky;
  top: 0;
  right: 0;
  z-index: 2;
}

[data-theme="dark"] .wysiwyg-container-preview span[style*="color"] {
  color: var(--c-basic-700) !important;
}

.wysiwyg-container-preview {
  line-height: 1.7;

  table {
    table-layout: fixed;
    // border-radius: var(--space-50);
    border: 1px solid var(--c-basic-500);
    // overflow: hidden;
    font-size: var(--fs-100);
    font-weight: normal;

    border: none;
    border-collapse: collapse;
    min-width: 100%;
    // max-width: 100%;
    // white-space: nowrap;
    background-color: var(--c-basic-100);

    td,
    th {
      text-align: center;
      padding: 8px;
    }

    tbody > tr:nth-child(n + 3) {
      display: none;
    }
    tbody tr:first-of-type {
      vertical-align: middle;
    }
    td {
      border-bottom: 1px solid var(--c-basic-300);
      width: 1%;
    }

    th {
      color: var(--editor-table-header-text);
      background: var(--editor-table-header-bg);
    }
    th:nth-child(odd) {
      color: var(--editor-table-header-text);
      background: var(--editor-table-header-bg-alt);
    }
    tr {
      vertical-align: top;
    }
    tr:nth-child(even) {
      background: var(--editor-table-even-row);
    }
  }
}
</style>
<style lang="scss" scoped>
.builder-toolbar-name {
  display: flex;
  flex-direction: column;
  gap: 1px;
  line-height: 1.2;
}
.builder-toolbar-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 5px;
  border: 1px solid var(--c-basic-400);
  background-color: var(--c-basic-100);
  color: var(--c-basic-600);
  font-size: 13px;
  transition: all 0.15s ease;
  &:hover {
    background-color: var(--c-basic-300);
    color: var(--c-basic-800);
  }
}
.builder-tb-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: var(--elem-height);
  padding: 0 14px;
  font-size: var(--fs-200);
  font-family: inherit;
  border-radius: 5px;
  border: 1px solid;
  white-space: nowrap;
  transition: all 0.15s ease;

  &--secondary {
    background: var(--c-basic-100);
    border-color: var(--c-basic-400);
    color: var(--c-basic-700);
    &:hover {
      background: var(--c-basic-200);
    }
  }

  &--primary {
    background: var(--c-support-400);
    border-color: var(--c-support-400);
    color: var(--c-basic-100);
    &:hover {
      filter: brightness(1.08);
    }
  }

  &--disabled {
    opacity: 0.4;
    pointer-events: none;
  }
}
.builder-advanced-row {
  flex-shrink: 0;
  flex-wrap: wrap;
  padding: 12px 50px;
  margin-left: -50px;
  margin-right: -50px;
  border-bottom: 1px solid var(--c-basic-300);
}
.builder-adv-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: var(--elem-height);
  padding: 0 12px;
  font-size: var(--fs-200);
  border-radius: 5px;
  border: 1px solid var(--c-basic-400);
  background: var(--c-basic-200);
  color: var(--c-basic-600);
  white-space: nowrap;
  transition: all 0.15s ease;
  &:hover {
    background: var(--c-basic-300);
    color: var(--c-basic-800);
  }
  &--disabled {
    opacity: 0.4;
    pointer-events: none;
  }
}
.builder-author-panel {
  flex-shrink: 0;
  margin-left: -50px;
  margin-right: -50px;
  border-bottom: 1px solid var(--c-basic-300);
  background: var(--c-basic-100);

  &__header {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 50px;
    font-size: var(--fs-200);
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--c-support-400);
    cursor: pointer;
    user-select: none;
    transition: background-color 0.15s;
    &:hover {
      background: var(--c-basic-200);
    }
  }

  &__chevron {
    margin-left: auto;
    font-size: 12px;
    color: var(--c-basic-500);
  }

  &__count {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 20px;
    height: 20px;
    padding: 0 6px;
    font-size: 11px;
    font-weight: 700;
    border-radius: 50px;
    background: var(--c-support-100);
    color: var(--c-support-400);
  }

  &__body {
    display: flex;
    gap: var(--space-400);
    flex-wrap: wrap;
    padding: 16px 50px;
    border-top: 1px solid var(--c-basic-200);
  }

  @media only screen and (max-width: 768px) {
    &__body {
      gap: var(--space-200);
    }
  }
}

.section-icon-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 5px;
  border: 1px solid var(--c-basic-400);
  background-color: var(--c-basic-100);
  color: var(--c-basic-600);
  font-size: 13px;
  transition: all 0.15s ease;
  &:hover {
    background-color: var(--c-basic-300);
    color: var(--c-basic-800);
  }
  &--primary {
    background-color: var(--c-support-400);
    border-color: var(--c-support-400);
    color: var(--c-basic-100);
    &:hover {
      filter: brightness(1.1);
    }
  }
  &--danger {
    &:hover {
      color: var(--c-negative-200);
      border-color: var(--c-negative-200);
      background-color: var(--c-basic-100);
    }
  }
  &:disabled {
    opacity: 0.35;
    pointer-events: none;
  }
}
.builder-fab-stack {
  position: fixed;
  bottom: 2rem;
  right: 2rem;
  z-index: 90;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.75rem;
}
.builder-fab-stack :deep(.floating-actions) {
  position: static;
}
.builder-fab-aux {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
}
.section-title-wrap {
  min-width: 0;
}
.builder-btn-chip {
  display: inline-flex;
  align-items: center;
  height: 22px;
  padding: 0 8px;
  border-radius: 11px;
  border: 1px solid var(--c-basic-400);
  background: var(--c-basic-100);
  color: var(--c-basic-600);
  font-size: var(--fs-100);
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.tile-card-thumb {
  max-width: 100%;
  &__img {
    display: block;
    height: 40px;
    max-width: 100%;
    object-fit: cover;
    border-radius: 3px;
  }
}
.builder-fab-aux__btn {
  width: 38px;
  height: 38px;
  border-radius: 50%;
  border: 1px solid var(--c-basic-400);
  background-color: var(--c-basic-100);
  color: var(--c-basic-600);
  font-size: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: var(--shadow-sm);
  transition: all 0.15s ease;
  &:hover {
    background-color: var(--c-basic-200);
    color: var(--c-basic-800);
  }
}
@media only screen and (max-width: 768px) {
  .builder-tb-btn__label {
    display: none;
  }
  .builder-tb-btn {
    padding: 0;
    width: 32px;
    height: 32px;
    justify-content: center;
  }
  .section-icon-btn {
    width: 36px;
    height: 36px;
  }
  .builder-fab-stack {
    bottom: calc(var(--bottom-bar-height) + 1rem);
    right: 1rem;
  }
  .section-header-row {
    flex-direction: column;
    gap: 4px;
  }
  .section-title-wrap {
    width: 100%;
    min-width: unset;
  }
  .section-title {
    font-size: var(--fs-200);
    font-weight: 600;
    word-break: break-word;
  }
  .section-actions {
    gap: 4px;
    flex-shrink: 0;
    align-self: flex-start;
  }
  .section-uid {
    display: none;
  }
  .builder-adv-btn {
    font-size: 0;
    padding: 0;
    width: 32px;
    height: 32px;
    justify-content: center;
    :deep(svg) {
      font-size: var(--fs-300);
    }
  }
  .tiles-header {
    flex-wrap: wrap;
    gap: 8px;
  }
  .tile-swiper-wrap {
    width: 100%;
    max-width: 100%;
    box-sizing: border-box;
  }
  .tile-swiper-wrap :deep(.swiper) {
    max-width: 100%;
  }
}
</style>
