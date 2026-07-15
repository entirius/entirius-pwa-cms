<template>
  <Teleport to="body">
    <Transition name="spawn-modal">
      <div
        v-if="visible"
        class="spawn-modal__overlay"
        @click.self="$emit('close')"
      >
        <div
          class="spawn-modal__box bg-basic-100"
          role="dialog"
          aria-modal="true"
          data-testid="enrichment-spawn-dialog"
        >
          <div class="spawn-modal__header b-basic-300 bb-100">
            <FontAwesomeIcon icon="wand-magic-sparkles" class="t-support-400" />
            <h2 class="fs-400 fw-600 m-0">
              {{ $t("enrichment.spawn.title") }}
            </h2>
          </div>

          <div class="spawn-modal__body">
            <FormField :label="$t('enrichment.spawn.operation')">
              <Dropdown
                :values="opOptions"
                :selected="[op]"
                :placeholder="$t('enrichment.spawn.operation')"
                data-testid="enrichment-spawn-op"
                @onSelect="(v) => (op = v)"
              />
            </FormField>

            <FormField
              :label="$t('enrichment.spawn.feature')"
              :description="$t('enrichment.spawn.feature_hint')"
            >
              <Dropdown
                :values="featureOptions"
                :selected="feature ? [feature] : []"
                :placeholder="$t('enrichment.spawn.feature_placeholder')"
                data-testid="enrichment-spawn-feature"
                @onSelect="(v) => (feature = v)"
              />
            </FormField>

            <FormField :label="$t('enrichment.spawn.languages')">
              <div class="spawn-modal__langs flex ai-ct gap-200 flex-wrap">
                <label
                  v-for="lang in availableLanguages"
                  :key="lang"
                  class="spawn-modal__lang fs-200"
                  :class="{ 'spawn-modal__lang--on': languages.includes(lang) }"
                >
                  <input
                    type="checkbox"
                    :value="lang"
                    :checked="languages.includes(lang)"
                    @change="toggleLang(lang)"
                  />
                  {{ lang.toUpperCase() }}
                </label>
                <span
                  v-if="!availableLanguages.length"
                  class="fs-200 t-basic-500"
                  >{{ $t("enrichment.spawn.no_languages") }}</span
                >
              </div>
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
              <div class="flex flex-column gap-100">
                <label class="spawn-modal__scope fs-200">
                  <input
                    type="radio"
                    value="list"
                    :checked="scope === 'list'"
                    @change="scope = 'list'"
                    :disabled="!skus.length"
                  />
                  {{
                    $t("enrichment.spawn.scope_selection", {
                      count: skus.length,
                    })
                  }}
                </label>
                <label v-if="hasFilter" class="spawn-modal__scope fs-200">
                  <input
                    type="radio"
                    value="filter"
                    :checked="scope === 'filter'"
                    @change="scope = 'filter'"
                  />
                  {{ $t("enrichment.spawn.scope_filter") }}
                </label>
              </div>
            </FormField>

            <p class="spawn-modal__summary fs-200 t-basic-500">
              {{ summaryLine }}
            </p>
          </div>

          <div class="spawn-modal__footer b-basic-300 bt-100">
            <button
              class="spawn-modal__btn bg-basic-200 t-basic-600"
              :disabled="busy"
              @click="$emit('close')"
            >
              {{ $t("common.cancel") }}
            </button>
            <button
              class="spawn-modal__btn bg-support-400 t-basic-100"
              :disabled="busy || !canSpawn"
              data-testid="enrichment-spawn-submit"
              @click="spawn"
            >
              {{ $t("enrichment.spawn.submit") }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
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
    toggleLang(lang) {
      const i = this.languages.indexOf(lang);
      if (i > -1) this.languages.splice(i, 1);
      else this.languages.push(lang);
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

<style lang="scss" scoped>
.spawn-modal__overlay {
  position: fixed;
  inset: 0;
  z-index: 1000;
  background: var(--overlay-backdrop);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-300);
}
.spawn-modal__box {
  width: 100%;
  max-width: 520px;
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-md);
  display: flex;
  flex-direction: column;
  max-height: 90vh;
}
.spawn-modal__header {
  display: flex;
  align-items: center;
  gap: var(--space-100);
  padding: var(--space-300);
}
.spawn-modal__body {
  padding: var(--space-300);
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: var(--space-300);
}
.spawn-modal__lang {
  display: inline-flex;
  align-items: center;
  gap: var(--space-50);
  padding: 4px 8px;
  border: 1px solid var(--c-basic-400);
  border-radius: var(--radius-sm);
  cursor: pointer;
  &--on {
    border-color: var(--c-support-400);
    color: var(--c-support-400);
  }
}
.spawn-modal__scope {
  display: inline-flex;
  align-items: center;
  gap: var(--space-100);
}
.spawn-modal__summary {
  margin: 0;
}
.spawn-modal__footer {
  display: flex;
  justify-content: flex-end;
  gap: var(--space-100);
  padding: var(--space-300);
}
.spawn-modal__btn {
  height: var(--elem-height);
  padding: 0 16px;
  border: none;
  border-radius: var(--radius-sm);
  font-size: var(--fs-200);
  cursor: pointer;
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
}
.spawn-modal-enter-active,
.spawn-modal-leave-active {
  transition: opacity 0.15s ease;
}
.spawn-modal-enter-from,
.spawn-modal-leave-to {
  opacity: 0;
}
</style>
