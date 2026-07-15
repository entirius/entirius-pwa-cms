<template>
  <div
    v-if="loaded"
    class="quality-settings bg-basic-100 br-50"
    data-test="quality-settings-card"
  >
    <h2 class="fs-400 fw-600 mb-300">{{ $t("pim.quality_settings") }}</h2>

    <div class="quality-settings__row">
      <FormField
        :label="$t('pim.gaps_skip_default_label')"
        :tooltip="$t('pim.gaps_skip_default_tooltip')"
      >
        <Switcher
          :selected="settings.gaps_skip_default_featureset"
          :prevent="saving"
          data-test="skip-default-switcher"
          @onSelect="toggleSkipDefault"
        />
      </FormField>

      <FormField
        v-if="allSets.length"
        :label="$t('pim.default_feature_set')"
        :tooltip="$t('pim.default_feature_set_tooltip')"
        class="quality-settings__picker"
      >
        <Dropdown
          :values="setOptions"
          :selected="currentDefaultIdx ? [currentDefaultIdx] : []"
          :placeholder="$t('pim.default_feature_set')"
          data-test="default-set-picker"
          @onSelect="onPickDefault"
        />
      </FormField>
    </div>

    <Confirmation-modal
      :visible="pendingDefaultIdx != null"
      @accept="confirmDefaultChange"
      @reject="pendingDefaultIdx = null"
    >
      <template #description>
        <p>{{ defaultConfirmMessage }}</p>
      </template>
      <template #footer>
        <button
          class="modal-btn modal-btn--secondary"
          @click="pendingDefaultIdx = null"
        >
          {{ $t("common.cancel") }}
        </button>
        <button class="modal-btn modal-btn--confirm" @click="confirmDefaultChange">
          {{ $t("common.confirm") }}
        </button>
      </template>
    </Confirmation-modal>
  </div>
</template>

<script>
import { useNotifyStore } from "@/stores/notify";
import ConfirmationModal from "@/functionals/Confirmation-modal/index.vue";
import {
  GET_GapSettings,
  PATCH_GapSettings,
  GET_FeatureSetsGlobal,
  PATCH_FeatureSet,
} from "@/api/pim/api";
import { extractApiMessage } from "@/composables/useFormErrors";

export default {
  name: "QualitySettingsCard",
  components: { ConfirmationModal },
  setup() {
    const notify = useNotifyStore();
    return { notify };
  },
  data() {
    return {
      loaded: false,
      settings: { gaps_skip_default_featureset: true },
      allSets: [],
      pendingDefaultIdx: null,
      saving: false,
    };
  },
  computed: {
    setOptions() {
      return this.allSets.map((s) => ({ label: s.name || s.idx, value: s.idx }));
    },
    currentDefaultSet() {
      return this.allSets.find((s) => s.is_default) || null;
    },
    currentDefaultIdx() {
      return this.currentDefaultSet ? this.currentDefaultSet.idx : null;
    },
    defaultConfirmMessage() {
      if (this.currentDefaultSet) {
        return this.$t("pim.confirm_set_default", {
          name: this.currentDefaultSet.name || this.currentDefaultSet.idx,
        });
      }
      return this.$t("common.confirm");
    },
  },
  mounted() {
    this.fetchSettings();
    this.fetchSets();
  },
  methods: {
    // Soft-compat: old backend has no gaps/settings/ → card stays hidden, zero console output.
    async fetchSettings() {
      try {
        const { data } = await GET_GapSettings();
        this.settings = data;
        this.loaded = true;
      } catch {
        this.loaded = false;
      }
    },
    // Silent — without sets the picker row hides and the toggle still works.
    async fetchSets() {
      try {
        const { data } = await GET_FeatureSetsGlobal({ page_size: 100 });
        this.allSets = data.results || [];
      } catch {
        this.allSets = [];
      }
    },
    async toggleSkipDefault() {
      if (this.saving) return;
      const next = !this.settings.gaps_skip_default_featureset;
      this.saving = true;
      try {
        const { data } = await PATCH_GapSettings({
          gaps_skip_default_featureset: next,
        });
        this.settings = data;
        this.notify.spawnNotification({
          type: "positive",
          msg: this.$t("pim.quality_settings_saved"),
        });
      } catch (err) {
        this.notify.spawnNotification({
          type: "negative",
          msg: extractApiMessage(err, this.$t("notifications.error")),
        });
      } finally {
        this.saving = false;
      }
    },
    onPickDefault(idx) {
      if (idx == null || idx === this.currentDefaultIdx) return;
      this.pendingDefaultIdx = idx;
    },
    // One PATCH is enough — the backend demotes the previous default atomically.
    async confirmDefaultChange() {
      const idx = this.pendingDefaultIdx;
      this.pendingDefaultIdx = null;
      if (idx == null) return;
      this.saving = true;
      try {
        await PATCH_FeatureSet(idx, { is_default: true });
        await this.fetchSets();
        this.notify.spawnNotification({
          type: "positive",
          msg: this.$t("pim.quality_settings_saved"),
        });
      } catch (err) {
        this.notify.spawnNotification({
          type: "negative",
          msg: extractApiMessage(err, this.$t("notifications.error")),
        });
      } finally {
        this.saving = false;
      }
    },
  },
};
</script>

<style lang="scss" scoped>
.quality-settings {
  padding: var(--space-300);
  margin-bottom: var(--space-400);
  border: 1px solid var(--c-basic-300);
}
.quality-settings__row {
  display: flex;
  align-items: flex-start;
  gap: var(--space-500);
  flex-wrap: wrap;
}
.quality-settings__picker {
  min-width: 260px;
}
</style>
