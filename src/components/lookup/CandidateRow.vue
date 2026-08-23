<template>
  <div
    class="candidate-row"
    :data-testid="`candidate-row-${hit.kind}-${hit.ref}`"
  >
    <div class="candidate-row__thumb">
      <img
        v-if="hit.basic?.main_image_url"
        :src="thumbUrl"
        :alt="hit.basic?.name"
      />
      <FontAwesomeIcon v-else icon="image" />
    </div>
    <div class="candidate-row__main">
      <div class="candidate-row__title-line">
        <StatusBadge :label="kindLabel" variant="informative" />
        <span class="candidate-row__name">{{ hit.basic?.name }}</span>
        <span class="candidate-row__sku fs-200 t-basic-500">{{
          hit.basic?.sku
        }}</span>
      </div>
      <div class="candidate-row__meta">
        <span
          class="candidate-row__score fs-300 fw-600"
          data-testid="candidate-row-score"
        >
          {{ score }}
        </span>
        <StatusBadge
          v-if="hit.decision"
          :label="decisionLabel"
          :variant="decisionVariant"
          data-testid="candidate-row-decision"
        />
      </div>
      <div v-if="hit.reasons?.length" class="candidate-row__reasons">
        <span
          v-for="(reason, index) in hit.reasons"
          :key="`${reason.code}-${index}`"
          class="candidate-row__reason-chip"
        >
          {{ reason.label }} ({{ reason.score >= 0 ? "+" : ""
          }}{{ reason.score }})
        </span>
      </div>
    </div>
    <div class="candidate-row__actions">
      <slot name="actions" :hit="hit" />
      <button
        type="button"
        class="row-action-btn bg-basic-200 t-basic-700"
        :title="$t('lookup.row.open')"
        data-testid="candidate-row-open"
        @click="open"
      >
        <FontAwesomeIcon icon="up-right-from-square" />
      </button>
    </div>
  </div>
</template>

<script>
import { resolveMediaUrl } from "@/utils/resolveMediaUrl";

// Response fields the backend controls, but never trust them blindly as
// i18n/object keys or as a source of arbitrary property lookups.
const KNOWN_KINDS = new Set(["pim_product", "atlas_source_product"]);
// Doubles as the decision allowlist: Object.create(null) has no prototype
// chain to leak through a lookup keyed by an untrusted API value.
const DECISION_VARIANTS = Object.assign(Object.create(null), {
  match: "positive",
  review: "warning",
  no_match: "neutral",
});

export default {
  name: "CandidateRow",
  props: {
    hit: { type: Object, required: true },
  },
  computed: {
    score() {
      return this.hit.score ?? this.hit.similarity;
    },
    thumbUrl() {
      return resolveMediaUrl(this.hit.basic?.main_image_url);
    },
    kindLabel() {
      return KNOWN_KINDS.has(this.hit.kind)
        ? this.$t(`lookup.kind.${this.hit.kind}`)
        : this.hit.kind;
    },
    isKnownDecision() {
      return Object.hasOwn(DECISION_VARIANTS, this.hit.decision ?? "");
    },
    decisionLabel() {
      return this.isKnownDecision
        ? this.$t(`lookup.decision.${this.hit.decision}`)
        : this.hit.decision;
    },
    decisionVariant() {
      return this.isKnownDecision
        ? DECISION_VARIANTS[this.hit.decision]
        : "neutral";
    },
  },
  methods: {
    // `ref` already encodes the identifiers a provider's own catalog needs
    // (PIM: sku === ref; atlas: `<source_idx>:<external_id>`) — no need to
    // parse the admin API's `detail_url`.
    open() {
      if (this.hit.kind === "pim_product") {
        this.$router.push({
          name: "PimProductDetail",
          params: { sku: this.hit.basic?.sku },
        });
        return;
      }
      const [sourceIdx] = String(this.hit.ref || "").split(":");
      if (!sourceIdx) return;
      this.$router.push({
        name: "SourceDetail",
        params: { idx: sourceIdx },
        query: { tab: "products" },
      });
    },
  },
};
</script>

<style lang="scss" scoped>
.candidate-row {
  display: flex;
  align-items: flex-start;
  gap: var(--space-300);
  padding: var(--space-300);
  border: 1px solid var(--c-basic-300);
  border-radius: var(--radius-sm);
  margin-bottom: var(--space-200);

  &__thumb {
    flex-shrink: 0;
    width: 56px;
    height: 56px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--c-basic-200);
    border-radius: var(--radius-sm);
    color: var(--c-basic-400);
    overflow: hidden;

    img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
  }
  &__main {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  &__title-line,
  &__meta {
    display: flex;
    align-items: center;
    gap: var(--space-200);
  }
  &__title-line {
    flex-wrap: wrap;
  }
  &__name {
    font-weight: 600;
  }
  &__reasons {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }
  &__reason-chip {
    font-size: var(--fs-200);
    color: var(--c-basic-600);
    background: var(--c-basic-200);
    border-radius: 999px;
    padding: 2px 10px;
  }
  &__actions {
    flex-shrink: 0;
    display: flex;
    align-items: center;
    gap: var(--space-100);
  }
}
.row-action-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: none;
  border-radius: var(--radius-sm);
  cursor: pointer;
}
</style>
