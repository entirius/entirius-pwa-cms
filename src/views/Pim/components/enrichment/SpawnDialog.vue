<template>
  <BasicModal
    :open="visible"
    :actions="actions"
    :persistent="busy"
    @close="$emit('close')"
  >
    <template #title>
      <h2 class="flex ai-ct gap-2 fs-400 fw-600 t-body">
        <FontAwesomeIcon :icon="$icons.enrich" class="t-accent" aria-hidden="true" />
        {{ $t("enrichment.spawn.title") }}
      </h2>
    </template>

    <div class="flex-column gap-4" data-testid="enrichment-spawn-dialog">
      <FormField :label="$t('enrichment.spawn.operation')">
        <BasicSelect
          :options="opOptions"
          v-model="op"
          :placeholder="$t('enrichment.spawn.operation')"
          data-testid="enrichment-spawn-op"
        />
      </FormField>

      <FormField
        :label="$t('enrichment.spawn.feature')"
        :description="$t('enrichment.spawn.feature_hint')"
      >
        <BasicSelect
          :options="featureOptions"
          v-model="feature"
          :placeholder="$t('enrichment.spawn.feature_placeholder')"
          data-testid="enrichment-spawn-feature"
        />
      </FormField>

      <FormField
        :label="$t('enrichment.spawn.languages')"
        :description="availableLanguages.length ? '' : $t('enrichment.spawn.no_languages')"
      >
        <BasicSelect
          v-model="languages"
          multiple
          :options="languageOptions"
          :disabled="!availableLanguages.length"
          data-testid="enrichment-spawn-languages"
        />
      </FormField>

      <FormField
        :label="$t('enrichment.spawn.channels')"
        :description="$t('enrichment.spawn.channels_hint')"
      >
        <ChannelMultiSelect
          v-model="channels"
          :channels="channelList"
          :label="$t('enrichment.spawn.channels')"
          :all-label="$t('common.all')"
        />
      </FormField>

      <FormField :label="$t('enrichment.spawn.scope')">
        <BasicRadioGroup v-model="scope" :options="scopeOptions" />
      </FormField>

      <p class="fs-200 t-muted">
        {{ summaryLine }}
      </p>
    </div>
  </BasicModal>
</template>

<script>
import { usePimChannelStore } from "@/stores/pimChannel";
import { useNotifyStore } from "@/stores/notify";
import { extractApiMessage } from "@/composables/useFormErrors";
import { GET_Features } from "@/api/pim/api";
import { POST_SpawnTask } from "@/api/enrichment/api";

// PIM t9n-text feature types — the only ones the PIM adapter can write (etap-04).
const TEXT_FEATURE_TYPES = new Set([4, 6]); // VARCHAR255_T9N, TEXT_T9N
const OPERATIONS = ["translate", "fix", "fill"];

export default {
  name: "EnrichmentSpawnDialog",
  props: {
    visible: { type: Boolean, default: false },
    skus: { type: Array, default: () => [] },
    // Current PIM list filter params (for "all matching" scope). Empty => single/selection only.
    filterParams: { type: Object, default: () => ({}) },
  },
  emits: ["close", "spawned"],
  setup() {
    return { pimChannel: usePimChannelStore(), notify: useNotifyStore() };
  },
  data() {
    return {
      op: "fix",
      feature: "",
      features: [],
      languages: [],
      channels: [],
      scope: "list",
      busy: false,
    };
  },
  computed: {
    // Cancel · Create tasks (R5).
    actions() {
      return [
        { key: "cancel", role: "secondary", label: this.$t("common.cancel"), disabled: this.busy,
          onClick: () => this.$emit("close") },
        { key: "submit", role: "primary", label: this.$t("enrichment.spawn.submit"), testid: "enrichment-spawn-submit",
          disabled: this.busy || !this.canSpawn, loading: this.busy, onClick: this.spawn },
      ];
    },
    languageOptions() {
      return this.availableLanguages.map((lang) => ({ label: lang.toUpperCase(), value: lang }));
    },
    // The selection needs picked products; "all matching the filter" shows only with a list filter.
    scopeOptions() {
      const selection = { value: "list", disabled: !this.skus.length,
        label: this.$t("enrichment.spawn.scope_selection", { count: this.skus.length }) };
      if (!this.hasFilter) return [selection];
      return [selection, { value: "filter", label: this.$t("enrichment.spawn.scope_filter") }];
    },
    opOptions() {
      return OPERATIONS.map((o) => ({
        value: o,
        label: this.$t(`enrichment.spawn.op_${o}`),
      }));
    },
    featureOptions() {
      return this.features.map((f) => ({
        value: f.idx,
        label: f.name || f.idx,
      }));
    },
    channelList() {
      return this.pimChannel.channels;
    },
    availableLanguages() {
      return this.pimChannel.activeChannelLanguages.length
        ? this.pimChannel.activeChannelLanguages
        : this.pimChannel.allLanguages;
    },
    hasFilter() {
      return Object.keys(this.filterParams || {}).length > 0;
    },
    canSpawn() {
      return (
        !!this.feature &&
        this.languages.length > 0 &&
        this.channels.length > 0 &&
        this.hasScopeData
      );
    },
    hasScopeData() {
      return this.scope === "filter" ? this.hasFilter : this.skus.length > 0;
    },
    summaryLine() {
      return this.$t("enrichment.spawn.summary", {
        channels: this.channels.length,
        languages: this.languages.length,
        tasks: this.channels.length,
      });
    },
  },
  watch: {
    visible(open) {
      if (open) this.reset();
    },
  },
  methods: {
    reset() {
      this.op = "fix";
      this.feature = "";
      this.scope = this.skus.length ? "list" : "filter";
      // Default: every language of the active channel, the active channel pre-picked.
      this.languages = [...this.availableLanguages];
      const active = this.pimChannel.activeChannelIdx;
      this.channels = active ? [active] : [];
      this.fetchFeatures();
    },
    async fetchFeatures() {
      try {
        const { data } = await GET_Features(
          { page_size: 100 },
          this.pimChannel.activeChannelIdx
        );
        this.features = (data.results || []).filter((f) =>
          TEXT_FEATURE_TYPES.has(f.feature_type)
        );
      } catch {
        this.features = [];
      }
    },
    buildScopeSpec(channelIdx) {
      const base = { mode: this.scope, module: "pim", channel: channelIdx };
      if (this.scope === "filter")
        return { ...base, filters: this.cleanFilterParams() };
      return { ...base, refs: this.skus };
    },
    // Strip pagination/ordering — the adapter only reads list_products filter kwargs.
    cleanFilterParams() {
      const out = {};
      for (const [k, v] of Object.entries(this.filterParams || {})) {
        if (["page", "page_size", "ordering"].includes(k)) continue;
        if (v == null || v === "") continue;
        out[k] = v;
      }
      return out;
    },
    async spawn() {
      if (this.busy || !this.canSpawn) return;
      this.busy = true;
      // M channels -> M tasks: the PIM adapter scope_spec is single-channel (etap-04).
      // Languages ride in params; the worker fans out one proposal per language.
      const params = {
        feature: this.feature,
        languages: this.languages,
        op: this.op,
      };
      const targets = [...this.channels];
      const total = targets.length;
      const succeeded = [];
      let lastErr = null;
      for (const channelIdx of targets) {
        try {
          await POST_SpawnTask({
            type: this.op,
            scope_spec: this.buildScopeSpec(channelIdx),
            params,
          });
          succeeded.push(channelIdx);
        } catch (err) {
          lastErr = err;
        }
      }
      this.busy = false;
      // Drop channels that already have a task so a retry only targets failures.
      this.channels = targets.filter((c) => !succeeded.includes(c));
      if (succeeded.length) this.$emit("spawned", succeeded.length);
      if (succeeded.length === total) {
        this.notify.spawnNotification({
          type: "positive",
          msg: this.$t("enrichment.spawn.toast_success", { count: total }),
        });
        this.$emit("close");
      } else if (succeeded.length) {
        this.notify.spawnNotification({
          type: "warning",
          msg: this.$t("enrichment.spawn.toast_partial", {
            ok: succeeded.length,
            total,
          }),
        });
      } else {
        this.notify.spawnNotification({
          type: "negative",
          msg: extractApiMessage(lastErr, this.$t("notifications.error")),
        });
      }
    },
  },
};
</script>
