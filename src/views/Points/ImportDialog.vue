<template>
  <div class="p-12 fs-300 t-body h-100 ov-h">
    <div class="page-card h-100 ovy-auto">
      <div class="flex ai-ct mb-12">
        <BackBar
          @back="$router.push('/points/list')"
        />
      </div>

      <h1 class="mb-12">{{ $t("dp.import") }}</h1>

      <div class="import-card">
        <!-- File input -->
        <div class="detail-field mb-10">
          <label class="field-label">{{ $t("dp.import_file") }}</label>
          <input
            ref="fileInput"
            type="file"
            accept=".csv"
            class="file-input"
            @change="onFileChange"
          />
          <span v-if="!selectedFile" class="fs-200 t-muted">
            {{ $t("dp.import_file") }} (.csv)
          </span>
          <span v-else class="fs-200 t-body fw-600">
            {{ selectedFile.name }}
          </span>
          <BasicButton
            :text="$t('gallery.upload')"
            class="btn-secondary mt-5"
            @click="$refs.fileInput.click()"
          />
        </div>

        <!-- Type selection -->
        <div class="detail-field mb-10">
          <label class="field-label">{{ $t("dp.import_type") }}</label>
          <Dropdown
            :values="typeOptions"
            :selected="typeCode ? [typeCode] : []"
            :placeholder="$t('common.select')"
            @onSelect="(val) => (typeCode = val)"
          />
        </div>

        <!-- Mode selection -->
        <div class="detail-field mb-10">
          <label class="field-label">{{ $t("dp.import_mode") }}</label>
          <div class="flex flex-column gap-5 mt-2">
            <label class="radio-option">
              <input v-model="mode" type="radio" value="incremental" />
              <span class="fs-300">{{ $t("dp.import_mode_incremental") }}</span>
            </label>
            <label class="radio-option">
              <input v-model="mode" type="radio" value="full" />
              <span class="fs-300">{{ $t("dp.import_mode_full") }}</span>
            </label>
          </div>
        </div>

        <!-- Optional channel -->
        <div class="detail-field mb-12">
          <label class="field-label">{{ $t("dp.import_channel") }}</label>
          <BasicInput
            v-model="channelIdx"
            :placeholder="$t('dp.import_channel')"
            class="import-input"
          />
        </div>

        <!-- Result summary -->
        <div v-if="importResult" class="import-result mb-10">
          <StatusBadge label="Import complete" variant="positive" />
          <p class="fs-300 t-body mt-5">
            {{
              $t("dp.import_success", {
                created: importResult.created || 0,
                updated: importResult.updated || 0,
                disabled: importResult.disabled || 0,
              })
            }}
          </p>
        </div>

        <BasicButton
          :text="$t('dp.import_submit')"
          class="btn-primary"
          :disabled="submitting || !selectedFile"
          @click="submitImport"
        />
      </div>
    </div>
  </div>
</template>

<script>
import { useLoaderStore } from "@/stores/loader";
import { useNotifyStore } from "@/stores/notify";
import { GET_Types, POST_Import } from "@/api/deliverypoints/api";
import { extractApiMessage } from "@/composables/useFormErrors";

export default {
  name: "ImportDialog",
  setup() {
    const loader = useLoaderStore();
    const notify = useNotifyStore();
    return { loader, notify };
  },
  data() {
    return {
      types: [],
      selectedFile: null,
      typeCode: "",
      mode: "incremental",
      channelIdx: "",
      submitting: false,
      importResult: null,
    };
  },
  computed: {
    typeOptions() {
      return this.types.map((t) => ({ label: t.name, value: t.code }));
    },
  },
  mounted() {
    this.fetchTypes();
  },
  methods: {
    async fetchTypes() {
      try {
        const { data } = await GET_Types({ page_size: 100 });
        this.types = data.results || [];
      } catch (err) {
        this.notify.spawnNotification({
          type: "negative",
          msg: extractApiMessage(err, this.$t("notifications.error")),
        });
      }
    },
    onFileChange(event) {
      this.selectedFile = event.target.files[0] || null;
      this.importResult = null;
    },
    async submitImport() {
      if (!this.selectedFile) return;

      this.submitting = true;
      this.loader.loaderStart();
      try {
        const formData = new FormData();
        formData.append("file", this.selectedFile);
        formData.append("mode", this.mode);
        if (this.typeCode) formData.append("type_code", this.typeCode);
        if (this.channelIdx) formData.append("channel_idx", this.channelIdx);

        const { data } = await POST_Import(formData);
        this.importResult = data;

        this.notify.spawnNotification({
          type: "positive",
          msg: this.$t("dp.import_success", {
            created: data.created || 0,
            updated: data.updated || 0,
            disabled: data.disabled || 0,
          }),
        });

        this.selectedFile = null;
        if (this.$refs.fileInput) {
          this.$refs.fileInput.value = "";
        }
      } catch (err) {
        this.notify.spawnNotification({
          type: "negative",
          msg: extractApiMessage(err, this.$t("notifications.error")),
        });
      } finally {
        this.submitting = false;
        this.loader.loaderFinish();
      }
    },
  },
};
</script>

<style lang="scss" scoped>
.import-card {
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-base);
  padding: var(--space-6);
  max-width: 600px;
}

.detail-field {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}


.import-input {
  max-width: 300px;
}

.file-input {
  display: none;
}

.radio-option {
  display: flex;
  align-items: center;
  gap: var(--space-5);
  cursor: pointer;
}

.import-result {
  padding: var(--space-4);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-base);
  background: var(--surface-raised);
}
</style>
