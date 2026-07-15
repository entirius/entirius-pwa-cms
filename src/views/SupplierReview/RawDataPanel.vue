<template>
  <aside class="raw-panel bg-basic-100 b-basic-300 br-100 p-300" v-if="product">
    <h3 class="raw-panel__heading">
      {{ $t("supplier_review.raw_data_title") }}
    </h3>

    <!-- Core fields -->
    <section class="raw-panel__section">
      <h4 class="raw-panel__subheading">{{ $t("supplier_review.raw_panel.core_section") }}</h4>
      <dl class="raw-panel__grid">
        <template v-for="row in coreRows" :key="row.label">
          <dt>{{ row.label }}</dt>
          <dd :class="{ 'raw-panel__mono': row.mono }">{{ row.value }}</dd>
        </template>
      </dl>
    </section>

    <!-- Vendor attributes (the `data` JSONField from SupplierProduct) -->
    <section v-if="attributeRows.length" class="raw-panel__section">
      <h4 class="raw-panel__subheading">
        {{ $t("supplier_review.raw_panel.attributes_section") }}
      </h4>
      <dl class="raw-panel__grid">
        <template v-for="row in attributeRows" :key="row.key">
          <dt :title="row.key">{{ row.key }}</dt>
          <dd>
            <pre v-if="row.isJson" class="raw-panel__json">{{ row.value }}</pre>
            <template v-else-if="row.long">
              <span :class="{ 'raw-panel__clamp': !expanded[row.key] }">{{ row.value }}</span>
              <button
                type="button"
                class="raw-panel__expand-btn"
                @click="toggle(row.key)"
              >
                {{ expanded[row.key]
                  ? $t("supplier_review.raw_panel.collapse")
                  : $t("supplier_review.raw_panel.expand") }}
              </button>
            </template>
            <span v-else>{{ row.value }}</span>
          </dd>
        </template>
      </dl>
    </section>

    <!-- Image URLs (compact list — full gallery on click) -->
    <section v-if="imageUrls.length" class="raw-panel__section">
      <h4 class="raw-panel__subheading">
        {{ $t("supplier_review.raw_panel.images_section") }}
        <span class="raw-panel__count">({{ imageUrls.length }})</span>
      </h4>
      <ul class="raw-panel__images">
        <li v-for="(u, i) in imageUrls" :key="i">
          <a :href="u" target="_blank" rel="noopener" class="raw-panel__image-link">
            {{ shortenUrl(u) }}
          </a>
        </li>
      </ul>
    </section>
  </aside>
</template>

<script>
import { formatCost } from "@/utils/format";

const LONG_TEXT_THRESHOLD = 120;

export default {
  name: "RawDataPanel",
  props: {
    product: { type: Object, default: null },
  },
  data() {
    return { expanded: {} };
  },
  watch: {
    "product.id"() {
      this.expanded = {};
    },
  },
  computed: {
    coreRows() {
      const p = this.product;
      if (!p) return [];
      return [
        { label: "ID", value: p.id, mono: true },
        { label: "External ID", value: p.external_id || "—", mono: true },
        { label: "Status", value: p.status || "—" },
        { label: "Cost", value: formatCost(p.cost, p.currency) || "—" },
        { label: "Stock", value: p.stock ?? "—" },
        { label: "EAN", value: p.ean || "—", mono: true },
        { label: "URL", value: p.url || "—", mono: true },
        { label: "Last synced", value: this.formatDate(p.last_synced_at) },
        { label: "Data changed", value: this.formatDate(p.data_changed_at) },
      ];
    },
    attributeRows() {
      const data = this.product?.data || {};
      const entries = Object.entries(data);
      if (!entries.length) return [];
      return entries
        .filter(([, v]) => v !== null && v !== undefined && v !== "")
        .map(([k, v]) => this.formatRow(k, v));
    },
    imageUrls() {
      return Array.isArray(this.product?.image_urls) ? this.product.image_urls : [];
    },
  },
  methods: {
    toggle(key) {
      this.expanded = { ...this.expanded, [key]: !this.expanded[key] };
    },
    formatRow(key, value) {
      const isObj = value && typeof value === "object";
      if (isObj) {
        return {
          key,
          value: JSON.stringify(value, null, 2),
          isJson: true,
          long: false,
        };
      }
      const str = String(value);
      return {
        key,
        value: str,
        isJson: false,
        long: str.length > LONG_TEXT_THRESHOLD,
      };
    },
    formatDate(iso) {
      if (!iso) return "—";
      try {
        return new Date(iso).toLocaleString();
      } catch {
        return iso;
      }
    },
    shortenUrl(u) {
      try {
        const url = new URL(u);
        return `${url.hostname}${url.pathname}`.slice(0, 60);
      } catch {
        return String(u).slice(0, 60);
      }
    },
  },
};
</script>

<style lang="scss" scoped>
.raw-panel {
  display: flex;
  flex-direction: column;
  gap: var(--space-300);
  max-height: calc(100vh - 200px);
  overflow-y: auto;
}

.raw-panel__heading {
  font-size: var(--fs-400);
  font-weight: 600;
  margin: 0 0 var(--space-200);
  color: var(--c-basic-700);
}

.raw-panel__section {
  display: flex;
  flex-direction: column;
  border-bottom: 1px solid var(--c-basic-200);
  padding-bottom: var(--space-200);

  &:last-child {
    border-bottom: none;
    padding-bottom: 0;
  }
}

.raw-panel__subheading {
  font-size: var(--fs-200);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--c-basic-500);
  margin: 0 0 8px;
}

.raw-panel__count {
  font-weight: 400;
  text-transform: none;
  color: var(--c-basic-400);
  margin-left: 4px;
}

.raw-panel__grid {
  display: grid;
  grid-template-columns: max-content 1fr;
  gap: 4px 12px;
  margin: 0;

  dt {
    font-size: var(--fs-200);
    color: var(--c-basic-500);
    word-break: break-word;
    align-self: start;
  }

  dd {
    margin: 0;
    font-size: var(--fs-200);
    color: var(--c-basic-700);
    word-break: break-all;
    min-width: 0;
  }
}

.raw-panel__mono {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
}

.raw-panel__json {
  background: var(--c-basic-200);
  border: 1px solid var(--c-basic-300);
  border-radius: var(--radius-sm);
  padding: 6px 8px;
  margin: 0;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 11px;
  max-height: 140px;
  overflow: auto;
  white-space: pre;
}

.raw-panel__clamp {
  display: -webkit-box;
  -webkit-line-clamp: 4;
  line-clamp: 4;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.raw-panel__expand-btn {
  display: inline-block;
  margin-top: 4px;
  padding: 0;
  background: transparent;
  border: none;
  color: var(--c-support-400);
  font-size: var(--fs-200);
  font-weight: 500;
  cursor: pointer;

  &:hover {
    text-decoration: underline;
  }
}

.raw-panel__images {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.raw-panel__image-link {
  font-size: var(--fs-200);
  color: var(--c-support-400);
  text-decoration: none;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;

  &:hover {
    text-decoration: underline;
  }
}
</style>
