<template>
  <div class="feature-set-edit fs-300 t-basic-800 h-100 ov-h flex">
    <Teleport to="#pim-toolbar-left" defer>
      <BasicButton
        text=""
        icon="arrow-left"
        class="bg-basic-200 t-basic-600"
        @click="$router.push('/pim/feature-sets')"
      />
    </Teleport>
    <Teleport to="#pim-toolbar-right" defer>
      <span v-if="isDirty" class="chip bg-warning-100 t-warning-300">
        {{ $t("unsaved.changes") }}
      </span>
      <BasicButton
        text=""
        icon="trash-can"
        class="bg-negative-100 t-negative-300"
        @click="showDeleteConfirm = true"
      />
      <BasicButton
        :text="$t('pim.save_set_config')"
        class="bg-support-400 t-basic-100"
        @click="save"
      />
    </Teleport>
    <div class="flex-1 ovy-auto p-500">
      <div class="bg-basic-100 b-basic-300 br-50 p-500">
        <!-- Set identity -->
        <div class="set-identity mb-400">
          <span class="fs-200 t-support-400 fw-600 tt-upper">{{
            $t("pim.currently_editing")
          }}</span>
          <div class="flex ai-ct gap-200 mt-200">
            <Dropdown
              :values="allSetOptions"
              :selected="[featureSetIdx]"
              :placeholder="form.name || featureSetIdx"
              class="flex-1"
              @onSelect="onSwitchSet"
            />
          </div>
          <p v-if="form.desc" class="t-basic-500 fs-200 mt-200">
            {{ form.desc }}
          </p>
        </div>
        <Loader v-if="loading" />

        <template v-else>
          <!-- Set properties -->
          <div class="flex gap-300 mb-400">
            <BasicInput
              v-model="form.name"
              :label="$t('pim.name')"
              class="flex-1"
            />
            <FormField
              :label="$t('pim.internal_desc_label')"
              :tooltip="$t('pim.internal_desc_tooltip')"
              class="flex-1"
            >
              <BasicInput v-model="form.desc" />
            </FormField>
            <div class="flex ai-ct gap-100">
              <Switcher
                :label="$t('pim.is_default')"
                :selected="form.is_default"
                @onSelect="onToggleDefault"
              />
            </div>
          </div>

          <!-- Toolbar -->
          <div class="flex ai-ct gap-200 mb-400">
            <BasicInput
              v-model="featureSearch"
              :placeholder="$t('common.start_typing')"
              icon="search"
              class="flex-1"
            />
            <BasicButton
              :text="$t('pim.add_attribute_group')"
              class="bg-basic-200 t-basic-600"
              @click="showAddGroup = true"
            />
          </div>

          <!-- Inline group creation -->
          <div v-if="showAddGroup" class="add-group-panel br-50 p-300 mb-400">
            <div class="flex ai-ct gap-200">
              <BasicInput
                v-model="newGroupName"
                :placeholder="$t('pim.group_name_placeholder')"
                class="flex-1"
                @keydown.enter="createGroup"
              />
              <BasicButton
                :text="$t('pim.create_group')"
                class="bg-support-400 t-basic-100"
                @click="createGroup"
              />
              <BasicButton
                text=""
                icon="xmark"
                class="bg-basic-200 t-basic-600"
                @click="
                  showAddGroup = false;
                  newGroupName = '';
                "
              />
            </div>
            <div v-if="availableGroupOptions.length" class="mt-200">
              <span class="fs-200 t-basic-500">{{
                $t("pim.or_add_existing")
              }}</span>
              <div class="flex gap-100 mt-100" style="flex-wrap: wrap">
                <span
                  v-for="opt in availableGroupOptions"
                  :key="opt.value"
                  class="chip bg-basic-200 t-basic-700"
                  style="cursor: pointer"
                  @click="onSelectGroup(opt.value)"
                >
                  + {{ opt.label }}
                </span>
              </div>
            </div>
          </div>

          <!-- Default group (ungrouped features) -->
          <div class="feature-group mb-400">
            <div
              class="feature-group__header bg-basic-200 t-basic-700 flex ai-ct jc-sb"
            >
              <div class="flex ai-ct gap-200">
                <span
                  class="collapse-chevron"
                  :class="{ 'is-collapsed': isCollapsed('__default') }"
                  @click="toggleCollapse('__default')"
                  >&#x25BC;</span
                >
                <span class="fw-600">{{ $t("pim.default_group") }}</span>
                <span
                  class="chip chip--pill bg-basic-200 t-basic-600"
                  >{{
                    $t("pim.attributes_in_group", {
                      count: ungroupedFeatures.length,
                    })
                  }}</span
                >
              </div>
            </div>
            <div v-show="!isCollapsed('__default')">
              <draggable
                v-model="ungroupedFeatures"
                group="features"
                ghost-class="bg-support-100"
                :force-fallback="true"
                fallback-class="drag-ghost"
                :item-key="(el) => el.feature_idx"
                @change="(evt) => onGroupChange(evt, null)"
              >
                <template #item="{ element }">
                  <div
                    v-if="matchesSearch(element)"
                    class="feature-row flex ai-ct jc-sb"
                  >
                    <div class="flex ai-ct gap-200">
                      <span class="drag-handle t-basic-400 cursor-grab"
                        >&#x2630;</span
                      >
                      <span class="fw-500">{{
                        element.feature_name || element.feature_idx
                      }}</span>
                      <TypeBadge :feature-type="element.feature_type" />
                    </div>
                    <div class="flex ai-ct gap-100">
                      <BasicButton
                        text=""
                        icon="pen"
                        class="bg-basic-200 t-basic-600"
                        @click="
                          $router.push(`/pim/features/${element.feature_idx}`)
                        "
                      />
                      <BasicButton
                        text=""
                        icon="xmark"
                        class="bg-negative-100 t-negative-300"
                        @click="removeFeature(element.feature_idx)"
                      />
                    </div>
                  </div>
                </template>
              </draggable>
              <div
                v-if="!ungroupedFeatures.length"
                class="t-basic-500 fs-200 p-300"
              >
                {{ $t("pim.drag_to_add") }}
              </div>
            </div>
          </div>

          <!-- Named groups (drag to reorder) -->
          <draggable
            v-model="groups"
            ghost-class="bg-support-100"
            handle=".group-drag-handle"
            :item-key="(el) => el.idx"
          >
            <template #item="{ element: group }">
              <div class="feature-group mb-400">
                <div
                  class="feature-group__header bg-basic-200 t-basic-700 flex ai-ct jc-sb"
                >
                  <div class="flex ai-ct gap-200">
                    <span class="group-drag-handle t-basic-400">&#x2630;</span>
                    <span
                      class="collapse-chevron"
                      :class="{ 'is-collapsed': isCollapsed(group.idx) }"
                      @click="toggleCollapse(group.idx)"
                      >&#x25BC;</span
                    >
                    <span
                      v-if="renamingGroupIdx !== group.idx"
                      class="fw-600"
                      >{{ group.name || group.idx }}</span
                    >
                    <BasicInput
                      v-else
                      :model-value="group.name"
                      class="rename-input"
                      @update:model-value="(val) => (group.name = val)"
                      @blur="finishRename(group)"
                      @keydown.enter="finishRename(group)"
                    />
                    <span
                      class="chip chip--pill bg-basic-200 t-basic-600"
                      >{{
                        $t("pim.attributes_in_group", {
                          count: group.features.length,
                        })
                      }}</span
                    >
                  </div>
                  <div class="pim-kebab">
                    <button
                      class="pim-kebab__btn"
                      @click.stop="toggleGroupMenu(group.idx)"
                    >
                      &#x22EE;
                    </button>
                    <div
                      v-if="activeGroupMenu === group.idx"
                      class="pim-kebab__menu"
                    >
                      <div class="pim-kebab__item" @click="startRename(group)">
                        {{ $t("pim.rename") }}
                      </div>
                      <div
                        class="pim-kebab__item t-negative-300"
                        @click="
                          removeGroup(group.idx);
                          activeGroupMenu = null;
                        "
                      >
                        {{ $t("pim.remove") }}
                      </div>
                    </div>
                  </div>
                </div>
                <div v-show="!isCollapsed(group.idx)">
                  <draggable
                    v-model="group.features"
                    group="features"
                    ghost-class="bg-support-100"
                    :force-fallback="true"
                    fallback-class="drag-ghost"
                    :item-key="(el) => el.feature_idx"
                    @change="(evt) => onGroupChange(evt, group.idx)"
                  >
                    <template #item="{ element }">
                      <div
                        v-if="matchesSearch(element)"
                        class="feature-row flex ai-ct jc-sb"
                      >
                        <div class="flex ai-ct gap-200">
                          <span class="drag-handle t-basic-400 cursor-grab"
                            >&#x2630;</span
                          >
                          <span class="fw-500">{{
                            element.feature_name || element.feature_idx
                          }}</span>
                          <TypeBadge :feature-type="element.feature_type" />
                        </div>
                        <div class="flex ai-ct gap-100">
                          <BasicButton
                            text=""
                            icon="pen"
                            class="bg-basic-200 t-basic-600"
                            @click="
                              $router.push(
                                `/pim/features/${element.feature_idx}`
                              )
                            "
                          />
                          <BasicButton
                            text=""
                            icon="xmark"
                            class="bg-negative-100 t-negative-300"
                            @click="removeFeature(element.feature_idx)"
                          />
                        </div>
                      </div>
                    </template>
                  </draggable>
                  <div
                    v-if="!group.features.length"
                    class="t-basic-500 fs-200 p-300"
                  >
                    {{ $t("pim.drag_to_add") }}
                  </div>
                </div>
              </div>
            </template>
          </draggable>
        </template>

        <!-- Default change confirmation -->
        <Confirmation-modal
          :visible="showDefaultConfirm"
          @accept="confirmDefaultChange"
          @reject="showDefaultConfirm = false"
        >
          <template #description>
            <p>{{ defaultConfirmMessage }}</p>
          </template>
          <template #footer>
            <button
              class="modal-btn modal-btn--secondary"
              @click="showDefaultConfirm = false"
            >
              {{ $t("common.cancel") }}
            </button>
            <button
              class="modal-btn modal-btn--confirm"
              @click="confirmDefaultChange"
            >
              {{ $t("common.confirm") }}
            </button>
          </template>
        </Confirmation-modal>

        <!-- Delete confirmation -->
        <Confirmation-modal
          :visible="showDeleteConfirm"
          @accept="deleteSet"
          @reject="showDeleteConfirm = false"
        >
          <template #description>
            <p>{{ $t("pim.confirm_delete_feature_set") }}</p>
          </template>
        </Confirmation-modal>

        <!-- Unsaved changes modal -->
        <UnsavedChangesModal
          :visible="!!pendingNav"
          @save="saveAndLeave"
          @discard="confirmLeave"
          @stay="cancelLeave"
        />

        <!-- Add group modal removed — inline creation panel used instead -->
      </div>
    </div>

    <!-- Attribute Library sidebar (full height, right edge) -->
    <SideDrawer
      :visible="true"
      mode="sticky"
      :title="$t('pim.attribute_library')"
      :closable="false"
    >
      <AttributeLibrary
        ref="library"
        :feature-set-idx="featureSetIdx"
        :visible="true"
        @remove-feature="removeFeatureViaDrag"
      />
    </SideDrawer>
  </div>
</template>

<script>
import { inject, onMounted, onBeforeUnmount, nextTick } from "vue";
import { useLoaderStore } from "@/stores/loader";
import { useNotifyStore } from "@/stores/notify";
import { useUnsavedChanges } from "@/composables/useUnsavedChanges";
import draggable from "vuedraggable";
import {
  GET_FeatureSetGlobal,
  GET_FeatureSetsGlobal,
  PATCH_FeatureSet,
  DELETE_FeatureSet,
  GET_FeatureSetFeaturesGlobal,
  POST_FeatureSetFeatures,
  DELETE_FeatureSetFeatures,
  PATCH_FeatureSetFeaturesReorder,
  GET_AttributesGroups,
  POST_AttributesGroup,
  PATCH_AttributesGroup,
} from "@/api/pim/api";
import { featureTypeLabel } from "./helpers/pimEnums";
import AttributeLibrary from "./components/AttributeLibrary.vue";
import TypeBadge from "./components/TypeBadge.vue";
import ConfirmationModal from "@/functionals/Confirmation-modal/index.vue";
import UnsavedChangesModal from "@/functionals/Unsaved-changes-modal/index.vue";
import { extractApiMessage } from "@/composables/useFormErrors";

export default {
  name: "FeatureSetEdit",
  components: {
    draggable,
    AttributeLibrary,
    TypeBadge,
    ConfirmationModal,
    UnsavedChangesModal,
  },
  setup() {
    const loader = useLoaderStore();
    const notify = useNotifyStore();
    const unsaved = useUnsavedChanges();
    const isGlobalScope = inject("isGlobalScope", null);
    onMounted(() => {
      nextTick(() => {
        if (isGlobalScope) isGlobalScope.value = true;
      });
    });
    onBeforeUnmount(() => {
      if (isGlobalScope) isGlobalScope.value = false;
    });
    return { loader, notify, ...unsaved };
  },
  data() {
    return {
      form: { name: "", desc: "", is_default: false, idx: "" },
      featuresInSet: [],
      allGroups: [],
      allSets: [],
      loading: false,
      showDeleteConfirm: false,
      showDefaultConfirm: false,
      showAddGroup: false,
      ungroupedFeatures: [],
      groups: [],
      featureSearch: "",
      activeGroupMenu: null,
      renamingGroupIdx: null,
      newGroupName: "",
      collapsedGroups: [],
    };
  },
  computed: {
    featureSetIdx() {
      return this.$route.params.idx;
    },
    usedGroupIdxs() {
      return this.groups.map((g) => g.idx);
    },
    availableGroupOptions() {
      return this.allGroups
        .filter((g) => !this.usedGroupIdxs.includes(g.idx))
        .map((g) => ({ label: g.name || g.idx, value: g.idx }));
    },
    allSetOptions() {
      return this.allSets.map((s) => ({
        label: s.name || s.idx,
        value: s.idx,
      }));
    },
    currentDefaultSet() {
      return this.allSets.find(
        (s) => s.is_default && s.idx !== this.featureSetIdx
      );
    },
    defaultConfirmMessage() {
      if (this.form.is_default && this.currentDefaultSet) {
        // Turning ON — warn about demoting the other set
        return this.$t("pim.confirm_set_default", {
          name: this.currentDefaultSet.name || this.currentDefaultSet.idx,
        });
      }
      // Turning OFF
      return this.$t("pim.confirm_unset_default");
    },
    filteredUngrouped() {
      if (!this.featureSearch) return this.ungroupedFeatures;
      return this.ungroupedFeatures.filter((f) => this.matchesSearch(f));
    },
  },
  watch: {
    "$route.params.idx"() {
      this.fetchData();
    },
  },
  beforeRouteLeave(to, from, next) {
    this.guardNavigation(to, from, next);
  },
  mounted() {
    this.fetchData();
    this.fetchAllSets();
  },
  methods: {
    featureTypeLabel,
    async saveAndLeave() {
      await this.save();
      this.confirmLeave();
    },
    onToggleDefault() {
      if (!this.form.is_default && this.currentDefaultSet) {
        // About to become default — warn that another set will lose default
        this.showDefaultConfirm = true;
      } else if (this.form.is_default) {
        // About to turn off default — confirm
        this.showDefaultConfirm = true;
      } else {
        // No other default exists — just toggle
        this.form.is_default = true;
      }
    },
    confirmDefaultChange() {
      this.showDefaultConfirm = false;
      this.form.is_default = !this.form.is_default;
    },
    matchesSearch(feature) {
      if (!this.featureSearch) return true;
      const q = this.featureSearch.toLowerCase();
      return (
        (feature.feature_name || "").toLowerCase().includes(q) ||
        (feature.feature_idx || "").toLowerCase().includes(q)
      );
    },
    filteredGroupFeatures(group) {
      if (!this.featureSearch) return group.features;
      return group.features.filter((f) => this.matchesSearch(f));
    },
    toggleGroupMenu(groupIdx) {
      this.activeGroupMenu =
        this.activeGroupMenu === groupIdx ? null : groupIdx;
    },
    startRename(group) {
      this._oldGroupName = group.name;
      this.renamingGroupIdx = group.idx;
      this.activeGroupMenu = null;
    },
    async finishRename(group) {
      this.renamingGroupIdx = null;
      if (group.name === this._oldGroupName) return;
      const lang = this.$i18n?.locale?.toLowerCase() || "en";
      try {
        const name_t9n = { ...group.name_t9n, [lang]: group.name };
        await PATCH_AttributesGroup(group.idx, { name_t9n });
        group.name_t9n = name_t9n;
        this.notify.spawnNotification({
          type: "positive",
          msg: this.$t("pim.group_renamed"),
        });
      } catch (err) {
        group.name = this._oldGroupName;
        this.notify.spawnNotification({
          type: "negative",
          msg: extractApiMessage(err, this.$t("notifications.error")),
        });
      }
    },
    async createGroup() {
      const name = this.newGroupName.trim();
      if (!name) return;
      const idx = name
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[^\w\s-]/g, "")
        .replace(/[\s_]+/g, "-")
        .replace(/^-+|-+$/g, "");
      if (!idx) return;
      const lang = this.$i18n?.locale?.toLowerCase() || "en";
      try {
        const { data } = await POST_AttributesGroup({
          idx,
          name_t9n: { [lang]: name },
        });
        this.groups.push({
          idx: data.idx,
          name,
          name_t9n: data.name_t9n || { [lang]: name },
          features: [],
        });
        this.allGroups.push(data);
        this.newGroupName = "";
        this.showAddGroup = false;
        this.notify.spawnNotification({
          type: "positive",
          msg: this.$t("pim.group_created"),
        });
      } catch (err) {
        this.notify.spawnNotification({
          type: "negative",
          msg: extractApiMessage(err, this.$t("notifications.error")),
        });
      }
    },
    toggleCollapse(groupIdx) {
      const idx = this.collapsedGroups.indexOf(groupIdx);
      if (idx >= 0) {
        this.collapsedGroups.splice(idx, 1);
      } else {
        this.collapsedGroups.push(groupIdx);
      }
    },
    isCollapsed(groupIdx) {
      return this.collapsedGroups.includes(groupIdx);
    },
    onSwitchSet(val) {
      this.$router.push(`/pim/feature-sets/${val}`);
    },
    async fetchAllSets() {
      try {
        const { data } = await GET_FeatureSetsGlobal({ page_size: 100 });
        this.allSets = data.results || data || [];
      } catch {
        // non-critical, silently ignore
      }
    },
    async fetchData({ silent = false } = {}) {
      if (!silent) this.loading = true;
      try {
        const [setRes, featRes, groupsRes] = await Promise.all([
          GET_FeatureSetGlobal(this.featureSetIdx),
          GET_FeatureSetFeaturesGlobal(this.featureSetIdx),
          GET_AttributesGroups(),
        ]);
        this.form = {
          name: setRes.data.name || "",
          desc: setRes.data.desc || "",
          is_default: setRes.data.is_default || false,
          idx: setRes.data.idx,
        };
        this.snapshot(this.form);
        this.track(this.form);
        this.featuresInSet = featRes.data.results || featRes.data || [];
        this.allGroups = groupsRes.data.results || groupsRes.data || [];
        this.buildGroups();
      } catch (err) {
        this.notify.spawnNotification({
          type: "negative",
          msg: extractApiMessage(err, this.$t("notifications.error")),
        });
      } finally {
        if (!silent) this.loading = false;
      }
    },
    buildGroups() {
      const ungrouped = [];
      const grouped = {};

      for (const f of this.featuresInSet) {
        // Flatten nested feature object for template access
        const flat = {
          ...f,
          feature_idx: f.feature?.idx || f.feature_idx,
          feature_name: f.feature?.name || f.feature_name,
          feature_type: f.feature?.feature_type ?? f.feature_type,
        };
        const gIdx = flat.attributes_group_idx;
        if (!gIdx) {
          ungrouped.push(flat);
        } else {
          if (!grouped[gIdx]) {
            const grp = this.allGroups.find((g) => g.idx === gIdx);
            grouped[gIdx] = {
              idx: gIdx,
              name: flat.attributes_group_name || (grp && grp.name) || gIdx,
              name_t9n: grp?.name_t9n || {},
              features: [],
            };
          }
          grouped[gIdx].features.push(flat);
        }
      }

      ungrouped.sort((a, b) => (a.position || 0) - (b.position || 0));
      for (const g of Object.values(grouped)) {
        g.features.sort((a, b) => (a.position || 0) - (b.position || 0));
      }

      this.ungroupedFeatures = ungrouped;

      // Preserve empty groups that were added by the user but have no features yet
      const prevGroupIdxs = this.groups.map((g) => g.idx);
      const builtGroups = Object.values(grouped);
      const builtIdxs = new Set(builtGroups.map((g) => g.idx));
      for (const idx of prevGroupIdxs) {
        if (!builtIdxs.has(idx)) {
          const grp = this.allGroups.find((g) => g.idx === idx);
          if (grp) {
            builtGroups.push({
              idx,
              name: grp.name || idx,
              name_t9n: grp.name_t9n || {},
              features: [],
            });
          }
        }
      }
      this.groups = builtGroups;
    },
    async save() {
      this.loader.loaderStart();
      try {
        await PATCH_FeatureSet(this.featureSetIdx, {
          name: this.form.name,
          desc: this.form.desc,
          is_default: this.form.is_default,
        });
        await this.saveReorder();
        this.snapshot(this.form);
        this.notify.spawnNotification({
          type: "positive",
          msg: this.$t("pim.feature_set_saved"),
        });
      } catch (err) {
        this.notify.spawnNotification({
          type: "negative",
          msg: extractApiMessage(err, this.$t("notifications.error")),
        });
      } finally {
        this.loader.loaderFinish();
      }
    },
    async saveReorder() {
      const features = [];
      let position = 100;

      for (const f of this.ungroupedFeatures) {
        features.push({
          feature_idx: f.feature_idx,
          position,
          attributes_group_idx: null,
        });
        position += 100;
      }
      for (const g of this.groups) {
        for (const f of g.features) {
          features.push({
            feature_idx: f.feature_idx,
            position,
            attributes_group_idx: g.idx,
          });
          position += 100;
        }
      }

      if (features.length) {
        await PATCH_FeatureSetFeaturesReorder(this.featureSetIdx, { features });
      }
    },
    async onGroupChange(evt, groupIdx) {
      if (!evt.added) return;
      const el = evt.added.element;
      if (!el._from_library) return;
      // Item dragged from library — add to set, save positions, refresh
      try {
        await POST_FeatureSetFeatures(this.featureSetIdx, {
          features: [
            {
              feature_idx: el.feature_idx,
              position: (this.featuresInSet.length + 1) * 100,
            },
          ],
        });
        await this.saveReorder();
        this.notify.spawnNotification({
          type: "positive",
          msg: this.$t("pim.feature_added_to_set"),
        });
        await this.fetchData({ silent: true });
        this.$refs.library?.fetchFeatures();
      } catch (err) {
        this.notify.spawnNotification({
          type: "negative",
          msg: extractApiMessage(err, this.$t("notifications.error")),
        });
        await this.fetchData({ silent: true });
        this.$refs.library?.fetchFeatures();
      }
    },
    async removeFeatureViaDrag(featureIdx) {
      try {
        await DELETE_FeatureSetFeatures(this.featureSetIdx, {
          feature_idxs: [featureIdx],
        });
        this.notify.spawnNotification({
          type: "positive",
          msg: this.$t("pim.feature_removed_from_set"),
        });
        await this.fetchData({ silent: true });
        this.$refs.library?.fetchFeatures();
      } catch (err) {
        this.notify.spawnNotification({
          type: "negative",
          msg: extractApiMessage(err, this.$t("notifications.error")),
        });
        await this.fetchData({ silent: true });
        this.$refs.library?.fetchFeatures();
      }
    },
    async removeFeature(featureIdx) {
      this.loader.loaderStart();
      try {
        await DELETE_FeatureSetFeatures(this.featureSetIdx, {
          feature_idxs: [featureIdx],
        });
        await this.fetchData({ silent: true });
        this.$refs.library?.fetchFeatures();
      } catch (err) {
        this.notify.spawnNotification({
          type: "negative",
          msg: extractApiMessage(err, this.$t("notifications.error")),
        });
      } finally {
        this.loader.loaderFinish();
      }
    },
    onSelectGroup(val) {
      const grp = this.allGroups.find((g) => g.idx === val);
      this.groups.push({
        idx: val,
        name: (grp && grp.name) || val,
        name_t9n: grp?.name_t9n || {},
        features: [],
      });
      this.showAddGroup = false;
    },
    removeGroup(groupIdx) {
      const group = this.groups.find((g) => g.idx === groupIdx);
      if (group) {
        this.ungroupedFeatures.push(...group.features);
      }
      this.groups = this.groups.filter((g) => g.idx !== groupIdx);
    },
    async deleteSet() {
      this.showDeleteConfirm = false;
      this.loader.loaderStart();
      try {
        await DELETE_FeatureSet(this.featureSetIdx);
        this.notify.spawnNotification({
          type: "positive",
          msg: this.$t("pim.feature_set_deleted"),
        });
        this.$router.push("/pim/feature-sets");
      } catch (err) {
        this.notify.spawnNotification({
          type: "negative",
          msg: extractApiMessage(err, this.$t("notifications.error")),
        });
      } finally {
        this.loader.loaderFinish();
      }
    },
  },
};
</script>

<style lang="scss" scoped>
.set-identity {
  border-left: 3px solid var(--c-support-400);
  padding-left: var(--space-300);
  padding-top: var(--space-200);
  padding-bottom: var(--space-200);
}
.feature-group {
  border: 1px solid var(--c-basic-300);
  border-radius: 8px;
  overflow: hidden;
}
.feature-group__header {
  padding: 10px 16px;
  user-select: none;
}
.feature-row {
  padding: 12px var(--space-200);
  border-top: 1px solid var(--c-basic-200);
  transition: background 0.15s;
  cursor: grab;
  user-select: none;
  &:hover {
    background: var(--c-basic-200);
  }
  :deep(button),
  :deep(.basic-button) {
    cursor: pointer;
  }
}
.drag-handle {
  cursor: grab;
  user-select: none;
  font-size: var(--fs-300);
}
.cursor-grab {
  cursor: grab;
}
.collapse-chevron {
  cursor: pointer;
  transition: transform 0.2s;
  font-size: 10px;
  user-select: none;
  &.is-collapsed {
    transform: rotate(-90deg);
  }
}
.group-drag-handle {
  cursor: grab;
  user-select: none;
  font-size: var(--fs-300);
}
.add-group-panel {
  border: 1px dashed var(--c-basic-300);
}
.modal-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 36px;
  padding: 0 16px;
  font-size: 13px;
  font-weight: 500;
  font-family: inherit;
  border-radius: 5px;
  border: 1px solid;
  cursor: pointer;
}
.modal-btn--secondary {
  background: var(--c-basic-100);
  border-color: var(--c-basic-400);
  color: var(--c-basic-700);
}
.modal-btn--confirm {
  background: var(--c-support-400);
  border-color: var(--c-support-400);
  color: var(--c-basic-100);
}
.rename-input {
  max-width: 200px;
}
.pim-kebab {
  position: relative;
  .pim-kebab__btn {
    background: none;
    border: none;
    cursor: pointer;
    padding: 4px 8px;
    font-size: 16px;
    color: var(--c-basic-500);
    &:hover {
      color: var(--c-basic-700);
    }
  }
  .pim-kebab__menu {
    position: absolute;
    right: 0;
    top: 100%;
    background: var(--c-basic-100);
    border: 1px solid var(--c-basic-300);
    border-radius: 6px;
    box-shadow: var(--shadow-md);
    z-index: 10;
    min-width: 140px;
    .pim-kebab__item {
      padding: 8px 14px;
      cursor: pointer;
      font-size: var(--fs-300);
      &:hover {
        background: var(--c-basic-200);
      }
      &:first-child {
        border-radius: 6px 6px 0 0;
      }
      &:last-child {
        border-radius: 0 0 6px 6px;
      }
    }
  }
}
.tt-upper {
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

@media only screen and (max-width: 768px) {
  .feature-set-edit {
    flex-direction: column;
    overflow-y: auto !important;
    overflow-x: hidden !important;

    > .flex-1 {
      overflow: visible !important;
      flex: none !important;
    }

    :deep(.side-drawer-sticky) {
      width: 100% !important;
      min-width: 100% !important;
      flex: none !important;
      overflow: visible !important;
      border-left: none;
      border-top: 1px solid var(--c-basic-300);
    }
  }
}
</style>

<style lang="scss">
/* Global (unscoped) — SortableJS clones are appended to <body>, unreachable by scoped styles */
.drag-ghost {
  opacity: 0.9;
  background: var(--c-basic-100);
  border: 1px solid var(--c-support-400);
  border-radius: 6px;
  box-shadow: var(--shadow-md);
  padding: 12px var(--space-200);
}
</style>
