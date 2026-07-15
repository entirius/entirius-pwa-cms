<template>
  <div class="linked-suppliers">
    <h3 class="fs-200 fw-600 t-basic-500 mb-200 supplier-section__heading">
      {{ $t("pim.supplier.linked_title") }}
    </h3>
    <ul class="linked-suppliers__list">
      <li
        v-for="item in items"
        :key="item.sp_id || item.supplier_idx"
        class="linked-suppliers__item"
      >
        <div class="linked-suppliers__row">
          <div class="linked-suppliers__name">
            <span v-if="item.is_preferred" class="linked-suppliers__star">★</span>
            <strong>{{ item.supplier_name || item.supplier_idx }}</strong>
            <StatusBadge
              v-if="item.is_preferred && !item.manual_override"
              :label="$t('pim.supplier.auto_preferred_badge')"
              variant="positive"
              class="ml-100"
            />
            <StatusBadge
              v-if="item.manual_override"
              :label="$t('pim.supplier.manual_override_badge')"
              variant="warning"
              class="ml-100"
            />
          </div>
          <div class="linked-suppliers__metrics">
            <span class="t-basic-500"
              >{{ $t("pim.supplier.cost") }}:
              <strong class="t-basic-800">{{ formatCost(item.cost) }}</strong></span
            >
            <span class="t-basic-500"
              >{{ $t("pim.supplier.stock") }}:
              <strong class="t-basic-800">{{ formatStock(item.stock) }}</strong></span
            >
          </div>
        </div>
      </li>
      <li v-if="!items.length" class="t-basic-500 fs-200">
        {{ $t("pim.supplier.no_supplier") }}
      </li>
    </ul>
  </div>
</template>

<script>
export default {
  name: "LinkedSuppliersPanel",
  props: {
    items: { type: Array, default: () => [] },
  },
  methods: {
    formatCost(v) {
      if (v == null) return "—";
      const n = Number(v);
      return Number.isFinite(n) ? n.toFixed(2) : String(v);
    },
    formatStock(v) {
      if (v == null) return "—";
      return String(v);
    },
  },
};
</script>

<style lang="scss" scoped>
.linked-suppliers__list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-100);
}

.linked-suppliers__item {
  padding: var(--space-200) var(--space-300);
  border: 1px solid var(--c-basic-300);
  border-radius: var(--radius-md);
  background: var(--c-basic-100);
}

.linked-suppliers__row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: var(--space-200);
}

.linked-suppliers__name {
  display: flex;
  align-items: center;
  gap: var(--space-100);
}

.linked-suppliers__star {
  color: var(--c-warning-300);
  font-size: var(--fs-400);
}

.linked-suppliers__metrics {
  display: flex;
  gap: var(--space-300);
  font-size: var(--fs-200);
}

.supplier-section__heading {
  text-transform: uppercase;
  letter-spacing: 0.5px;
}
</style>
