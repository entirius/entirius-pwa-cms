<template>
  <nav
    class="pagination inline-flex ai-ct gap-50"
    :style="`--cell-size: ${nav_size}px`"
    aria-label="pagination"
  >
    <button
      type="button"
      class="page-cell"
      :disabled="pagination.page <= 1"
      aria-label="previous page"
      @click="
        changePage({ num: pagination.page - 1, isDisabled: false }, 'prev')
      "
    >
      <i class="icon-arrow-right-2 rotate-180"></i>
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
        :class="{ 'page-cell--active': pagination.page === num.num }"
        :aria-current="pagination.page === num.num ? 'page' : null"
        @click="changePage(num)"
      >
        {{ num.num }}
      </button>
    </template>

    <button
      type="button"
      class="page-cell"
      :disabled="pagination.page >= pagination.pages"
      aria-label="next page"
      @click="
        changePage({ num: pagination.page + 1, isDisabled: false }, 'next')
      "
    >
      <i class="icon-arrow-right-2"></i>
    </button>
  </nav>
</template>

<script>
export default {
  props: {
    pagination: {
      type: Object,
      required: false,
      default: () => ({ page: 1, pages: 1 }),
    },
    nav_size: {
      type: Number,
      default: 32,
    },
  },
  methods: {
    changePage(num, mode) {
      if (num.isDisabled) return;
      if (mode === "prev" && this.pagination.page <= 1) return;
      if (mode === "next" && this.pagination.page >= this.pagination.pages) {
        return;
      }
      this.$emit("onChangePage", num.num);
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
    calculatePages() {
      return this.paginate(this.pagination.page, this.pagination.pages);
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
    padding: 0 6px;
    border: 0;
    border-radius: 6px;
    background: transparent;
    color: var(--c-basic-700);
    font-size: inherit;
    font-family: inherit;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;

    &:hover:not(:disabled):not(.page-cell--active):not(.page-cell--gap) {
      background: var(--c-basic-200);
    }

    &:focus-visible {
      outline: 2px solid var(--c-support-400);
      outline-offset: 1px;
    }

    &--active {
      background: var(--c-support-100);
      color: var(--c-primary-100);
      font-weight: 600;
    }

    &--gap {
      cursor: default;
      color: var(--c-basic-500);
    }

    &:disabled {
      opacity: 0.4;
      cursor: default;
    }
  }
}
</style>
