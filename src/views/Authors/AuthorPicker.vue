<template>
  <div class="author-picker">
    <label v-if="label" :for="searchId" class="field-label block mb-5">
      {{ label }}
    </label>

    <div v-if="selectedAuthors.length" class="author-picker__selected mb-5">
      <draggable
        v-model="selectedAuthors"
        ghost-class="bg-accent-subtle"
        :force-fallback="true"
        fallback-class="drag-ghost"
        item-key="uid"
        handle=".drag-handle"
        @end="onDragEnd"
      >
        <template #item="{ element }">
          <div class="author-picker__row flex ai-ct jc-sb">
            <div class="flex ai-ct gap-5">
              <span class="drag-handle t-muted">&#x2630;</span>
              <span class="fw-500">{{ element.name }}</span>
              <span v-if="element.role_t9n" class="fs-200 t-muted">
                {{ firstValue(element.role_t9n) }}
              </span>
            </div>
            <button
              class="author-picker__remove pointer"
              @click="removeAuthor(element.uid)"
            >
              <FontAwesomeIcon :icon="$icons.close" />
            </button>
          </div>
        </template>
      </draggable>
    </div>

    <div v-else class="t-muted fs-200 mb-5 p-5 b-subtle rounded">
      {{ placeholderEmpty }}
    </div>

    <div class="author-picker__search-wrap">
      <BasicInput
        :id="searchId"
        v-model="search"
        :placeholder="placeholderSearch"
        icon="search"
        @input="debouncedFetch(fetchAuthors)"
        @focus="dropdownOpen = true"
        @click="dropdownOpen = true"
      />
      <div v-if="dropdownOpen && filteredResults.length" class="author-picker__dropdown">
        <div
          v-for="author in filteredResults"
          :key="author.uid"
          class="author-picker__option flex ai-ct jc-sb"
          @click="addAuthor(author)"
        >
          <span class="fw-500">{{ author.name }}</span>
          <span v-if="author.role_t9n" class="fs-200 t-muted">
            {{ firstValue(author.role_t9n) }}
          </span>
        </div>
      </div>
      <div v-else-if="dropdownOpen && search && !loading" class="author-picker__dropdown">
        <div class="author-picker__option t-muted">
          {{ $t("pim.no_results") }}
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { getCurrentInstance } from "vue";
import draggable from "vuedraggable";
import { GET_Authors } from "@/api/contentDB/api";
import { useSearchDebounce } from "@/composables/useSearchDebounce";

export default {
  name: "AuthorPicker",
  components: { draggable },
  props: {
    modelValue: { type: Array, default: () => [] },
    exclude: { type: Array, default: () => [] },
    label: { type: String, default: "" },
    placeholderSearch: { type: String, default: "Search authors" },
    placeholderEmpty: { type: String, default: "No authors assigned" },
  },
  emits: ["update:modelValue"],
  setup() {
    const { search, debouncedFetch } = useSearchDebounce();
    const searchId = `author-picker-${getCurrentInstance().uid}`;
    return { search, debouncedFetch, searchId };
  },
  data() {
    return {
      results: [],
      selectedAuthors: [],
      loading: false,
      dropdownOpen: false,
    };
  },
  computed: {
    filteredResults() {
      return this.results.filter(
        (a) =>
          !this.exclude.includes(a.uid) &&
          !this.selectedAuthors.find((s) => s.uid === a.uid)
      );
    },
  },
  watch: {
    modelValue: {
      async handler(uids) {
        if (!uids || !uids.length) {
          this.selectedAuthors = [];
          return;
        }
        const existing = this.selectedAuthors.filter((a) =>
          uids.includes(a.uid)
        );
        const missing = uids.filter(
          (uid) => !existing.find((a) => a.uid === uid)
        );
        if (missing.length) {
          try {
            const { data } = await GET_Authors({ page_size: 50 });
            const loaded = data.results || [];
            this.selectedAuthors = uids
              .map(
                (uid) =>
                  existing.find((a) => a.uid === uid) ||
                  loaded.find((a) => a.uid === uid)
              )
              .filter(Boolean);
          } catch {
            this.selectedAuthors = existing;
          }
        } else {
          this.selectedAuthors = uids
            .map((uid) => existing.find((a) => a.uid === uid))
            .filter(Boolean);
        }
      },
      immediate: true,
    },
  },
  mounted() {
    this.fetchAuthors();
    this._onClickOutside = (e) => {
      if (this.$el && !this.$el.contains(e.target)) {
        this.dropdownOpen = false;
      }
    };
    document.addEventListener("click", this._onClickOutside);
  },
  beforeUnmount() {
    document.removeEventListener("click", this._onClickOutside);
  },
  methods: {
    firstValue(obj) {
      if (!obj) return "";
      const vals = Object.values(obj);
      return vals.length ? vals[0] : "";
    },
    async fetchAuthors() {
      this.loading = true;
      try {
        const params = { is_active: true, page_size: 20 };
        if (this.search) params.search = this.search;
        const { data } = await GET_Authors(params);
        this.results = data.results || [];
      } catch {
        this.results = [];
      } finally {
        this.loading = false;
      }
    },
    addAuthor(author) {
      if (this.selectedAuthors.find((a) => a.uid === author.uid)) return;
      this.selectedAuthors = [...this.selectedAuthors, author];
      this.emitUpdate();
      this.dropdownOpen = false;
      this.search = "";
    },
    removeAuthor(uid) {
      this.selectedAuthors = this.selectedAuthors.filter((a) => a.uid !== uid);
      this.emitUpdate();
    },
    emitUpdate() {
      this.$emit(
        "update:modelValue",
        this.selectedAuthors.map((a) => a.uid)
      );
    },
    onDragEnd() {
      this.emitUpdate();
    },
  },
};
</script>

<style lang="scss" scoped>
.author-picker {
  position: relative;
}
.tt-upper {
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
.author-picker__selected {
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-base);
  overflow: hidden;
}
.author-picker__row {
  padding: var(--space-2) var(--space-5);
  border-bottom: 1px solid var(--border-subtle);
  background: var(--surface-base);
  &:last-child {
    border-bottom: none;
  }
  .drag-handle {
    cursor: grab;
    user-select: none;
    color: var(--text-muted);
  }
}
.author-picker__remove {
  width: 28px;
  height: 28px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-base);
  border: none;
  background: var(--negative-subtle);
  color: var(--negative);
  font-size: var(--fs-200);
  transition: background-color 0.15s;
  flex-shrink: 0;
  &:hover {
    background: var(--negative-fill);
    color: var(--text-on-status-fill);
  }
}
.author-picker__search-wrap {
  position: relative;
}
.author-picker__dropdown {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  right: 0;
  background: var(--surface-base);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-base);
  box-shadow: var(--shadow-md);
  z-index: 10;
  max-height: 240px;
  overflow-y: auto;
}
.author-picker__option {
  padding: var(--space-2) var(--space-5);
  cursor: pointer;
  font-size: var(--fs-300);
  border-bottom: 1px solid var(--border-subtle);
  &:last-child {
    border-bottom: none;
  }
  &:hover {
    background: var(--surface-raised);
  }
}
</style>

<style lang="scss">
/* Unscoped — SortableJS clones are appended to <body> */
.drag-ghost {
  opacity: 0.9;
  background: var(--surface-base);
  border: 1px solid var(--accent);
  border-radius: var(--radius-base);
  box-shadow: var(--shadow-md);
  padding: var(--space-2) var(--space-5);
}
</style>
