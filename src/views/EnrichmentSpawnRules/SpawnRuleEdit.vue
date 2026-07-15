<template>
  <div class="spawn-rule-edit p-500 fs-300 t-basic-800 h-100 ov-h">
    <div class="bg-basic-100 b-basic-300 br-50 flex-1 ovy-auto p-500">
      <div class="flex ai-ct gap-200 mb-400">
        <BasicButton
          text=""
          icon="arrow-left"
          class="bg-basic-200 t-basic-600"
          @click="$router.push('/enrichment/spawn-rules')"
        />
        <h1 class="fs-700 fw-600 m-0">
          {{ isCreate ? $t("enrichment.spawn_rules.create") : form.key }}
        </h1>
        <div class="flex ai-ct gap-200 ml-auto">
          <BasicButton
            v-if="!isCreate"
            :text="$t('enrichment.spawn_rules.run_now')"
            class="bg-basic-200 t-basic-600"
            data-test="spawn-rule-run-btn"
            @click="runRule"
          />
          <BasicButton
            v-if="!isCreate"
            text=""
            icon="trash-can"
            class="bg-negative-100 t-negative-300"
            data-test="spawn-rule-delete-btn"
            @click="showDeleteConfirm = true"
          />
          <BasicButton
            :text="$t('common.save')"
            class="bg-support-400 t-basic-100"
            data-test="spawn-rule-save-btn"
            @click="save"
          />
        </div>
      </div>

      <Loader v-if="loading" />

      <template v-else>
        <div class="spawn-rule-grid">
          <FormField
            :label="$t('enrichment.spawn_rules.col_key')"
            :tooltip="$t('enrichment.spawn_rules.key_hint')"
            :error="fieldErr('key')"
          >
            <BasicInput v-model="form.key" :isDisabled="!isCreate" data-test="spawn-rule-key" />
          </FormField>

          <FormField
            :label="$t('enrichment.spawn_rules.col_module')"
            :tooltip="$t('enrichment.spawn_rules.module_hint')"
          >
            <BasicInput v-model="form.module" :isDisabled="true" />
          </FormField>

          <FormField
            :label="$t('enrichment.spawn_rules.col_check')"
            :tooltip="$t('enrichment.spawn_rules.check_hint')"
            :error="fieldErr('check_key')"
          >
            <Dropdown
              v-if="checkOptions.length"
              :values="checkOptions"
              :selected="[form.check_key]"
              :placeholder="$t('common.select')"
              @onSelect="(v) => (form.check_key = v)"
            />
            <!-- Soft-compat: no PIM gaps API (old backend / other module) → free text. -->
            <BasicInput v-else v-model="form.check_key" data-test="spawn-rule-check-input" />
          </FormField>

          <FormField :label="$t('enrichment.spawn_rules.col_task_type')">
            <Dropdown
              :values="taskTypeOptions"
              :selected="[form.task_type]"
              :placeholder="$t('common.select')"
              @onSelect="(v) => (form.task_type = v)"
            />
          </FormField>

          <FormField :label="$t('enrichment.spawn_rules.scope_channel')">
            <Dropdown
              v-if="channelOptions.length"
              :values="channelOptions"
              :selected="[scopeChannel]"
              :placeholder="$t('common.select')"
              @onSelect="(v) => (scopeChannel = v)"
            />
            <BasicInput v-else v-model="scopeChannel" />
          </FormField>

          <FormField
            :label="$t('enrichment.spawn_rules.scope_language')"
            :tooltip="$t('enrichment.spawn_rules.scope_language_hint')"
          >
            <Dropdown
              :values="languageOptions"
              :selected="[scopeLanguage]"
              :placeholder="$t('enrichment.spawn_rules.all_languages')"
              @onSelect="(v) => (scopeLanguage = v)"
            />
          </FormField>

          <FormField
            :label="$t('enrichment.spawn_rules.limit')"
            :tooltip="$t('enrichment.spawn_rules.limit_hint')"
          >
            <BasicInput v-model="limitStr" :placeholder="$t('enrichment.spawn_rules.backend_default')" />
          </FormField>

          <FormField
            :label="$t('enrichment.spawn_rules.cooldown_days')"
            :tooltip="$t('enrichment.spawn_rules.cooldown_hint')"
          >
            <BasicInput
              v-model="cooldownStr"
              :placeholder="$t('enrichment.spawn_rules.backend_default')"
            />
          </FormField>

          <div class="flex ai-ct gap-300">
            <Switcher
              :label="$t('enrichment.spawn_rules.col_auto')"
              :selected="form.auto"
              @onSelect="form.auto = !form.auto"
            />
            <Switcher
              :label="$t('enrichment.spawn_rules.col_active')"
              :selected="form.active"
              @onSelect="form.active = !form.active"
            />
          </div>
        </div>
      </template>

      <Confirmation-modal
        :visible="showDeleteConfirm"
        @accept="deleteRule"
        @reject="showDeleteConfirm = false"
      >
        <template #description>
          <p>{{ $t("enrichment.spawn_rules.confirm_delete") }}</p>
        </template>
      </Confirmation-modal>
    </div>
  </div>
</template>

<script>
import { useLoaderStore } from "@/stores/loader";
import { useNotifyStore } from "@/stores/notify";
import { usePimChannelStore } from "@/stores/pimChannel";
import { extractApiMessage, useFormErrors } from "@/composables/useFormErrors";
import {
  DELETE_SpawnRule,
  GET_SpawnRule,
  PATCH_SpawnRule,
  POST_SpawnRule,
  POST_SpawnRuleRun,
} from "@/api/enrichment/api";
import { GET_GapDefinitions } from "@/api/pim/api";
import ConfirmationModal from "@/functionals/Confirmation-modal/index.vue";

const TASK_TYPES = ["fix-attribute", "fill-attribute", "translate"];
const KEY_PATTERN = /^[a-z0-9][a-z0-9_-]*$/;

export default {
  name: "SpawnRuleEdit",
  components: { ConfirmationModal },
  setup() {
    const loader = useLoaderStore();
    const notify = useNotifyStore();
    const pimChannel = usePimChannelStore();
    const formErrors = useFormErrors();
    return { loader, notify, pimChannel, ...formErrors };
  },
  data() {
    return {
      form: {
        key: "",
        module: "pim",
        check_key: "",
        task_type: "fix-attribute",
        task_params: {},
        params: {},
        auto: false,
        active: true,
      },
      scopeChannel: "",
      scopeLanguage: "",
      limitStr: "",
      cooldownStr: "",
      checkOptions: [],
      loading: false,
      showDeleteConfirm: false,
    };
  },
  computed: {
    isCreate() {
      return !this.$route.params.key;
    },
    taskTypeOptions() {
      return TASK_TYPES.map((t) => ({ label: t, value: t }));
    },
    channelOptions() {
      return (this.pimChannel.channels || []).map((ch) => ({
        label: ch.name || ch.idx,
        value: ch.idx,
      }));
    },
    // Languages of the selected channel (that's exactly what find_gaps filters on);
    // before a channel is picked, the union across channels. "" = all languages.
    languageOptions() {
      const channel = (this.pimChannel.channels || []).find((ch) => ch.idx === this.scopeChannel);
      const langs = channel ? channel.languages || [] : this.pimChannel.allLanguages || [];
      return [
        { label: this.$t("enrichment.spawn_rules.all_languages"), value: "" },
        ...langs.map((l) => ({ label: l, value: l })),
      ];
    },
  },
  watch: {
    scopeChannel() {
      const valid = this.languageOptions.some((o) => o.value === this.scopeLanguage);
      if (!valid) this.scopeLanguage = "";
    },
  },
  async mounted() {
    if (!this.pimChannel.channels?.length) this.pimChannel.fetchChannels?.();
    this.fetchChecks();
    if (!this.isCreate) await this.fetchRule();
  },
  methods: {
    fieldErr(name) {
      return this.getFieldError(name)?.msg || "";
    },
    // The check catalogue lives in the source module (PIM gap definitions). The CMS may call
    // both APIs — soft-compat: when the call fails (old PIM, other module), fall back to free text.
    async fetchChecks() {
      try {
        const { data } = await GET_GapDefinitions({ page_size: 100, is_active: true });
        this.checkOptions = (data.results || []).map((d) => ({ label: d.key, value: d.key }));
      } catch {
        this.checkOptions = [];
      }
    },
    async fetchRule() {
      this.loading = true;
      try {
        const { data } = await GET_SpawnRule(this.$route.params.key);
        this.form = {
          key: data.key,
          module: data.module,
          check_key: data.check_key,
          task_type: data.task_type,
          task_params: data.task_params || {},
          params: data.params || {},
          auto: data.auto,
          active: data.active,
        };
        this.scopeChannel = data.scope?.channel || "";
        this.scopeLanguage = data.scope?.language || "";
        this.limitStr = data.limit != null ? String(data.limit) : "";
        this.cooldownStr = data.cooldown_days != null ? String(data.cooldown_days) : "";
      } catch (err) {
        this.notify.spawnNotification({
          type: "negative",
          msg: extractApiMessage(err, this.$t("notifications.error")),
        });
      } finally {
        this.loading = false;
      }
    },
    validateLocal() {
      this.clearErrors();
      let ok = true;
      if (this.isCreate && !KEY_PATTERN.test(this.form.key.trim())) {
        this.errors.key = { status: "error", msg: this.$t("enrichment.spawn_rules.key_invalid") };
        ok = false;
      }
      if (!this.form.check_key.trim()) {
        this.errors.check_key = {
          status: "error",
          msg: this.$t("enrichment.spawn_rules.check_required"),
        };
        ok = false;
      }
      return ok;
    },
    buildPayload() {
      const scope = {};
      if (this.scopeChannel) scope.channel = this.scopeChannel;
      if (this.scopeLanguage) scope.language = this.scopeLanguage.toLowerCase();
      return {
        module: this.form.module.trim(),
        check_key: this.form.check_key.trim(),
        params: this.form.params,
        scope,
        task_type: this.form.task_type,
        task_params: this.form.task_params,
        limit: this.limitStr ? parseInt(this.limitStr, 10) : null,
        cooldown_days: this.cooldownStr !== "" ? parseInt(this.cooldownStr, 10) : null,
        auto: this.form.auto,
        active: this.form.active,
      };
    },
    async save() {
      if (!this.validateLocal()) return;
      const payload = this.buildPayload();

      this.loader.loaderStart();
      try {
        if (this.isCreate) {
          await POST_SpawnRule({ key: this.form.key.trim(), ...payload });
        } else {
          await PATCH_SpawnRule(this.form.key, payload);
        }
        this.notify.spawnNotification({
          type: "positive",
          msg: this.$t("enrichment.spawn_rules.saved"),
        });
        this.$router.push("/enrichment/spawn-rules");
      } catch (err) {
        this.handleApiError(err);
        this.notify.spawnNotification({
          type: "negative",
          msg: this.summary || this.$t("notifications.error"),
        });
      } finally {
        this.loader.loaderFinish();
      }
    },
    async runRule() {
      try {
        const { data } = await POST_SpawnRuleRun(this.form.key);
        const map = {
          spawned: { type: "positive", key: "enrichment.spawn_rules.run_spawned" },
          already_running: { type: "informative", key: "enrichment.spawn_rules.run_already_running" },
          no_candidates: { type: "informative", key: "enrichment.spawn_rules.run_no_candidates" },
        };
        const outcome = map[data.status] || map.spawned;
        this.notify.spawnNotification({
          type: outcome.type,
          msg: this.$t(outcome.key, { id: data.task?.id ?? "" }),
        });
      } catch (err) {
        this.notify.spawnNotification({
          type: "negative",
          msg: extractApiMessage(err, this.$t("notifications.error")),
        });
      }
    },
    async deleteRule() {
      this.showDeleteConfirm = false;
      this.loader.loaderStart();
      try {
        await DELETE_SpawnRule(this.form.key);
        this.notify.spawnNotification({
          type: "positive",
          msg: this.$t("enrichment.spawn_rules.deleted"),
        });
        this.$router.push("/enrichment/spawn-rules");
      } catch (err) {
        this.notify.spawnNotification({
          type: "negative",
          msg: extractApiMessage(err, this.$t("notifications.error")),
        });
      } finally {
        this.loader.loaderFinish();
      }
    },
  },
};
</script>

<style lang="scss" scoped>
.spawn-rule-edit {
  display: flex;
  flex-direction: column;
}
.spawn-rule-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: var(--space-300);
  align-items: end;
}
</style>
