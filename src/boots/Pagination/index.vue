<template>
  <!-- One page needs no navigation. -->
  <nav
    v-if="state.pages > 1"
    class="pagination inline-flex ai-ct gap-1"
    :style="`--cell-size: ${nav_size}px`"
    aria-label="pagination"
  >
    <button
      type="button"
      class="page-cell"
      :disabled="state.page <= 1"
      aria-label="previous page"
      @click="
        changePage({ num: state.page - 1, isDisabled: false }, 'prev')
      "
    >
      <FontAwesomeIcon :icon="$icons.prev" />
    </button>

    <template
      v-for="(num, i) in calculatePages"
      :key="`unique-key-pagination-${i}`"
    >
      <span
        v-if="!Number.isInteger(num.num)"
        class="page-cell page-cell--gap"
        aria-hidden="true"
      >
        {{ num.num }}
      </span>
      <button
        v-else
        type="button"
        class="page-cell"
        :class="{ 'page-cell--active': state.page === num.num }"
        :aria-current="state.page === num.num ? 'page' : null"
        @click="changePage(num)"
      >
        {{ num.num }}
      </button>
    </template>

    <button
      type="button"
      class="page-cell"
      :disabled="state.page >= state.pages"
      aria-label="next page"
      @click="
        changePage({ num: state.page + 1, isDisabled: false }, 'next')
      "
    >
      <FontAwesomeIcon :icon="$icons.next" />
    </button>
  </nav>
</template>

<script>
// Two prop styles: `pagination` ({ page, pages }) or `current` / `total` / `perPage` (pages derived).
// Both emit the new page as `onChangePage` and `change`.
export default {
  emits: ["onChangePage", "change"],
  props: {
    pagination: {
      type: Object,
      required: false,
      default: () => ({ page: 1, pages: 1 }),
    },
    current: {
      type: Number,
      default: 1,
    },
    total: {
      type: Number,
      default: null,
    },
    perPage: {
      type: Number,
      default: null,
    },
    nav_size: {
      type: Number,
      default: 32,
    },
  },
  methods: {
    changePage(num, mode) {
      if (num.isDisabled) return;
      if (mode === "prev" && this.state.page <= 1) return;
      if (mode === "next" && this.state.page >= this.state.pages) return;
      this.$emit("onChangePage", num.num);
      this.$emit("change", num.num);
    },
    paginate(current, last) {
      const onSides = 1;
      const slots = onSides * 2 + 5; // constant slot count -> arrows never shift

      if (last <= slots) {
        return Array.from({ length: last }, (_, i) => ({
          num: i + 1,
          isDisabled: i + 1 === current,
        }));
      }

      const left = Math.max(2, Math.min(current - onSides, last - slots + 3));
      const right = Math.min(last - 1, Math.max(current + onSides, slots - 2));
      const pages = [{ num: 1, isDisabled: current === 1 }];

      // second slot: ellipsis when there's a gap, otherwise the real page 2
      pages.push(
        left > 2
          ? { num: "...", isDisabled: true }
          : { num: 2, isDisabled: current === 2 }
      );

      for (let i = Math.max(left, 3); i <= Math.min(right, last - 2); i++) {
        pages.push({ num: i, isDisabled: i === current });
      }

      // second-to-last slot: ellipsis when there's a gap, otherwise page last-1
      pages.push(
        right < last - 1
          ? { num: "...", isDisabled: true }
          : { num: last - 1, isDisabled: current === last - 1 }
      );

      pages.push({ num: last, isDisabled: current === last });
      return pages;
    },
  },
  computed: {
    state() {
      if (this.total === null || !this.perPage) return this.pagination;
      return { page: this.current, pages: Math.ceil(this.total / this.perPage) };
    },
    calculatePages() {
      return this.paginate(this.state.page, this.state.pages);
    },
  },
};
</script>

<style lang="scss" scoped>
.pagination {
  max-width: fit-content;

  .page-cell {
    min-width: var(--cell-size, 2rem);
    height: var(--cell-size, 2rem);
    padding: 0 var(--space-1);
    border: 0;
    border-radius: var(--radius-base);
    background: transparent;
    color: var(--text-body);
    font-size: var(--fs-200);
    font-family: inherit;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;

    &:hover:not(:disabled):not(.page-cell--active):not(.page-cell--gap) {
      background: var(--surface-raised);
    }

    &:focus-visible {
      outline: 2px solid var(--accent);
      outline-offset: 1px;
    }

    &--active {
      background: var(--accent-subtle);
      color: var(--text-strong);
      font-weight: 600;
    }

    &--gap {
      cursor: default;
      color: var(--text-muted);
    }

    &:disabled {
      opacity: 0.4;
      cursor: default;
    }
  }
}
</style>
