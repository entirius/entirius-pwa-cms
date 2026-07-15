<template>
  <div class="p-500 fs-300 t-basic-800 h-100 ov-h">
    <Teleport to="#pim-toolbar-left" defer>
      <BasicButton
        text=""
        icon="arrow-left"
        class="bg-basic-200 t-basic-600"
        @click="$router.push('/pim/products')"
      />
    </Teleport>
    <Teleport to="#pim-toolbar-right" defer>
      <BasicButton
        :text="$t('common.save')"
        class="bg-positive-200 t-basic-100"
        @click="createProduct"
      />
    </Teleport>
    <div class="bg-basic-100 b-basic-300 br-50 h-100 ovy-auto p-500">
      <div class="create-section mb-400">
        <h2 class="fs-500 fw-600 mb-200">{{ $t("pim.basic_info") }}</h2>
        <div class="create-grid">
          <div class="create-field">
            <label class="create-label required">SKU</label>
            <BasicInput
              v-model="form.sku"
              placeholder="e.g. CHAIR-001"
              :validate="formErrors.getFieldError('sku')"
            />
          </div>
          <div class="create-field">
            <label class="create-label required">{{
              $t("pim.feature_set")
            }}</label>
            <Dropdown
              :values="featureSetOptions"
              :placeholder="$t('pim.select_feature_set')"
              :validate="formErrors.getFieldError('feature_set_idx')"
              @onSelect="(val) => (form.feature_set_idx = val)"
            />
          </div>
          <div class="create-field">
            <label class="create-label">{{ $t("pim.visibility") }}</label>
            <Dropdown
              :values="visibilityOptions"
              :selected="[form.visibility]"
              @onSelect="(val) => (form.visibility = val)"
            />
          </div>
          <div class="create-field">
            <label class="create-label">{{ $t("pim.status") }}</label>
            <Switcher
              :label="$t('pim.enabled')"
              :selected="form.is_enabled"
              @onSelect="form.is_enabled = !form.is_enabled"
            />
          </div>
        </div>
      </div>

      <div class="create-section mb-400">
        <h2 class="fs-500 fw-600 mb-200">
          {{ $t("pim.physical_properties") }}
        </h2>
        <p class="fs-200 t-warning-300 mb-200">
          {{ $t("pim.shared_warning") }}
        </p>
        <div class="create-grid">
          <div class="create-field">
            <label class="create-label">EAN</label>
            <BasicInput
              v-model="form.ean"
              placeholder="e.g. 5901234123457"
              :validate="formErrors.getFieldError('ean')"
            />
          </div>
          <div class="create-field">
            <label class="create-label">{{ $t("pim.weight") }}</label>
            <BasicInput
              v-model="form.weight"
              placeholder="kg"
              :validate="formErrors.getFieldError('weight')"
            />
          </div>
          <div class="create-field">
            <label class="create-label">{{ $t("pim.width") }}</label>
            <BasicInput
              v-model="form.width"
              placeholder="cm"
              :validate="formErrors.getFieldError('width')"
            />
          </div>
          <div class="create-field">
            <label class="create-label">{{ $t("pim.height") }}</label>
            <BasicInput
              v-model="form.height"
              placeholder="cm"
              :validate="formErrors.getFieldError('height')"
            />
          </div>
          <div class="create-field">
            <label class="create-label">{{ $t("pim.depth") }}</label>
            <BasicInput
              v-model="form.deep"
              placeholder="cm"
              :validate="formErrors.getFieldError('deep')"
            />
          </div>
        </div>
      </div>

      <div v-if="otherChannels.length" class="create-section mb-400">
        <h2 class="fs-500 fw-600 mb-200">
          {{ $t("pim.also_add_to_channels") }}
        </h2>
        <div class="channel-list">
          <div v-for="ch in otherChannels" :key="ch.idx" class="channel-item">
            <BasicCheckbox
              :values="[
                { label: ch.name + ' (' + ch.idx + ')', value: ch.idx },
              ]"
              @onSelect="
                (selected) => toggleChannel(ch.idx, selected.includes(ch.idx))
              "
            />
            <div v-if="isChannelSelected(ch.idx)" class="channel-item__options">
              <BasicCheckbox
                :values="[
                  { label: $t('pim.inherit_translations'), value: 'inherit' },
                ]"
                :init_selected="['inherit']"
                @onSelect="
                  (selected) =>
                    setChannelOption(
                      ch.idx,
                      'inherit',
                      selected.includes('inherit')
                    )
                "
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { useLoaderStore } from "@/stores/loader";
import { useNotifyStore } from "@/stores/notify";
import { usePimChannelStore } from "@/stores/pimChannel";
import { useFormErrors, extractApiMessage } from "@/composables/useFormErrors";
import {
  POST_Product,
  GET_FeatureSets,
  POST_AddToChannel,
} from "@/api/pim/api";

export default {
  name: "ProductCreate",
  setup() {
    const loader = useLoaderStore();
    const notify = useNotifyStore();
    const pimChannel = usePimChannelStore();
    const formErrors = useFormErrors();
    return { loader, notify, pimChannel, formErrors };
  },
  data() {
    return {
      form: {
        sku: "",
        feature_set_idx: "",
        visibility: 4,
        is_enabled: true,
        ean: "",
        weight: "",
        width: "",
        height: "",
        deep: "",
      },
      featureSetOptions: [],
      visibilityOptions: [
        { label: "Not visible individually", value: 1 },
        { label: "Catalog", value: 2 },
        { label: "Search", value: 3 },
        { label: "Catalog & Search", value: 4 },
      ],
      selectedChannels: {},
    };
  },
  computed: {
    channelIdx() {
      return this.pimChannel.activeChannelIdx;
    },
    otherChannels() {
      return this.pimChannel.channels.filter(
        (ch) => ch.idx !== this.channelIdx
      );
    },
  },
  watch: {
    "pimChannel.activeChannelIdx"() {
      this.fetchFeatureSets();
    },
    form: {
      deep: true,
      handler() {
        if (this.formErrors.hasErrors) this.formErrors.clearErrors();
      },
    },
  },
  mounted() {
    this.fetchFeatureSets();
  },
  methods: {
    async fetchFeatureSets() {
      try {
        const { data } = await GET_FeatureSets(this.channelIdx);
        this.featureSetOptions = (data.results || []).map((fs) => ({
          label: `${fs.name} (${fs.idx})`,
          value: fs.idx,
        }));
      } catch {
        // Feature sets may not be available yet
      }
    },
    isChannelSelected(idx) {
      return !!this.selectedChannels[idx];
    },
    getChannelOption(idx, key) {
      return this.selectedChannels[idx]?.[key] ?? true;
    },
    toggleChannel(idx, selected) {
      if (selected) {
        this.selectedChannels = {
          ...this.selectedChannels,
          [idx]: { inherit: true },
        };
      } else {
        const { [idx]: _, ...rest } = this.selectedChannels;
        this.selectedChannels = rest;
      }
    },
    setChannelOption(idx, key, value) {
      if (!this.selectedChannels[idx]) return;
      this.selectedChannels = {
        ...this.selectedChannels,
        [idx]: { ...this.selectedChannels[idx], [key]: value },
      };
    },
    async createProduct() {
      const valid = this.formErrors.validateRequired(this.form, {
        sku: "SKU",
        feature_set_idx: this.$t("pim.feature_set"),
      });
      if (!valid) return;

      this.loader.loaderStart();
      try {
        const payload = {
          sku: this.form.sku,
          feature_set_idx: this.form.feature_set_idx,
          visibility: this.form.visibility,
          is_enabled: this.form.is_enabled,
        };
        if (this.form.ean) payload.ean = this.form.ean;
        if (this.form.weight) payload.weight = this.form.weight;
        if (this.form.width) payload.width = this.form.width;
        if (this.form.height) payload.height = this.form.height;
        if (this.form.deep) payload.deep = this.form.deep;

        const { data } = await POST_Product(this.channelIdx, payload);

        // Add to selected channels
        const channelIdxs = Object.keys(this.selectedChannels);
        for (const targetIdx of channelIdxs) {
          const opts = this.selectedChannels[targetIdx];
          try {
            await POST_AddToChannel(this.channelIdx, data.sku, {
              target_channel_idx: targetIdx,
              copy_content: true,
              inherit: opts.inherit,
            });
          } catch (err) {
            this.notify.spawnNotification({
              type: "warning",
              msg: this.$t("pim.add_to_channel_failed") + ` (${targetIdx})`,
            });
          }
        }

        this.notify.spawnNotification({
          type: "positive",
          msg: this.$t("pim.product_created"),
        });
        this.$router.push(`/pim/products/${data.sku}`);
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
  },
};
</script>

<style lang="scss" scoped>
.create-section {
  border: 1px solid var(--c-basic-200);
  border-radius: 6px;
  padding: 20px;
}
.create-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: var(--space-200);
}
.create-field {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.create-label {
  font-size: var(--fs-200);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  color: var(--c-basic-500);
}
.channel-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.channel-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 8px 12px;
  border: 1px solid var(--c-basic-200);
  border-radius: var(--radius-sm);
}
.channel-item__options {
  margin-left: 28px;
}
</style>
