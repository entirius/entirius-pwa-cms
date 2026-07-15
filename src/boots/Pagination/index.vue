<template>
  <div class="pagination inline-flex ai-ct jc-ct gap-100">
    <div
      class="navigation-icon relative pointer inline-flex jc-ct ai-ct"
      :class="[pagination.page <= 1 ? 'inactive' : '']"
      :style="`height: ${nav_size}px; width: ${nav_size}px`"
      @click="
        changePage({ num: pagination.page - 1, isDisabled: false }, 'prev')
      "
    >
      <i class="icon-arrow-right-2 rotate-180"></i>
    </div>

    <div
      class="pagination-element txt-center grid-square inline-flex jc-ct ai-ct"
      :class="[
        {
          'pagination-element__active bb-basic-500':
            pagination.page === num.num,
        },
        Number.isInteger(num.num) ? 'pointer' : '',
      ]"
      v-for="(num, i) in calculatePages"
      :key="`unique-key-pagination-${i}`"
      @click="changePage(num)"
    >
      <span class=""> {{ num.num }}</span>
    </div>

    <div
      class="navigation-icon relative pointer inline-flex jc-ct ai-ct"
      :class="[pagination.page >= pagination.pages ? 'inactive' : '']"
      :style="`height: ${nav_size}px; width: ${nav_size}px`"
      @click="
        changePage({ num: pagination.page + 1, isDisabled: false }, 'next')
      "
    >
      <i class="icon-arrow-right-2"></i>
    </div>
  </div>
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
  color: var(--c-basic-700);
  .pagination-element {
    &__active {
      position: relative;
      background-color: var(--c-basic-100);
      border-radius: 5px;
      border: 1px solid var(--c-basic-400);
    }
  }
  .navigation-icon {
    height: 2rem;
    width: 2rem;
    border-radius: 50%;
    color: var(--c-basic-600);
  }
  .inactive {
    opacity: 0.5;
  }
}
</style>
