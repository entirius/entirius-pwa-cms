<template>
  <div class="p-500 fs-300 t-basic-800 h-100 ov-h">
    <div
      class="bg-basic-100 b-basic-300 br-50 h-100 ovy-auto pl-500 pt-500 pb-500 pr-500"
    >
      <Teleport v-if="toolbarReady" to="#forms-toolbar-left">
        <BasicButton
          variant="ghost"
          icon="arrow-left"
          :label="$t('cf.back_to_list')"
          @click="$router.push('/forms/list')"
        />
      </Teleport>

      <Loader v-if="loading" />

      <template v-else-if="submission">
        <div class="flex ai-ct jc-sb mb-200">
          <h1 class="fs-700 fw-600">{{ $t("cf.submission_detail") }}</h1>
          <Dropdown
            :values="statusOptions"
            :selected="[submission.status]"
            :placeholder="$t('cf.status')"
            class="cf-status-dropdown"
            @onSelect="updateStatus"
          />
        </div>
        <div class="mb-400">
          <StatusBadge
            :label="statusLabel(submission.status)"
            :variant="statusVariant(submission.status)"
          />
        </div>

        <!-- Header info -->
        <div class="cf-header mb-400">
          <div class="cf-header__row">
            <span class="cf-header__label t-basic-500 fs-200 fw-600 tt-upper">{{
              $t("cf.id")
            }}</span>
            <span class="t-basic-800">{{ submission.id }}</span>
          </div>
          <div class="cf-header__row">
            <span class="cf-header__label t-basic-500 fs-200 fw-600 tt-upper">{{
              $t("cf.email")
            }}</span>
            <span class="t-basic-800">{{ submission.email }}</span>
          </div>
          <div class="cf-header__row">
            <span class="cf-header__label t-basic-500 fs-200 fw-600 tt-upper">{{
              $t("cf.channel")
            }}</span>
            <span class="t-basic-800">{{ submission.channel_idx }}</span>
          </div>
          <div class="cf-header__row">
            <span class="cf-header__label t-basic-500 fs-200 fw-600 tt-upper">{{
              $t("cf.type")
            }}</span>
            <span :class="submission.type ? 't-basic-800' : 't-basic-400'">{{
              submission.type || "---"
            }}</span>
          </div>
          <div class="cf-header__row">
            <span class="cf-header__label t-basic-500 fs-200 fw-600 tt-upper">{{
              $t("cf.slug")
            }}</span>
            <span class="t-basic-800">{{ submission.slug || "---" }}</span>
          </div>
          <div class="cf-header__row">
            <span class="cf-header__label t-basic-500 fs-200 fw-600 tt-upper">{{
              $t("cf.code")
            }}</span>
            <span class="t-basic-800">{{ submission.code || "---" }}</span>
          </div>
          <div class="cf-header__row cf-header__row--full">
            <span class="cf-header__label t-basic-500 fs-200 fw-600 tt-upper">{{
              $t("cf.created_at")
            }}</span>
            <span class="t-basic-800">{{
              formatDate(submission.created_at)
            }}</span>
          </div>

          <!-- Form Data — full-width row at the bottom of the header grid -->
          <div class="cf-header__row cf-header__row--full">
            <h2 class="fs-400 fw-600 mb-200">{{ $t("cf.body") }}</h2>
            <div
              v-if="isRenderableObject(submission.body)"
              class="cf-fields bg-basic-200 br-50 p-300"
            >
              <div
                v-for="(val, key) in submission.body"
                :key="key"
                class="cf-field"
                :class="{ 'cf-field--full': key === 'message' }"
              >
                <span
                  class="cf-field__label t-basic-500 fs-200 fw-600 tt-upper"
                  >{{ humanizeKey(key) }}</span
                >
                <span v-if="isSimpleValue(val)" class="t-basic-800 fs-300">{{
                  val
                }}</span>
                <pre
                  v-else
                  class="cf-body--nested bg-basic-100 br-50 p-200 fs-200 t-basic-700 mt-50"
                  >{{ JSON.stringify(val, null, 2) }}</pre
                >
              </div>
            </div>
            <pre
              v-else
              class="cf-body bg-basic-200 br-50 p-300 fs-200 t-basic-700"
              >{{ formatBody(submission.body) }}</pre
            >
          </div>
        </div>

        <!-- Attachments -->
        <div v-if="submission.attachments && submission.attachments.length">
          <h2 class="fs-400 fw-600 mb-200">{{ $t("cf.attachments") }}</h2>
          <div class="cf-attachments">
            <div
              v-for="att in submission.attachments"
              :key="att.id"
              class="cf-attachment flex ai-ct gap-200 p-200 bg-basic-200 br-50 mb-100"
            >
              <font-awesome-icon icon="paperclip" class="t-basic-500" />
              <span class="t-basic-800 fs-200">{{ att.name }}</span>
              <BasicButton
                variant="ghost"
                icon="download"
                size="sm"
                @click="downloadAttachment(att)"
              />
            </div>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<script>
import { useLoaderStore } from "@/stores/loader";
import { useNotifyStore } from "@/stores/notify";
import {
  GET_Submission,
  GET_AttachmentDownload,
  PATCH_SubmissionStatus,
} from "@/api/contactForms/api";
import { extractApiMessage } from "@/composables/useFormErrors";

export default {
  name: "ContactFormDetail",
  setup() {
    const loader = useLoaderStore();
    const notify = useNotifyStore();
    return { loader, notify };
  },
  data() {
    return {
      submission: null,
      loading: false,
      toolbarReady: false,
    };
  },
  computed: {
    statusOptions() {
      return [
        { label: this.$t("cf.status_todo"), value: "todo" },
        { label: this.$t("cf.status_in_progress"), value: "in_progress" },
        { label: this.$t("cf.status_done"), value: "done" },
      ];
    },
  },
  mounted() {
    this.toolbarReady = !!document.getElementById("forms-toolbar-left");
    this.fetchSubmission();
  },
  methods: {
    statusVariant(status) {
      const map = {
        todo: "warning",
        in_progress: "informative",
        done: "positive",
      };
      return map[status] || "neutral";
    },
    statusLabel(status) {
      const map = {
        todo: this.$t("cf.status_todo"),
        in_progress: this.$t("cf.status_in_progress"),
        done: this.$t("cf.status_done"),
      };
      return map[status] || status || "---";
    },
    async updateStatus(newStatus) {
      if (newStatus === this.submission.status) return;
      try {
        const { data } = await PATCH_SubmissionStatus(this.submission.id, {
          status: newStatus,
        });
        this.submission.status = data.status;
        this.notify.spawnNotification({
          type: "positive",
          msg: this.$t("cf.status_updated"),
        });
      } catch (err) {
        this.notify.spawnNotification({
          type: "negative",
          msg: extractApiMessage(err, this.$t("notifications.error")),
        });
      }
    },
    formatDate(isoStr) {
      if (!isoStr) return "---";
      const d = new Date(isoStr);
      return d.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    },
    formatBody(body) {
      if (!body) return "---";
      if (typeof body === "string") return body;
      return JSON.stringify(body, null, 2);
    },
    isRenderableObject(body) {
      return body && typeof body === "object" && !Array.isArray(body);
    },
    isSimpleValue(val) {
      return val === null || typeof val !== "object";
    },
    humanizeKey(key) {
      return key.replace(/[_-]/g, " ").replace(/([a-z])([A-Z])/g, "$1 $2");
    },
    async fetchSubmission() {
      const pk = this.$route.params.id;
      this.loading = true;
      try {
        const { data } = await GET_Submission(pk);
        this.submission = data;
      } catch (err) {
        this.notify.spawnNotification({
          type: "negative",
          msg: extractApiMessage(err, this.$t("notifications.error")),
        });
      } finally {
        this.loading = false;
      }
    },
    async downloadAttachment(att) {
      try {
        const response = await GET_AttachmentDownload(
          this.submission.id,
          att.id
        );
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", att.name || "attachment");
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
      } catch (err) {
        this.notify.spawnNotification({
          type: "negative",
          msg: this.$t("notifications.error"),
        });
      }
    },
  },
};
</script>

<style lang="scss" scoped>
.cf-header {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
}

.cf-header__row {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.cf-header__row--full {
  grid-column: 1 / -1;
}

.cf-fields {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.cf-field {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.cf-field--full {
  grid-column: 1 / -1;
}

.cf-status-dropdown {
  width: 160px;
  flex-shrink: 0;
}

.cf-body,
.cf-body--nested {
  white-space: pre-wrap;
  word-break: break-word;
  overflow-x: auto;
  max-height: 400px;
}
</style>
