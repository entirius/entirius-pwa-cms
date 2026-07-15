<template>
  <div class="p-500 fs-300 t-basic-800 h-100 ov-h">
    <div
      class="bg-basic-100 b-basic-300 br-50 h-100 ovy-auto pl-500 pt-500 pb-500 pr-500"
    >
      <div class="flex ai-ct gap-200 mb-400">
        <BasicButton
          text=""
          icon="arrow-left"
          class="bg-basic-200 t-basic-600"
          @click="$router.push('/emails')"
        />
        <h1 class="fs-700 fw-600">
          {{ channel.label || $t("emails.channel") }}
        </h1>
        <span v-if="channel.idx" class="fs-200 t-basic-500 ml-100"
          >({{ channel.idx }})</span
        >
      </div>

      <Loader v-show="loading" />

      <div v-show="!loading">
        <!-- Branding Section -->
        <div class="mb-500">
          <h2 class="fs-500 fw-600 mb-300">{{ $t("emails.branding") }}</h2>
          <div class="emails-form-grid">
            <FormField :label="$t('emails.from_name')">
              <BasicInput v-model="channel.from_name" />
            </FormField>
            <FormField :label="$t('emails.from_email')">
              <BasicInput v-model="channel.from_email" />
            </FormField>
            <FormField :label="$t('emails.main_background_color')">
              <ColorInput v-model="channel.main_background_color" />
            </FormField>
            <FormField :label="$t('emails.body_background_color')">
              <ColorInput v-model="channel.body_background_color" />
            </FormField>
            <FormField :label="$t('emails.main_text_color')">
              <ColorInput v-model="channel.main_text_color" />
            </FormField>
            <FormField :label="$t('emails.brand_text_color')">
              <ColorInput v-model="channel.brand_text_color" />
            </FormField>
            <FormField :label="$t('emails.font_family')">
              <Dropdown
                :values="fontOptions"
                :selected="[channel.font_family]"
                :placeholder="$t('emails.font_family')"
                :custom_droplist="true"
                @onSelect="channel.font_family = $event"
              >
                <template #custom>
                  <div
                    v-for="font in fontOptions"
                    :key="font.value"
                    class="font-option pointer flex flex-column jc-ct pl-200 pr-200"
                    @click.stop="channel.font_family = font.value"
                  >
                    <span class="fs-200 t-basic-800 fw-700">{{
                      font.label
                    }}</span>
                    <span
                      :style="{ fontFamily: font.value }"
                      class="fs-300 t-basic-600"
                      >Hello, your order has been confirmed!</span
                    >
                  </div>
                </template>
              </Dropdown>
            </FormField>
            <FormField :label="$t('emails.logo_max_width')">
              <NumberInput
                v-model="channel.logo_max_width"
                suffix="px"
                :min="0"
                :max="1000"
                :step="10"
              />
            </FormField>
          </div>
          <div class="flex jc-fe mt-300">
            <BasicButton
              :text="$t('common.save')"
              class="bg-support-400 t-basic-100"
              @click="saveChannel"
            />
          </div>
        </div>

        <!-- Language Configs Section -->
        <div>
          <h2 class="fs-500 fw-600 mb-300">{{ $t("emails.lang_configs") }}</h2>
          <div v-if="langConfigs.length === 0" class="fs-300 t-basic-500">
            {{ $t("emails.no_lang_configs") }}
          </div>
          <div class="emails-grid">
            <div
              v-for="config in langConfigs"
              :key="config.pk"
              class="emails-card bg-basic-100 b-basic-300 br-50 p-400 pointer"
              @click="editLangConfig(config.pk)"
            >
              <div class="fs-400 fw-600 t-basic-800">
                {{ config.language || $t("emails.default_lang") }}
              </div>
              <div v-if="config.shop_name" class="fs-200 t-basic-500 mt-100">
                {{ config.shop_name }}
              </div>
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
import {
  GET_EmailChannel,
  GET_EmailLangConfigs,
  PATCH_EmailChannel,
} from "@/api/emails/api";
import { extractApiMessage } from "@/composables/useFormErrors";
export default {
  name: "EmailChannelEdit",
  setup() {
    const loader = useLoaderStore();
    const notify = useNotifyStore();
    return { loader, notify };
  },
  data() {
    return {
      channel: {},
      langConfigs: [],
      loading: false,
      fontOptions: [
        { label: "Arial", value: "Arial, Helvetica, sans-serif" },
        { label: "Helvetica", value: "Helvetica, Arial, sans-serif" },
        { label: "Verdana", value: "Verdana, Geneva, sans-serif" },
        { label: "Tahoma", value: "Tahoma, Geneva, sans-serif" },
        {
          label: "Trebuchet MS",
          value: "'Trebuchet MS', Helvetica, sans-serif",
        },
        {
          label: "Lucida Grande",
          value: "'Lucida Grande', 'Lucida Sans', sans-serif",
        },
        { label: "Georgia", value: "Georgia, 'Times New Roman', serif" },
        { label: "Times New Roman", value: "'Times New Roman', Times, serif" },
        { label: "Palatino", value: "'Palatino Linotype', Palatino, serif" },
        { label: "Courier New", value: "'Courier New', Courier, monospace" },
      ],
    };
  },
  mounted() {
    this.fetchData();
  },
  methods: {
    async fetchData() {
      this.loading = true;
      const pk = this.$route.params.channelPk;
      try {
        const [channelRes, configsRes] = await Promise.all([
          GET_EmailChannel(pk),
          GET_EmailLangConfigs(pk),
        ]);
        this.channel = channelRes.data;
        this.langConfigs = configsRes.data.results || [];
      } catch (err) {
        this.notify.spawnNotification({
          type: "negative",
          msg: extractApiMessage(err, this.$t("emails.error_load_channel")),
        });
      } finally {
        this.loading = false;
      }
    },
    async saveChannel() {
      this.loader.loaderStart();
      try {
        const pk = this.$route.params.channelPk;
        const { data } = await PATCH_EmailChannel(pk, {
          from_name: this.channel.from_name,
          from_email: this.channel.from_email,
          main_background_color: this.channel.main_background_color,
          body_background_color: this.channel.body_background_color,
          main_text_color: this.channel.main_text_color,
          brand_text_color: this.channel.brand_text_color,
          font_family: this.channel.font_family,
          logo_max_width: this.channel.logo_max_width,
        });
        this.channel = data;
        this.notify.spawnNotification({
          type: "positive",
          msg: this.$t("emails.saved"),
        });
      } catch (err) {
        this.notify.spawnNotification({
          type: "negative",
          msg: extractApiMessage(err, this.$t("emails.error_save")),
        });
      } finally {
        this.loader.loaderFinish();
      }
    },
    editLangConfig(pk) {
      this.$router.push(`/emails/lang-configs/${pk}`);
    },
  },
};
</script>

<style lang="scss" scoped>
.emails-form-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
}

.emails-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
}

.emails-card {
  transition: border-color 0.15s;

  &:hover {
    border-color: var(--c-support-300);
  }
}

.font-option {
  min-height: var(--elem-height);
  transition: background-color 0.15s;

  &:hover {
    background-color: var(--c-basic-200);
  }

  &:not(:last-child) {
    border-bottom: 1px solid var(--c-basic-300);
  }
}
</style>
