<template>
  <div class="p-12 fs-300 t-body h-100 ov-h">
    <div
      class="page-card h-100 ovy-auto"
    >
      <div class="flex ai-ct jc-sb mb-10 gap-8">
        <h1 class="page-title">{{ $t("atlas.duplicates.title") }}</h1>
      </div>
      <p class="fs-300 t-body mb-10">
        {{ $t("atlas.duplicates.subtitle") }}
      </p>

      <Loader v-show="loading" />

      <EmptyState
        v-if="!loading && groups.length === 0"
        :title="$t('atlas.duplicates.empty_title')"
        :message="$t('atlas.duplicates.empty_message')"
        icon="copy"
      />

      <div
        v-for="group in groups"
        :key="group.ean"
        class="page-card duplicates-group mb-8"
      >
        <div class="flex ai-ct jc-sb mb-8 gap-5">
          <div>
            <p class="fs-200 t-muted fw-600">
              {{ $t("atlas.duplicates.col.ean") }}
            </p>
            <p class="fs-500 fw-600">{{ group.ean }}</p>
          </div>
          <StatusBadge
            :label="suggestionLabel(group.suggestion)"
            :variant="suggestionVariant(group.suggestion)"
            :data-testid="`duplicates-suggestion-${group.ean}`"
          />
        </div>
        <p class="fs-200 t-secondary mb-8">{{ group.suggestion_detail }}</p>

        <div class="table-scroll">
          <table class="table-basic duplicates-table">
            <colgroup>
              <col class="duplicates-table__sku" />
              <col class="duplicates-table__weight" />
              <col />
              <col class="duplicates-table__actions" />
            </colgroup>
            <thead>
              <tr>
                <th>{{ $t("atlas.duplicates.col.sku") }}</th>
                <th class="table-basic__numeric">{{ $t("atlas.duplicates.col.weight") }}</th>
                <th>{{ $t("atlas.duplicates.col.suppliers") }}</th>
                <th>{{ $t("atlas.duplicates.col.actions") }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="rp in group.realproducts" :key="rp.sku">
                <td>
                  <span class="fw-600">{{ rp.sku }}</span>
                </td>
                <td class="table-basic__numeric">{{ rp.weight ?? "—" }}</td>
                <td>
                  <div class="flex ai-ct flex-wrap gap-2">
                    <StatusBadge
                      v-for="s in rp.sources"
                      :key="s.idx"
                      :label="s.is_primary ? `★ ${s.name || s.idx}` : (s.name || s.idx)"
                      :variant="s.is_primary ? 'positive' : 'neutral'"
                    />
                  </div>
                </td>
                <td>
                  <div class="flex ai-ct flex-wrap gap-2">
                    <BasicButton
                      v-for="other in otherRps(group, rp)"
                      :text="$t('atlas.duplicates.action.merge_to', { sku: other.sku })"
                      size="sm"
                      class="btn-secondary"
                      :key="other.sku"
                      :data-testid="`duplicates-merge-${rp.sku}-to-${other.sku}`"
                      @click="openMergeModal(other.sku, rp.sku)"
                    />
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <MergeConfirmationModal
      v-if="mergeModal.visible"
      :winner-sku="mergeModal.winnerSku"
      :loser-sku="mergeModal.loserSku"
      @confirmed="onMergeConfirmed"
      @cancelled="closeMergeModal"
    />
  </div>
</template>

<script>
import { GET_Duplicates } from "@/api/atlas/api";
import MergeConfirmationModal from "@/views/Atlas/components/MergeConfirmationModal.vue";
import { useMuninStore } from "@/stores/munin";
import { useNotifyStore } from "@/stores/notify";

export default {
  name: "Duplicates",
  components: { MergeConfirmationModal },
  data() {
    return {
      groups: [],
      loading: false,
      mergeModal: {
        visible: false,
        winnerSku: "",
        loserSku: "",
      },
    };
  },
  computed: {
    hasSuppliersPanel() {
      return useMuninStore().isPanelEnabled("atlas");
    },
  },
  mounted() {
    if (!this.hasSuppliersPanel) {
      this.$router.push("/");
      return;
    }
    this.fetch();
  },
  methods: {
    async fetch() {
      this.loading = true;
      try {
        const { data } = await GET_Duplicates({ tolerance_pct: 10 });
        this.groups = data?.results || [];
      } catch (err) {
        this.groups = [];
        console.error("Duplicates fetch failed", err);
      } finally {
        this.loading = false;
      }
    },
    suggestionLabel(suggestion) {
      return this.$t(`atlas.duplicates.suggestion.${suggestion}`);
    },
    suggestionVariant(suggestion) {
      return suggestion === "merge" ? "positive" : "warning";
    },
    otherRps(group, currentRp) {
      return group.realproducts.filter((rp) => rp.sku !== currentRp.sku);
    },
    openMergeModal(winnerSku, loserSku) {
      this.mergeModal = { visible: true, winnerSku, loserSku };
    },
    closeMergeModal() {
      this.mergeModal = { visible: false, winnerSku: "", loserSku: "" };
    },
    onMergeConfirmed(payload) {
      const notify = useNotifyStore();
      notify.spawnNotification({
        type: "positive",
        msg: this.$t("atlas.duplicates.merge_modal.success", {
          winner: payload.winner_sku,
          loser: payload.loser_sku,
          n: payload.links_redirected,
        }),
      });
      this.closeMergeModal();
      this.fetch();
    },
  },
};
</script>

<style lang="scss" scoped>
// Every EAN group shares one column grid, so SKU, suppliers and actions line up from group to group.
.duplicates-table {
  table-layout: fixed;
  min-width: 760px;
}

.duplicates-table__sku {
  width: 200px;
}

.duplicates-table__weight {
  width: 100px;
}

.duplicates-table__actions {
  width: 280px;
}

</style>
