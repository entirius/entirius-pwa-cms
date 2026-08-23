<template>
  <div class="dedup-search-box" :class="{ 'dedup-search-box--inline': inline }">
    <div class="dedup-search-box__row">
      <BasicInput
        v-model="q"
        :placeholder="$t('lookup.box.placeholder')"
        class="dedup-search-box__input"
        data-testid="dedup-search-input"
        @onKeyDown="search"
        @paste="onPaste"
      />
      <ImagePickerThumb
        :preview-url="previewUrl"
        :alt-text="q"
        @pick="setImage"
        @remove="removeImage"
      />
      <BasicButton
        :text="$t('lookup.box.search_button')"
        :is-disabled="loading || !canSearch"
        data-testid="dedup-search-submit"
        @click="search"
      />
    </div>

    <div class="dedup-search-box__scope">
      <FilterChip
        v-for="opt in scopeOptions"
        :key="opt.value"
        :label="$t(opt.labelKey)"
        :active="activeScope.includes(opt.value)"
        :data-testid="`dedup-search-scope-${opt.value}`"
        @click="toggleScope(opt.value)"
      />
      <span class="dedup-search-box__hint fs-200 t-basic-500">
        {{ $t("lookup.box.drop_hint") }}
      </span>
    </div>

    <p
      v-if="displayError"
      class="dedup-search-box__error fs-200 t-negative-300"
    >
      {{ displayError }}
    </p>
  </div>
</template>

<script>
import { computed } from "vue";
import { POST_LookupCheck } from "@/api/lookup/api";
import { extractApiMessage } from "@/composables/useFormErrors";
import { useImagePicker } from "@/composables/useImagePicker";
import { buildLookupPayload } from "@/utils/lookupPayload";
import ImagePickerThumb from "./ImagePickerThumb.vue";

const SCOPE_OPTIONS = [
  { value: "pim_product", labelKey: "lookup.box.scope_pim" },
  { value: "atlas_source_product", labelKey: "lookup.box.scope_atlas" },
];

export default {
  name: "DedupSearchBox",
  components: { ImagePickerThumb },
  props: {
    scope: {
      type: Array,
      default: () => ["pim_product", "atlas_source_product"],
    },
    inline: { type: Boolean, default: false },
    initialQuery: { type: String, default: "" },
    imageUrl: { type: String, default: "" },
  },
  emits: ["results"],
  setup(props) {
    return {
      ...useImagePicker(computed(() => props.imageUrl)),
      scopeOptions: SCOPE_OPTIONS,
    };
  },
  data() {
    return {
      q: this.initialQuery,
      activeScope: [...this.scope],
      loading: false,
      error: "",
    };
  },
  computed: {
    canSearch() {
      return !!this.q.trim() || !!this.previewUrl;
    },
    displayError() {
      return this.error || (this.imageError ? this.$t(this.imageError) : "");
    },
  },
  methods: {
    toggleScope(value) {
      const has = this.activeScope.includes(value);
      if (has && this.activeScope.length === 1) return; // keep at least one catalog
      this.activeScope = has
        ? this.activeScope.filter((v) => v !== value)
        : [...this.activeScope, value];
    },
    async search() {
      if (!this.canSearch || this.loading) return;
      this.loading = true;
      this.error = "";
      const payload = buildLookupPayload({
        scope: this.activeScope,
        q: this.q,
        imageBlob: this.imageBlob,
        imageUrl: this.imageUrl,
        imageRemoved: this.imageRemoved,
      });
      try {
        const { data } = await POST_LookupCheck(payload);
        this.$emit("results", {
          ...data,
          hits: data.hits || data.candidates || [],
          q: this.q,
        });
      } catch (err) {
        this.error = extractApiMessage(err, this.$t("notifications.error"));
      } finally {
        this.loading = false;
      }
    },
  },
};
</script>

<style lang="scss" scoped>
.dedup-search-box {
  display: flex;
  flex-direction: column;
  gap: var(--space-200);

  &__row,
  &__scope {
    display: flex;
    align-items: center;
    gap: var(--space-200);
  }
  &__input {
    flex: 1;
  }
  &__hint,
  &__error {
    margin: 0;
  }
}
</style>
