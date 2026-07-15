<template>
  <Confirmation-modal :visible="true" @reject="$emit('close')">
    <template #description>
      <h3 class="fs-500 fw-600 mb-300">{{ $t("stock.import_title") }}</h3>

      <div v-if="!report" class="flex fd-col gap-200">
        <p class="fs-300 t-basic-600">{{ $t("stock.import_select_file") }}</p>
        <input
          ref="fileInput"
          type="file"
          accept=".csv"
          class="mb-200"
          @change="onFileSelect"
        />
      </div>

      <div v-else class="flex fd-col gap-100">
        <p class="fs-300 fw-600 t-positive-300 mb-200">{{ $t("stock.import_success") }}</p>
        <div class="flex jc-sb fs-300">
          <span>{{ $t("stock.import_rows_parsed") }}:</span>
          <span class="fw-600">{{ report.rows_parsed }}</span>
        </div>
        <div class="flex jc-sb fs-300">
          <span>{{ $t("stock.import_rows_imported") }}:</span>
          <span class="fw-600 t-positive-300">{{ report.rows_imported }}</span>
        </div>
        <div v-if="report.rows_skipped > 0" class="flex jc-sb fs-300">
          <span>{{ $t("stock.import_rows_skipped") }}:</span>
          <span class="fw-600 t-warning-300">{{ report.rows_skipped }}</span>
        </div>
        <div v-if="report.errors && report.errors.length" class="mt-200">
          <p class="fs-200 fw-600 t-negative-300 mb-100">{{ $t("stock.import_errors") }}:</p>
          <ul class="fs-200 t-basic-600">
            <li v-for="(err, i) in report.errors.slice(0, 10)" :key="i">
              Row {{ err.row }}: {{ err.error }}
            </li>
          </ul>
        </div>
      </div>
    </template>

    <template #footer>
      <button class="modal-btn modal-btn--secondary" @click="$emit('close')">
        {{ report ? "Close" : "Cancel" }}
      </button>
      <button
        v-if="!report"
        class="modal-btn modal-btn--confirm"
        :disabled="!selectedFile || uploading"
        @click="upload"
      >
        {{ uploading ? "Uploading..." : "Upload" }}
      </button>
      <button
        v-if="report"
        class="modal-btn modal-btn--confirm"
        @click="$emit('imported')"
      >
        Done
      </button>
    </template>
  </Confirmation-modal>
</template>

<script>
import { useNotifyStore } from "@/stores/notify"
import { POST_ImportCSV } from "@/api/stock/api"
import { extractApiMessage } from "@/composables/useFormErrors"

export default {
  name: "ImportCSVModal",
  props: {
    warehouseCode: { type: String, required: true },
  },
  emits: ["close", "imported"],
  setup() {
    const notify = useNotifyStore()
    return { notify }
  },
  data() {
    return {
      selectedFile: null,
      uploading: false,
      report: null,
    }
  },
  methods: {
    onFileSelect(event) {
      this.selectedFile = event.target.files[0] || null
    },
    async upload() {
      if (!this.selectedFile) return
      this.uploading = true
      try {
        const formData = new FormData()
        formData.append("file", this.selectedFile)
        const { data } = await POST_ImportCSV(this.warehouseCode, formData)
        this.report = data
      } catch (err) {
        this.notify.spawnNotification({
          type: "negative",
          msg: extractApiMessage(err, this.$t("notifications.error")),
        })
        this.$emit("close")
      } finally {
        this.uploading = false
      }
    },
  },
}
</script>
