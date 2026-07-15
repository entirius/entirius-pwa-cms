<template>
  <SideDrawer
    :visible="visible"
    :title="drawerTitle"
    width="680px"
    @close="$emit('close')"
  >
    <div class="task-queue">
      <Loader v-show="loading" />

      <DataTable
        v-show="!loading && rows.length"
        :columns="columns"
        :rows="rows"
        row-key="key"
        :empty-text="$t('enrichment.queue.empty')"
      >
        <template #cell-sku="{ row }">
          <button
            type="button"
            class="task-queue__sku t-primary-300"
            :data-testid="`queue-sku-${row.sku}`"
            @click="goToPim(row.sku)"
          >
            {{ row.sku }}
          </button>
        </template>
        <template #cell-priority="{ value }">
          <span class="fs-200 t-basic-600">{{ value ?? "—" }}</span>
        </template>
      </DataTable>

      <EmptyState
        v-if="!loading && !rows.length"
        icon="list-check"
        :title="$t('enrichment.queue.empty')"
        :message="reachedEnd && page > 1 ? $t('enrichment.queue.end') : ''"
      />
    </div>

    <div class="task-queue__pager flex ai-ct jc-ct gap-200">
      <button
        type="button"
        class="task-queue__btn bg-basic-200 t-basic-600"
        :disabled="loading || page <= 1"
        data-testid="queue-prev"
        @click="prevPage"
      >
        {{ $t("enrichment.queue.prev") }}
      </button>
      <span class="fs-200 t-basic-500">
        {{ $t("enrichment.queue.page", { page }) }}
      </span>
      <button
        type="button"
        class="task-queue__btn bg-basic-200 t-basic-600"
        :disabled="loading || !hasMore"
        data-testid="queue-next"
        @click="nextPage"
      >
        {{ $t("enrichment.queue.next") }}
      </button>
    </div>
  </SideDrawer>
</template>

<script>
import { useNotifyStore } from "@/stores/notify";
import { extractApiMessage } from "@/composables/useFormErrors";
import { GET_TaskTargets } from "@/api/enrichment/api";

export default {
  name: "TaskQueueDrawer",
  props: {
    visible: { type: Boolean, default: false },
    taskId: { type: Number, default: null },
    taskLabel: { type: String, default: "" },
  },
  emits: ["close"],
  setup() {
    return { notify: useNotifyStore() };
  },
  data() {
    return {
      targets: [],
      page: 1,
      loading: false,
      reachedEnd: false,
    };
  },
  computed: {
    drawerTitle() {
      return this.taskLabel
        ? `${this.$t("enrichment.queue.title")} — ${this.taskLabel}`
        : this.$t("enrichment.queue.title");
    },
    columns() {
      return [
        { key: "sku", label: this.$t("enrichment.queue.sku"), width: "1.4fr" },
        { key: "kind", label: this.$t("enrichment.queue.kind"), width: "1fr" },
        { key: "locator", label: this.$t("enrichment.queue.locator"), width: "1fr" },
        { key: "priority", label: this.$t("enrichment.queue.priority"), width: "90px" },
      ];
    },
    rows() {
      return this.targets.map((t, i) => {
        const loc = t.target_locator || {};
        return {
          key: `${t.subject_ref}__${t.target_kind}__${i}`,
          sku: t.subject_ref,
          kind: t.target_kind || "—",
          locator: loc.language || loc.channel || "—",
          priority: t.priority,
        };
      });
    },
    // No total count from the API — a full-looking page means "maybe more".
    hasMore() {
      return !this.reachedEnd && this.targets.length > 0;
    },
  },
  watch: {
    visible(open) {
      if (open) {
        this.page = 1;
        this.fetchTargets();
      }
    },
    taskId() {
      if (this.visible) {
        this.page = 1;
        this.fetchTargets();
      }
    },
  },
  methods: {
    async fetchTargets() {
      if (!this.taskId) {
        this.targets = [];
        return;
      }
      this.loading = true;
      try {
        const { data } = await GET_TaskTargets(this.taskId, { page: this.page });
        this.targets = data.targets || [];
        this.reachedEnd = this.targets.length === 0;
      } catch (err) {
        this.targets = [];
        this.notify.spawnNotification({
          type: "negative",
          msg: extractApiMessage(err, this.$t("notifications.error")),
        });
      } finally {
        this.loading = false;
      }
    },
    nextPage() {
      if (!this.hasMore) return;
      this.page += 1;
      this.fetchTargets();
    },
    prevPage() {
      if (this.page <= 1) return;
      this.page -= 1;
      this.fetchTargets();
    },
    goToPim(sku) {
      this.$router.push({ name: "PimProductDetail", params: { sku } });
    },
  },
};
</script>

<style lang="scss" scoped>
.task-queue {
  padding: var(--space-300);
}
.task-queue__sku {
  background: none;
  border: none;
  padding: 0;
  font: inherit;
  cursor: pointer;
  text-align: left;
}
.task-queue__pager {
  padding: var(--space-300);
  border-top: 1px solid var(--c-basic-200);
}
.task-queue__btn {
  display: inline-flex;
  align-items: center;
  gap: var(--space-100);
  height: var(--elem-height);
  padding: 0 16px;
  border: none;
  border-radius: var(--radius-sm);
  font-size: var(--fs-200);
  cursor: pointer;
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
}
</style>
