<template>
  <div class="p-500 fs-300 t-basic-800 h-100 ov-h">
    <div
      class="bg-basic-100 b-basic-300 br-50 h-100 ovy-auto pl-500 pt-500 pb-500 pr-500"
    >
      <div class="flex ai-ct jc-sb mb-400 gap-300">
        <h1 class="fs-700 fw-600">{{ $t("atlas.duplicates.title") }}</h1>
      </div>
      <p class="fs-300 t-basic-700 mb-400">
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
        class="bg-basic-100 b-basic-300 br-50 p-400 mb-300"
      >
        <div class="flex ai-ct jc-sb mb-300 gap-200">
          <div>
            <p class="fs-200 t-basic-500 fw-600">
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
        <p class="fs-200 t-basic-600 mb-300">{{ group.suggestion_detail }}</p>

        <table class="duplicates-table">
          <thead>
            <tr>
              <th>{{ $t("atlas.duplicates.col.sku") }}</th>
              <th>{{ $t("atlas.duplicates.col.weight") }}</th>
              <th>{{ $t("atlas.duplicates.col.suppliers") }}</th>
              <th>{{ $t("atlas.duplicates.col.actions") }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="rp in group.realproducts" :key="rp.sku">
              <td>
                <span class="fw-600">{{ rp.sku }}</span>
              </td>
              <td>{{ rp.weight ?? "—" }}</td>
              <td>
                <div class="flex ai-ct flex-wrap gap-100">
                  <StatusBadge
                    v-for="s in rp.sources"
                    :key="s.idx"
                    :label="s.is_primary ? `★ ${s.name || s.idx}` : (s.name || s.idx)"
                    :variant="s.is_primary ? 'positive' : 'neutral'"
                  />
                </div>
              </td>
              <td>
                <div class="flex ai-ct flex-wrap gap-100">
                  <button
                    v-for="other in otherRps(group, rp)"
                    :key="other.sku"
                    class="merge-btn"
                    :data-testid="`duplicates-merge-${rp.sku}-to-${other.sku}`"
                    @click="openMergeModal(other.sku, rp.sku)"
                  >
                    {{ $t("atlas.duplicates.action.merge_to", { sku: other.sku }) }}
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
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
.duplicates-table {
  width: 100%;
  border-collapse: collapse;

  th,
  td {
    padding: var(--space-200);
    text-align: left;
    border-bottom: 1px solid var(--c-basic-300);
  }

  th {
    font-size: var(--fs-200);
    font-weight: 600;
    color: var(--c-basic-500);
  }
}

.merge-btn {
  padding: var(--space-100) var(--space-200);
  font-size: var(--fs-200);
  font-weight: 600;
  border-radius: var(--radius-sm);
  background-color: var(--c-positive-100);
  color: var(--c-positive-300);
  border: none;
  cursor: pointer;

  &:hover {
    filter: brightness(0.95);
  }
}
</style>
