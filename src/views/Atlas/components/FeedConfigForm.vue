<template>
  <form class="feed-config-form flex flex-column gap-5" @submit.prevent="submit">
    <FormField
      :label="$t('atlas.feeds.form.idx_label')"
      required
      :error="errors.idx?.msg || ''"
    >
      <BasicInput
        v-model="local.idx"
        :disabled="!!feed"
        placeholder="xml-1"
        data-testid="feed-form-idx"
      />
    </FormField>

    <FormField :label="$t('atlas.feeds.form.connector_label')" required>
      <BasicSelect
        :options="connectorOptions"
        v-model="local.connector_kind"
        data-testid="feed-form-connector"
        @update:model-value="onConnectorChange"
      />
    </FormField>

    <!-- xml_feed config block -->
    <template v-if="local.connector_kind === 'xml_feed'">
      <FormField :label="$t('atlas.feeds.form.xml.feed_url')">
        <BasicInput
          v-model="local.feed_config.feed_url"
          placeholder="https://example.com/feed.xml"
          data-testid="feed-form-xml-url"
        />
      </FormField>
      <FormField :label="$t('atlas.feeds.form.xml.product_xpath')">
        <BasicInput
          v-model="local.feed_config.product_xpath"
          placeholder="//product"
          data-testid="feed-form-xml-product-xpath"
        />
      </FormField>
      <FormField :label="$t('atlas.feeds.form.xml.image_xpath')">
        <BasicInput
          v-model="local.feed_config.image_xpath"
          placeholder=".//images/url"
          data-testid="feed-form-xml-image-xpath"
        />
      </FormField>
    </template>

    <!-- scraper config block -->
    <template v-else-if="local.connector_kind === 'scraper'">
      <FormField :label="$t('atlas.feeds.form.scraper.scraper_id')">
        <BasicInput
          v-model="local.feed_config.scraper_id"
          data-testid="feed-form-scraper-id"
        />
      </FormField>
      <FormField :label="$t('atlas.feeds.form.scraper.catalog_url')">
        <BasicInput
          v-model="local.feed_config.catalog_url"
          data-testid="feed-form-scraper-catalog"
        />
      </FormField>
    </template>

    <FormField :label="$t('atlas.feeds.form.schedule_label')">
      <BasicInput
        v-model="local.schedule_cron"
        :placeholder="$t('atlas.feeds.form.schedule_hint')"
        data-testid="feed-form-cron"
      />
    </FormField>

    <FormField :label="$t('atlas.feeds.form.sync_mode_label')">
      <BasicSelect
        :options="syncModeOptions"
        v-model="local.sync_mode"
        data-testid="feed-form-sync-mode"
      />
    </FormField>

    <FormField :label="$t('atlas.feeds.form.language_label')">
      <BasicInput
        v-model="local.language_code"
        placeholder="EN"
        data-testid="feed-form-language"
      />
    </FormField>

    <FormField :label="$t('atlas.feeds.form.currency_label')">
      <BasicInput
        v-model="local.currency_code"
        placeholder="EUR"
        data-testid="feed-form-currency"
      />
    </FormField>

    <FormField :label="$t('atlas.form.is_active_label')">
      <BasicSwitch
        v-model="local.is_active"
        data-testid="feed-form-is-active"
      />
    </FormField>

    <div class="flex ai-ct jc-end gap-5 mt-8">
      <BasicButton data-testid="feed-form-cancel" @click="$emit('cancel')">
        {{ $t("common.cancel") }}
      </BasicButton>
      <BasicButton
        variant="primary"
        type="submit"
        :disabled="busy"
        data-testid="feed-form-submit"
      >
        {{ $t("common.save") }}
      </BasicButton>
    </div>
  </form>
</template>

<script>
const EMPTY_FEED = () => ({
  idx: "",
  connector_kind: "xml_feed",
  feed_config: {
    feed_url: "",
    product_xpath: "",
    image_xpath: "",
    scraper_id: "",
    catalog_url: "",
  },
  schedule_cron: "",
  sync_mode: "full",
  language_code: "",
  currency_code: "",
  is_active: true,
});

export default {
  name: "FeedConfigForm",
  props: {
    feed: { type: Object, default: null },
    connectors: { type: Array, default: () => [] },
    errors: { type: Object, default: () => ({}) },
    busy: { type: Boolean, default: false },
  },
  emits: ["submit", "cancel"],
  data() {
    return {
      local: this.merge(this.feed),
    };
  },
  computed: {
    connectorOptions() {
      const opts = (this.connectors || []).map((c) => ({
        value: c.kind,
        label: `${c.name}${c.is_async ? " (async)" : ""}`,
      }));
      if (!opts.length) {
        return [
          { value: "xml_feed", label: "XML Feed" },
          { value: "scraper", label: "Scraper (async)" },
        ];
      }
      return opts;
    },
    syncModeOptions() {
      return [
        { value: "full", label: this.$t("atlas.feeds.sync_mode.full") },
        { value: "delta", label: this.$t("atlas.feeds.sync_mode.delta") },
      ];
    },
  },
  watch: {
    feed: {
      handler(val) {
        this.local = this.merge(val);
      },
      deep: false,
    },
  },
  methods: {
    merge(feed) {
      const empty = EMPTY_FEED();
      if (!feed) return empty;
      return {
        ...empty,
        ...feed,
        feed_config: { ...empty.feed_config, ...(feed.feed_config || {}) },
      };
    },
    onConnectorChange(val) {
      this.local.connector_kind = val;
    },
    submit() {
      const payload = { ...this.local };
      if (this.feed) delete payload.idx;
      this.$emit("submit", payload);
    },
  },
};
</script>

<style lang="scss" scoped>
.feed-config-form {
  width: 100%;
}
</style>
