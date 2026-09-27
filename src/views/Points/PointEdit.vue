<template>
  <div class="p-12 fs-300 t-body h-100 ov-h">
    <Teleport to="#points-toolbar-left" defer>
      <BackBar
        @back="$router.push('/points/list')"
      />
    </Teleport>
    <Teleport to="#points-toolbar-right" defer>
      <span v-if="isDirty" class="chip bg-warning-subtle t-warning">
        {{ $t("unsaved.changes") }}
      </span>
      <BasicButton
        v-if="isEdit && !isCarrier"
        custom
        :label="$t('common.delete')"
        class="btn-danger"
        @click="showDeleteConfirm = true"
      >
        <template #custom><FontAwesomeIcon icon="trash-can" /></template>
      </BasicButton>
      <BasicButton
        :text="$t('common.save')"
        class="btn-primary"
        @click="savePoint"
      />
    </Teleport>
    <div class="page-card h-100 ovy-auto">
      <Loader block v-if="loading" />

      <template v-else>
        <div class="flex ai-ct jc-sb mb-12">
          <h1>
            {{ isEdit ? point.name || point.code : $t("dp.create_point") }}
          </h1>
          <Switcher
            :label="$t('dp.is_active')"
            :selected="form.is_active"
            @onSelect="form.is_active = !form.is_active"
          />
        </div>

        <!-- Carrier read-only banner -->
        <div
          v-if="isCarrier"
          class="flex ai-ct gap-5 mb-8 p-8 bg-accent-subtle rounded t-strong fs-200"
        >
          <font-awesome-icon icon="lock" />
          <span>{{ $t("dp.carrier_point_read_only") }}</span>
        </div>

        <!-- Address section -->
        <div class="detail-section mb-10">
          <h2 class="fs-500 fw-600 mb-8">{{ $t("dp.address") }}</h2>

          <!-- Geocode address search -->
          <div v-if="!isCarrier" class="mb-8">
            <div
              v-if="!geocodeAvailable"
              class="flex ai-ct gap-5 p-5 bg-accent-subtle rounded t-strong fs-200 mb-5"
            >
              <font-awesome-icon icon="info-circle" />
              <span>{{ $t("dp.geocoding_unavailable") }}</span>
            </div>
            <div class="geocode-search">
              <label class="field-label">{{ $t("dp.address_search") }}</label>
              <div class="geocode-search__input-wrap">
                <BasicInput
                  v-model="geocodeQuery"
                  :placeholder="$t('dp.address_search_placeholder')"
                  icon="search"
                  :isDisabled="!geocodeAvailable"
                  @input="debouncedGeocode"
                />
                <div
                  v-if="geocodeResults.length"
                  class="geocode-search__results"
                >
                  <div
                    v-for="(result, idx) in geocodeResults"
                    :key="idx"
                    class="geocode-search__result pointer"
                    @click="selectGeoResult(result)"
                  >
                    {{ result.formatted_address }}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="detail-grid">
            <div class="detail-field">
              <label class="field-label required">{{ $t("dp.code") }}</label>
              <BasicInput
                v-model="form.code"
                :isDisabled="isCarrier"
                :validate="formErrors.getFieldError('code')"
              />
            </div>
            <div class="detail-field">
              <label class="field-label required">{{ $t("dp.name") }}</label>
              <BasicInput
                v-model="form.name"
                :isDisabled="isCarrier"
                :validate="formErrors.getFieldError('name')"
              />
            </div>
            <div class="detail-field">
              <label class="field-label required">{{ $t("dp.type") }}</label>
              <Dropdown
                :values="typeOptions"
                :selected="form.type_id ? [form.type_id] : []"
                :placeholder="$t('common.select')"
                :isDisabled="isCarrier || (isEdit && !typeChangeSupported)"
                :class="{
                  'b-negative': formErrors.getFieldError('type_id'),
                }"
                @onSelect="(val) => (form.type_id = val)"
              />
              <p
                v-if="formErrors.getFieldError('type_id')"
                class="t-negative fs-200"
              >
                {{ formErrors.getFieldError("type_id").msg }}
              </p>
            </div>
            <div class="detail-field">
              <label class="field-label">{{ $t("dp.channels") }}</label>
              <Dropdown
                v-if="isCarrier"
                :values="[{ label: $t('dp.global'), value: '__global' }]"
                :selected="['__global']"
                :isDisabled="true"
              />
              <Dropdown
                v-else
                :custom_droplist="true"
                :placeholder="form.channel_ids.length ? $t('common.selected_count', { count: form.channel_ids.length }) : $t('dp.global')"
              >
                <template #custom>
                  <div
                    v-for="ch in channelOptions"
                    :key="ch.value"
                    class="pointer flex jc-sb ai-ct ph-2 dropdown-list-el"
                    :class="{
                      '-primary-100': form.channel_ids.includes(ch.value),
                    }"
                    @click.stop="toggleChannel(ch.value)"
                  >
                    <span class="ml-2">{{ ch.label }}</span>
                    <FontAwesomeIcon
                      v-if="form.channel_ids.includes(ch.value)"
                      icon="check"
                      class="t-positive"
                    />
                  </div>
                </template>
              </Dropdown>
            </div>
            <div class="detail-field">
              <label class="field-label">{{ $t("dp.street") }}</label>
              <BasicInput
                v-model="form.street"
                :isDisabled="isCarrier"
                :validate="formErrors.getFieldError('street')"
              />
            </div>
            <div class="detail-field">
              <label class="field-label">{{ $t("dp.city") }}</label>
              <BasicInput
                v-model="form.city"
                :isDisabled="isCarrier"
                :validate="formErrors.getFieldError('city')"
              />
            </div>
            <div class="detail-field">
              <label class="field-label">{{ $t("dp.state") }}</label>
              <BasicInput
                v-model="form.state"
                :isDisabled="isCarrier"
                :validate="formErrors.getFieldError('state')"
              />
            </div>
            <div class="detail-field">
              <label class="field-label">{{ $t("dp.post_code") }}</label>
              <BasicInput
                v-model="form.post_code"
                :isDisabled="isCarrier"
                :validate="formErrors.getFieldError('post_code')"
              />
            </div>
            <div class="detail-field">
              <label class="field-label">{{ $t("dp.country") }}</label>
              <Dropdown
                v-if="isCarrier"
                :values="countryOptions"
                :selected="form.country ? [form.country] : []"
                :isDisabled="true"
              />
              <Dropdown
                v-else
                :values="countryOptions"
                :selected="form.country ? [form.country] : []"
                :placeholder="$t('dp.select_country')"
                :class="{
                  'b-negative': formErrors.getFieldError('country'),
                }"
                @onSelect="(val) => (form.country = val)"
              />
              <p
                v-if="formErrors.getFieldError('country')"
                class="t-negative fs-200"
              >
                {{ formErrors.getFieldError("country").msg }}
              </p>
            </div>
          </div>
        </div>

        <!-- Location section -->
        <div class="detail-section mb-10">
          <h2 class="fs-500 fw-600 mb-8">{{ $t("dp.location") }}</h2>
          <div class="detail-grid">
            <div class="detail-field">
              <label class="field-label">{{ $t("dp.lat") }}</label>
              <BasicInput
                v-model="form.latitude"
                :isDisabled="isCarrier"
                :validate="formErrors.getFieldError('latitude')"
              />
            </div>
            <div class="detail-field">
              <label class="field-label">{{ $t("dp.lon") }}</label>
              <BasicInput
                v-model="form.longitude"
                :isDisabled="isCarrier"
                :validate="formErrors.getFieldError('longitude')"
              />
            </div>
          </div>
        </div>

        <!-- Contact section -->
        <div class="detail-section mb-10">
          <h2 class="fs-500 fw-600 mb-8">{{ $t("dp.contact") }}</h2>
          <div class="detail-grid">
            <div class="detail-field">
              <label class="field-label">{{ $t("dp.phone") }}</label>
              <BasicInput
                v-model="form.phone"
                :isDisabled="isCarrier"
                :validate="formErrors.getFieldError('phone')"
              />
            </div>
            <div class="detail-field">
              <label class="field-label">{{ $t("dp.email") }}</label>
              <BasicInput
                v-model="form.email"
                :isDisabled="isCarrier"
                :validate="formErrors.getFieldError('email')"
              />
            </div>
            <div class="detail-field">
              <label class="field-label">{{ $t("dp.website") }}</label>
              <BasicInput
                v-model="form.website"
                :isDisabled="isCarrier"
                :validate="formErrors.getFieldError('website')"
              />
            </div>
            <div class="detail-field">
              <label class="field-label">{{ $t("dp.opening_hours") }}</label>
              <BasicInput
                v-model="form.opening_hours"
                :isDisabled="isCarrier"
              />
            </div>
          </div>
          <div class="detail-field mt-8">
            <label class="field-label">{{ $t("dp.hint") }}</label>
            <TextAreaBasic
              v-model="form.hint"
              rows="3"
              :isDisabled="isCarrier"
            />
          </div>
        </div>

        <!-- Translations section (edit mode only, hidden for single-language setups) -->
        <div v-if="isEdit && showTranslations" class="detail-section mb-10">
          <div class="section-head mb-8">
            <h2 class="fs-500 fw-600">{{ $t("dp.translations") }}</h2>
            <div
              v-if="availableLanguageCodes.length"
              class="flex ai-ct gap-5"
            >
              <Dropdown
                :values="availableLanguageCodes"
                :selected="addingLanguage ? [addingLanguage] : []"
                :placeholder="$t('dp.language')"
                class="t9n-lang-select"
                @onSelect="(val) => (addingLanguage = val)"
              />
              <BasicButton
                :text="$t('dp.add_translation')"
                class="btn-secondary"
                :isDisabled="!addingLanguage"
                @click="addTranslation"
              />
            </div>
          </div>

          <EmptyState
            v-if="!translations.length"
            icon="language"
            :title="$t('dp.no_translations')"
          />

          <div
            v-for="t9n in translations"
            :key="t9n.language"
            class="t9n-row mb-8"
          >
            <div class="t9n-lang-header flex ai-ct jc-sb mb-5">
              <span class="field-label t-accent">{{
                t9n.language.toUpperCase()
              }}</span>
              <BasicButton
                custom
                size="sm"
                :label="$t('common.delete')"
                class="btn-danger"
                @click="deleteTranslation(t9n.language)"
              >
                <template #custom><FontAwesomeIcon icon="trash-can" /></template>
              </BasicButton>
            </div>
            <div class="detail-grid">
              <div class="detail-field">
                <label class="field-label">{{
                  $t("dp.translation_name")
                }}</label>
                <BasicInput v-model="t9n.name" />
              </div>
              <div class="detail-field">
                <label class="field-label">{{
                  $t("dp.translation_opening_hours")
                }}</label>
                <BasicInput v-model="t9n.opening_hours" />
              </div>
            </div>
            <div class="detail-field mt-5">
              <label class="field-label">{{
                $t("dp.translation_hint")
              }}</label>
              <BasicInput v-model="t9n.hint" />
            </div>
            <div class="flex jc-fe mt-5">
              <BasicButton
                :text="$t('common.save')"
                class="btn-secondary"
                @click="saveTranslation(t9n)"
              />
            </div>
          </div>
        </div>
      </template>
    </div>

    <Confirmation-modal
      :visible="showDeleteConfirm"
      @accept="deletePoint"
      @reject="showDeleteConfirm = false"
    >
      <template #header
        ><h2>{{ $t("dp.confirm_delete_title") }}</h2></template
      >
      <template #description
        ><p>{{ $t("dp.confirm_delete_point") }}</p></template
      >
    </Confirmation-modal>

    <UnsavedChangesModal
      :visible="!!pendingNav"
      @save="saveAndLeave"
      @discard="confirmLeave"
      @stay="cancelLeave"
    />
  </div>
</template>

<script>
import { useLoaderStore } from "@/stores/loader";
import { useMuninStore } from "@/stores/munin";
import { useNotifyStore } from "@/stores/notify";
import { useUnsavedChanges } from "@/composables/useUnsavedChanges";
import { useFormErrors, extractApiMessage } from "@/composables/useFormErrors";
import {
  GET_Point,
  POST_Point,
  PATCH_Point,
  DELETE_Point,
  GET_Types,
  GET_DPChannels,
  GET_Countries,
  GET_PointT9N,
  POST_PointT9N,
  PATCH_PointT9N,
  DELETE_PointT9N,
  POST_GeocodeSearch,
} from "@/api/deliverypoints/api";
import UnsavedChangesModal from "@/functionals/Unsaved-changes-modal/index.vue";
import ConfirmationModal from "@/functionals/Confirmation-modal/index.vue";

export default {
  name: "PointEdit",
  components: { UnsavedChangesModal, ConfirmationModal },
  setup() {
    const loader = useLoaderStore();
    const munin = useMuninStore();
    const notify = useNotifyStore();
    const unsaved = useUnsavedChanges();
    const formErrors = useFormErrors();
    return { loader, munin, notify, ...unsaved, formErrors };
  },
  data() {
    return {
      point: {},
      types: [],
      channels: [],
      countries: [],
      translations: [],
      addingLanguage: null,
      loading: false,
      showDeleteConfirm: false,
      geocodeAvailable: true,
      geocodeQuery: "",
      geocodeResults: [],
      geocodeTimer: null,
      form: {
        code: "",
        name: "",
        type_id: null,
        channel_ids: [],
        street: "",
        city: "",
        state: "",
        post_code: "",
        country: "",
        latitude: "",
        longitude: "",
        phone: "",
        email: "",
        website: "",
        opening_hours: "",
        hint: "",
        is_active: true,
      },
    };
  },
  computed: {
    isEdit() {
      return !!this.$route.params.id;
    },
    isCarrier() {
      if (!this.isEdit) return false;
      const typeObj = this.types.find((t) => t.id === this.form.type_id);
      return typeObj?.is_carrier ?? false;
    },
    // Backend accepts type_id on PATCH since deliverypoints 1.1.0 —
    // older backends silently drop it, so keep the dropdown locked there.
    typeChangeSupported() {
      return this.munin.isModuleAtLeast("deliverypoints", "1.1.0");
    },
    // Carrier types are not selectable, but a carrier point still shows its own type.
    typeOptions() {
      return this.types
        .filter((t) => !t.is_carrier || t.id === this.form.type_id)
        .map((t) => ({ label: t.name, value: t.id }));
    },
    channelOptions() {
      return this.channels.map((ch) => ({
        label: ch.name || ch.idx,
        value: ch.id,
      }));
    },
    countryOptions() {
      return this.countries.map((c) => ({
        label: `${c.iso2} — ${c.name}`,
        value: c.iso2,
      }));
    },
    // Single-language setups have nothing to translate into — hide the whole
    // section unless legacy translations already exist (so they stay manageable).
    showTranslations() {
      const codes = new Set();
      for (const ch of this.channels) {
        for (const code of ch.language_codes || []) codes.add(code);
      }
      return codes.size > 1 || this.translations.length > 0;
    },
    availableLanguageCodes() {
      const usedCodes = new Set(this.translations.map((t) => t.language));
      const codes = new Set();
      for (const ch of this.channels) {
        if (ch.language_codes) {
          for (const code of ch.language_codes) {
            if (!usedCodes.has(code)) codes.add(code);
          }
        }
      }
      return Array.from(codes).map((code) => ({
        label: code.toUpperCase(),
        value: code,
      }));
    },
  },
  watch: {
    form: {
      deep: true,
      handler() {
        if (this.formErrors.hasErrors) this.formErrors.clearErrors();
      },
    },
  },
  beforeRouteLeave(to, from, next) {
    this.guardNavigation(to, from, next);
  },
  async mounted() {
    await this.checkGeocode();
    await this.fetchChannels();
    await this.fetchTypes();
    await this.fetchCountries();
    if (this.isEdit) {
      await this.fetchPoint();
      await this.fetchTranslations();
    } else {
      this.snapshot(this.form);
      this.track(this.form);
    }
  },
  methods: {
    async checkGeocode() {
      try {
        const { data } = await POST_GeocodeSearch({ query: "test" });
        if (data.available === false) {
          this.geocodeAvailable = false;
        }
      } catch {
        this.geocodeAvailable = false;
      }
    },
    debouncedGeocode() {
      clearTimeout(this.geocodeTimer);
      if (!this.geocodeQuery || this.geocodeQuery.length < 3) {
        this.geocodeResults = [];
        return;
      }
      this.geocodeTimer = setTimeout(() => this.searchAddress(), 300);
    },
    async searchAddress() {
      try {
        const { data } = await POST_GeocodeSearch({
          query: this.geocodeQuery,
          limit: 5,
        });
        if (Array.isArray(data)) {
          this.geocodeResults = data;
        } else {
          this.geocodeResults = [];
        }
      } catch {
        this.geocodeResults = [];
      }
    },
    selectGeoResult(result) {
      this.form.street = result.street || "";
      this.form.city = result.city || "";
      this.form.state = result.state || "";
      this.form.post_code = result.post_code || "";
      this.form.country = result.country || "";
      this.form.latitude = result.latitude || "";
      this.form.longitude = result.longitude || "";
      this.geocodeQuery = result.formatted_address || "";
      this.geocodeResults = [];
    },
    toggleChannel(pk) {
      const idx = this.form.channel_ids.indexOf(pk);
      if (idx >= 0) {
        this.form.channel_ids.splice(idx, 1);
      } else {
        this.form.channel_ids.push(pk);
      }
    },
    async fetchChannels() {
      try {
        const { data } = await GET_DPChannels({ page_size: 100 });
        this.channels = data.results || [];
      } catch (err) {
        this.notify.spawnNotification({
          type: "negative",
          msg: extractApiMessage(err, this.$t("notifications.error")),
        });
      }
    },
    async fetchTranslations() {
      try {
        const { data } = await GET_PointT9N(this.$route.params.id);
        this.translations = data.results || data || [];
      } catch (err) {
        this.notify.spawnNotification({
          type: "negative",
          msg: extractApiMessage(err, this.$t("notifications.error")),
        });
      }
    },
    async addTranslation() {
      if (!this.addingLanguage) return;
      try {
        await POST_PointT9N(this.$route.params.id, {
          language: this.addingLanguage,
          name: "",
          hint: "",
          opening_hours: "",
        });
        this.addingLanguage = null;
        await this.fetchTranslations();
      } catch (err) {
        this.notify.spawnNotification({
          type: "negative",
          msg: extractApiMessage(err, this.$t("notifications.error")),
        });
      }
    },
    async saveTranslation(t9n) {
      try {
        await PATCH_PointT9N(this.$route.params.id, t9n.language, {
          name: t9n.name,
          hint: t9n.hint,
          opening_hours: t9n.opening_hours,
        });
        this.notify.spawnNotification({
          type: "positive",
          msg: this.$t("dp.point_saved"),
        });
      } catch (err) {
        this.notify.spawnNotification({
          type: "negative",
          msg: extractApiMessage(err, this.$t("notifications.save_error")),
        });
      }
    },
    async deleteTranslation(language) {
      try {
        await DELETE_PointT9N(this.$route.params.id, language);
        await this.fetchTranslations();
      } catch (err) {
        this.notify.spawnNotification({
          type: "negative",
          msg: extractApiMessage(err, this.$t("notifications.error")),
        });
      }
    },
    async saveAndLeave() {
      await this.savePoint();
      this.confirmLeave();
    },
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
    async fetchCountries() {
      try {
        const { data } = await GET_Countries();
        this.countries = data || [];
      } catch (err) {
        this.notify.spawnNotification({
          type: "negative",
          msg: extractApiMessage(err, this.$t("notifications.error")),
        });
      }
    },
    async fetchPoint() {
      this.loading = true;
      try {
        const { data } = await GET_Point(this.$route.params.id);
        this.point = data;
        this.resetForm(data);
        this.snapshot(this.form);
        this.track(this.form);
      } catch (err) {
        this.notify.spawnNotification({
          type: "negative",
          msg: extractApiMessage(err, this.$t("notifications.error")),
        });
      } finally {
        this.loading = false;
      }
    },
    resetForm(data) {
      this.form = {
        code: data.code || "",
        name: data.name || "",
        type_id: data.type?.id || null,
        channel_ids: data.channel_ids || [],
        street: data.street || "",
        city: data.city || "",
        state: data.state || "",
        post_code: data.post_code || "",
        country: data.country || "",
        latitude: data.latitude || "",
        longitude: data.longitude || "",
        phone: data.phone || "",
        email: data.email || "",
        website: data.website || "",
        opening_hours: data.opening_hours || "",
        hint: data.hint || "",
        is_active: data.is_active ?? true,
      };
    },
    buildPayload() {
      if (this.isCarrier) {
        return { is_active: this.form.is_active };
      }
      return {
        code: this.form.code,
        name: this.form.name,
        type_id: this.form.type_id,
        channel_ids: this.form.channel_ids,
        street: this.form.street || "",
        city: this.form.city || "",
        state: this.form.state || "",
        post_code: this.form.post_code || "",
        country: this.form.country || "",
        latitude: this.form.latitude || null,
        longitude: this.form.longitude || null,
        phone: this.form.phone || "",
        email: this.form.email || "",
        website: this.form.website || "",
        opening_hours: this.form.opening_hours || "",
        hint: this.form.hint || "",
        is_active: this.form.is_active,
      };
    },
    async savePoint() {
      this.loader.loaderStart();
      try {
        const payload = this.buildPayload();
        if (this.isEdit) {
          await PATCH_Point(this.$route.params.id, payload);
          this.notify.spawnNotification({
            type: "positive",
            msg: this.$t("dp.point_saved"),
          });
          await this.fetchPoint();
        } else {
          const { data } = await POST_Point(payload);
          this.notify.spawnNotification({
            type: "positive",
            msg: this.$t("dp.point_created"),
          });
          this.snapshot(this.form);
          this.$router.push(`/points/${data.id}`);
        }
      } catch (err) {
        this.formErrors.handleApiError(err);
        this.notify.spawnNotification({
          type: "negative",
          msg: extractApiMessage(err, this.$t("notifications.save_error")),
        });
      } finally {
        this.loader.loaderFinish();
      }
    },
    async deletePoint() {
      this.showDeleteConfirm = false;
      this.loader.loaderStart();
      try {
        await DELETE_Point(this.$route.params.id);
        this.snapshot(this.form);
        this.notify.spawnNotification({
          type: "positive",
          msg: this.$t("dp.point_deleted"),
        });
        this.$router.push("/points/list");
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
.detail-section {
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-base);
  padding: var(--space-5);
}

.detail-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: var(--space-5);
}

.detail-field {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}


.t9n-row {
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-base);
  padding: var(--space-4);
}

.t9n-lang-header {
  border-bottom: 1px solid var(--border-subtle);
  padding-bottom: var(--space-2);
}

.t9n-lang-select {
  width: 120px;
}

.geocode-search {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.geocode-search__input-wrap {
  position: relative;
}

.geocode-search__results {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  z-index: 10;
  background: var(--surface-base);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-base);
  box-shadow: var(--shadow-md);
  margin-top: var(--space-1);
  max-height: 240px;
  overflow-y: auto;
}

.geocode-search__result {
  padding: var(--space-2) var(--space-5);
  font-size: var(--fs-300);
  color: var(--text-body);
  border-bottom: 1px solid var(--border-subtle);

  &:last-child {
    border-bottom: none;
  }

  &:hover {
    background: var(--surface-raised);
  }
}
</style>
