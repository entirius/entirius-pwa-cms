<template>
  <form class="feed-config-form flex flex-column gap-200" @submit.prevent="submit">
    <FormField :label="$t('suppliers.feeds.form.idx_label')" required>
      <BasicInput
        v-model="local.idx"
        :disabled="!!feed"
        placeholder="xml-1"
        data-testid="feed-form-idx"
      />
      <p v-if="errors.idx" class="form-error t-negative-300 fs-200">
        {{ errors.idx.msg }}
      </p>
    </FormField>

    <FormField :label="$t('suppliers.feeds.form.connector_label')" required>
      <Dropdown
        :values="connectorOptions"
        :selected="[local.connector_kind]"
        data-testid="feed-form-connector"
        @onSelect="onConnectorChange"
      />
    </FormField>

    <!-- xml_feed config block -->
    <template v-if="local.connector_kind === 'xml_feed'">
      <FormField :label="$t('suppliers.feeds.form.xml.feed_url')">
        <BasicInput
          v-model="local.feed_config.feed_url"
          placeholder="https://example.com/feed.xml"
          data-testid="feed-form-xml-url"
        />
      </FormField>
      <FormField :label="$t('suppliers.feeds.form.xml.product_xpath')">
        <BasicInput
          v-model="local.feed_config.product_xpath"
          placeholder="//product"
          data-testid="feed-form-xml-product-xpath"
        />
      </FormField>
      <FormField :label="$t('suppliers.feeds.form.xml.image_xpath')">
        <BasicInput
          v-model="local.feed_config.image_xpath"
          placeholder=".//images/url"
          data-testid="feed-form-xml-image-xpath"
        />
      </FormField>
    </template>

    <!-- scraper config block -->
    <template v-else-if="local.connector_kind === 'scraper'">
      <FormField :label="$t('suppliers.feeds.form.scraper.scraper_id')">
        <BasicInput
          v-model="local.feed_config.scraper_id"
          data-testid="feed-form-scraper-id"
        />
      </FormField>
      <FormField :label="$t('suppliers.feeds.form.scraper.catalog_url')">
        <BasicInput
          v-model="local.feed_config.catalog_url"
          data-testid="feed-form-scraper-catalog"
        />
      </FormField>
    </template>

    <FormField :label="$t('suppliers.feeds.form.schedule_label')">
      <BasicInput
        v-model="local.schedule_cron"
        :placeholder="$t('suppliers.feeds.form.schedule_hint')"
        data-testid="feed-form-cron"
      />
    </FormField>

    <FormField :label="$t('suppliers.feeds.form.sync_mode_label')">
      <Dropdown
        :values="syncModeOptions"
        :selected="[local.sync_mode]"
        data-testid="feed-form-sync-mode"
        @onSelect="(val) => (local.sync_mode = val)"
      />
    </FormField>

    <FormField :label="$t('suppliers.feeds.form.language_label')">
      <BasicInput
        v-model="local.language_code"
        placeholder="EN"
        data-testid="feed-form-language"
      />
    </FormField>

    <FormField :label="$t('suppliers.feeds.form.currency_label')">
      <BasicInput
        v-model="local.currency_code"
        placeholder="EUR"
        data-testid="feed-form-currency"
      />
    </FormField>

    <FormField :label="$t('suppliers.form.is_active_label')">
      <Switcher
        :selected="local.is_active"
        data-testid="feed-form-is-active"
        @onSelect="local.is_active = !local.is_active"
      />
    </FormField>

    <div class="flex ai-ct jc-end gap-200 mt-300">
      <button
        type="button"
        class="suppliers-secondary-btn"
        data-testid="feed-form-cancel"
        @click="$emit('cancel')"
      >
        {{ $t("common.cancel") }}
      </button>
      <button
        type="submit"
        class="suppliers-primary-btn"
        :disabled="busy"
        data-testid="feed-form-submit"
      >
        <FontAwesomeIcon icon="floppy-disk" />
        {{ $t("common.save") }}
      </button>
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
        { value: "full", label: this.$t("suppliers.feeds.sync_mode.full") },
        { value: "delta", label: this.$t("suppliers.feeds.sync_mode.delta") },
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
.form-error {
  margin: 0;
  margin-top: 2px;
}
.suppliers-primary-btn,
.suppliers-secondary-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 36px;
  padding: 0 16px;
  font-size: 13px;
  font-weight: 500;
  border-radius: var(--radius-sm);
  border: 1px solid;
  cursor: pointer;
  transition: all 0.15s ease;
  white-space: nowrap;
}
.suppliers-primary-btn {
  background: var(--c-support-400);
  border-color: var(--c-support-400);
  color: var(--c-basic-100);
}
.suppliers-primary-btn:hover:not(:disabled) {
  filter: brightness(1.05);
}
.suppliers-primary-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
.suppliers-secondary-btn {
  background: var(--c-basic-100);
  border-color: var(--c-basic-400);
  color: var(--c-basic-700);
}
.suppliers-secondary-btn:hover {
  background: var(--c-basic-200);
  border-color: var(--c-basic-500);
}
</style>
