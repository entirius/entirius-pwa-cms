<template>
  <div
    class="find-in-pim-panel p-300 b-basic-300 bb-100"
    data-testid="find-in-pim-panel"
  >
    <DedupSearchBox
      :scope="['pim_product']"
      :initial-query="initialQuery"
      :image-url="imageUrl"
      inline
      data-testid="find-in-pim-box"
      @results="onResults"
    />

    <div class="find-in-pim-panel__results mt-300">
      <CandidateRow
        v-for="hit in hits"
        :key="`${hit.kind}-${hit.ref}`"
        :hit="hit"
      >
        <template #actions>
          <button
            type="button"
            class="row-action-btn bg-positive-100 t-positive-300"
            :disabled="linkingSku === hit.basic?.sku"
            :title="$t('lookup.row.link')"
            :data-testid="`find-in-pim-link-${hit.basic?.sku}`"
            @click="link(hit)"
          >
            <FontAwesomeIcon icon="link" />
          </button>
        </template>
      </CandidateRow>

      <p
        v-if="searched && hits.length === 0"
        class="fs-200 t-basic-500 mt-200"
        data-testid="find-in-pim-empty"
      >
        {{ $t("lookup.find.empty_message") }}
      </p>
    </div>
  </div>
</template>

<script>
import DedupSearchBox from "@/components/lookup/DedupSearchBox.vue";
import CandidateRow from "@/components/lookup/CandidateRow.vue";
import { extractApiMessage } from "@/composables/useFormErrors";
import { useNotifyStore } from "@/stores/notify";
import { POST_LinkToRealProduct } from "@/api/atlas/api";

export default {
  name: "FindInPimPanel",
  components: { DedupSearchBox, CandidateRow },
  props: {
    // The SourceProduct being matched — the link endpoint addresses it by pk.
    productId: { type: [Number, String], required: true },
    // SourceProduct identifiers seeding the search.
    name: { type: String, default: "" },
    ean: { type: String, default: "" },
    imageUrl: { type: String, default: "" },
  },
  emits: ["linked"],
  setup() {
    return { notify: useNotifyStore() };
  },
  data() {
    return {
      hits: [],
      searched: false,
      linkingSku: "",
    };
  },
  computed: {
    initialQuery() {
      return [this.name, this.ean].filter(Boolean).join(" ").trim();
    },
  },
  methods: {
    onResults(response) {
      this.hits = response.hits || [];
      this.searched = true;
    },
    async link(hit) {
      const sku = hit.basic?.sku;
      if (!sku || this.linkingSku) return;
      this.linkingSku = sku;
      try {
        // Attaches the SourceProduct itself (sets real_product), which is what
        // takes it out of the dedup pool — a bare product-link would not.
        await POST_LinkToRealProduct(this.productId, {
          real_product_sku: sku,
        });
        this.notify.spawnNotification({
          type: "positive",
          msg: this.$t("lookup.source_detail.link_success", { sku }),
        });
        this.$emit("linked", sku);
      } catch (err) {
        this.notify.spawnNotification({
          type: "negative",
          msg: extractApiMessage(err, this.$t("notifications.error")),
        });
      } finally {
        this.linkingSku = "";
      }
    },
  },
};
</script>

<style lang="scss" scoped>
.row-action-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: none;
  border-radius: var(--radius-sm);
  cursor: pointer;

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
}
</style>
