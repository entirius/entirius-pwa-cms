<template>
  <div class="quality-tab" data-test="quality-tab">
    <Loader v-if="loading" />

    <EmptyState
      v-else-if="evaluatedAt == null"
      :title="$t('pim.quality_unevaluated')"
      :message="$t('pim.quality_unevaluated_hint')"
      icon="circle-info"
    />

    <EmptyState
      v-else-if="!findings.length"
      :title="$t('pim.quality_no_gaps')"
      icon="circle-check"
    />

    <ul v-else class="quality-tab__list">
      <li
        v-for="(f, i) in findings"
        :key="i"
        class="quality-tab__item"
        data-test="quality-finding"
      >
        <StatusBadge
          :label="severityLabel(f.severity)"
          :variant="variant(f.severity)"
        />
        <span class="quality-tab__label">{{ label(f) }}</span>
        <span v-if="f.language" class="quality-tab__lang t-basic-500">{{
          f.language
        }}</span>
        <span v-if="f.inherited" class="quality-tab__inherited t-basic-500">
          {{ $t("pim.quality_fix_on", { channel: f.source_channel }) }}
        </span>
      </li>
    </ul>
  </div>
</template>

<script>
import { GET_BulkProductGaps } from "@/api/pim/api";
import { getLang } from "@/i18n";
import { gapBadgeVariant, resolveGapLabel } from "../quality";

export default {
  name: "QualityTab",
  props: {
    productPk: { type: [Number, String], default: null },
    channelIdx: { type: String, required: true },
    // Null = never evaluated / ProductCustom ("unevaluated"); set = a real evaluation ran.
    evaluatedAt: { type: String, default: null },
  },
  data() {
    return { loading: false, findings: [] };
  },
  watch: {
    productPk: {
      immediate: true,
      handler(v) {
        if (v != null) this.fetch();
      },
    },
  },
  methods: {
    async fetch() {
      this.loading = true;
      try {
        const { data } = await GET_BulkProductGaps(this.channelIdx, [
          this.productPk,
        ]);
        this.findings = data?.results?.[String(this.productPk)] || [];
      } catch {
        // Soft-compat: old PIM has no findings endpoint → render the empty state, no error.
        this.findings = [];
      } finally {
        this.loading = false;
      }
    },
    variant(severity) {
      return gapBadgeVariant(severity);
    },
    label(finding) {
      return resolveGapLabel(finding, getLang());
    },
    severityLabel(severity) {
      return severity === "critical"
        ? this.$t("pim.gap_critical")
        : this.$t("pim.gap_warning");
    },
  },
};
</script>

<style lang="scss" scoped>
.quality-tab {
  padding: var(--space-200) 0;
}
.quality-tab__list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-200);
}
.quality-tab__item {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-200);
  padding: var(--space-200) var(--space-300);
  border: 1px solid var(--c-basic-300);
  border-radius: var(--radius-md);
  background: var(--c-basic-100);
}
.quality-tab__label {
  color: var(--c-basic-700);
}
.quality-tab__lang {
  padding: 0 6px;
  border-radius: var(--radius-sm);
  background: var(--c-basic-200);
  font-size: 11px;
  text-transform: uppercase;
}
.quality-tab__inherited {
  font-style: italic;
  font-size: var(--fs-200);
}
</style>
