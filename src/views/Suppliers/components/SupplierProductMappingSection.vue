<template>
  <section class="sp-mapping-section">
    <header class="sp-mapping-section__head">
      <h3 class="fs-300 fw-600 m-0">
        {{ $t("suppliers.products.drawer.mapping_title") }}
      </h3>
      <button
        v-if="supplierIdx"
        class="sp-mapping-section__link"
        :data-testid="`drawer-open-mappings-${supplierIdx}`"
        @click="$emit('open-mappings')"
      >
        {{ $t("suppliers.products.drawer.open_mappings_tab") }}
      </button>
    </header>
    <Loader v-if="loading" />
    <p v-else-if="!profiles.length" class="fs-200 t-basic-500 m-0">
      {{ $t("suppliers.products.drawer.no_mapping_profiles") }}
    </p>
    <ul v-else class="sp-mapping-section__profiles">
      <li v-for="p in profiles" :key="p.id" class="sp-mapping-section__profile">
        <div class="flex ai-ct jc-sb gap-200 flex-wrap">
          <span class="fw-600">{{ p.name || p.idx }}</span>
          <span class="fs-200 t-basic-500">
            {{ $t("suppliers.products.drawer.mapping_counts", {
              attrs: p._attrCount,
              cats: p._catCount,
            }) }}
          </span>
        </div>
      </li>
    </ul>
  </section>
</template>

<script>
import {
  GET_MappingProfiles,
  GET_AttributeMappings,
  GET_CategoryMappings,
} from "@/api/suppliers/api";

export default {
  name: "SupplierProductMappingSection",
  props: {
    supplierIdx: { type: String, required: true },
  },
  emits: ["open-mappings"],
  data() {
    return {
      profiles: [],
      loading: false,
    };
  },
  watch: {
    supplierIdx: {
      immediate: true,
      handler(val) {
        if (val) this.fetchProfiles(val);
        else this.profiles = [];
      },
    },
  },
  methods: {
    async fetchProfiles(idx) {
      this.loading = true;
      try {
        const { data } = await GET_MappingProfiles(idx, { page_size: 20 });
        const profiles = data?.results || [];
        await Promise.all(profiles.map((p) => this.hydrateCounts(p)));
        this.profiles = profiles;
      } catch (err) {
        this.profiles = [];
      } finally {
        this.loading = false;
      }
    },
    async hydrateCounts(profile) {
      profile._attrCount = 0;
      profile._catCount = 0;
      try {
        const [attrRes, catRes] = await Promise.all([
          GET_AttributeMappings(profile.id, { page_size: 1 }),
          GET_CategoryMappings(profile.id, { page_size: 1 }),
        ]);
        profile._attrCount = attrRes.data?.count ?? attrRes.data?.results?.length ?? 0;
        profile._catCount = catRes.data?.count ?? catRes.data?.results?.length ?? 0;
      } catch (err) {
        // soft-fail
      }
    },
  },
};
</script>

<style lang="scss" scoped>
.sp-mapping-section {
  margin-top: var(--space-300);
  padding-top: var(--space-300);
  border-top: 1px solid var(--c-basic-200);
}
.sp-mapping-section__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-200);
  margin-bottom: var(--space-100);
}
.sp-mapping-section__link {
  background: transparent;
  border: 1px solid var(--c-basic-300);
  border-radius: var(--radius-sm);
  padding: 4px 12px;
  font-size: var(--fs-200);
  color: var(--c-basic-700);
  cursor: pointer;

  &:hover {
    background: var(--c-basic-200);
  }
}
.sp-mapping-section__profiles {
  list-style: none;
  margin: 0;
  padding: 0;
}
.sp-mapping-section__profile {
  padding: var(--space-100) 0;
  border-bottom: 1px solid var(--c-basic-200);

  &:last-child {
    border-bottom: 0;
  }
}
</style>
