<template>
  <SideDrawer
    :visible="visible"
    mode="focused"
    width="36rem"
    :title="drawerTitle"
    @close="onClose"
  >
    <div v-if="visible" class="fed">
      <!-- inclusion/exclusion -->
      <FormField :label="$t('promo.filter_field_inclusion')">
        <Dropdown
          :values="inclusionOptions"
          :selected="local.is_inclusion_or_exclusion ? [local.is_inclusion_or_exclusion] : []"
          @onSelect="(v) => (local.is_inclusion_or_exclusion = v)"
        />
      </FormField>

      <!-- take_common_part -->
      <FormField :label="$t('promo.filter_field_take_common_part')" class="mt-300">
        <Switcher
          :label="$t('promo.filter_take_common_part_hint')"
          :hint="$t('promo.filter_common_tip')"
          :selected="local.take_common_part"
          @onSelect="local.take_common_part = !local.take_common_part"
        />
      </FormField>

      <!-- ===== PRODUCT / THRESHOLD FIELDS ===== -->
      <template v-if="kind !== 'customer'">
        <!-- products -->
        <FormField :label="$t('promo.filter_field_products')" class="mt-300">
          <BasicInput
            v-model="productSearch"
            :placeholder="$t('promo.filter_search_products')"
            @input="debouncedFetch(fetchProducts)"
          />
          <div v-if="productResults.length" class="fed__results mt-100">
            <div
              v-for="p in productResults"
              :key="p.sku"
              class="fed__result-row pointer"
              @click="toggleProduct(p.sku)"
            >
              <FontAwesomeIcon
                v-if="local.products.includes(p.sku)"
                icon="check"
                class="t-positive-200 mr-100"
              />
              <span>{{ p.sku }}{{ p.name ? ` — ${p.name}` : '' }}</span>
            </div>
          </div>
          <div v-if="local.products.length" class="fed__chips mt-100">
            <span
              v-for="sku in local.products"
              :key="sku"
              class="fed__chip"
            >
              {{ sku }}
              <button class="fed__chip-remove" @click="removeProduct(sku)">
                <FontAwesomeIcon icon="xmark" />
              </button>
            </span>
          </div>
          <p v-if="!local.products.length" class="fed__empty-hint">
            {{ $t('promo.filter_no_products_selected') }}
          </p>
        </FormField>

        <!-- categories -->
        <FormField :label="$t('promo.filter_field_categories')" class="mt-300">
          <Dropdown
            :custom_droplist="true"
            :placeholder="`${$t('promo.filter_field_categories')} (${local.categories.length})`"
          >
            <template #custom>
              <div
                v-for="c in categoryOptions"
                :key="c.idx"
                class="pointer flex jc-sb ai-ct ph-100 dropdown-list-el"
                :class="{ '-primary-100': local.categories.includes(c.idx) }"
                @click.stop="toggleCategory(c.idx)"
              >
                <span class="ml-100">{{ c.idx }}{{ c.name ? ` — ${c.name}` : '' }}</span>
                <FontAwesomeIcon
                  v-if="local.categories.includes(c.idx)"
                  icon="check"
                  class="t-positive-200"
                />
              </div>
              <div v-if="!categoryOptions.length" class="ph-100 pv-100 t-basic-400 fs-200 ml-100">
                {{ $t('promo.filter_no_options') }}
              </div>
            </template>
          </Dropdown>
        </FormField>

        <!-- attributes -->
        <FormField :label="$t('promo.filter_field_attributes')" class="mt-300">
          <Dropdown
            :custom_droplist="true"
            :placeholder="`${$t('promo.filter_field_attributes')} (${local.attributes.length})`"
          >
            <template #custom>
              <div
                v-for="a in attributeOptions"
                :key="a.idx"
                class="pointer flex jc-sb ai-ct ph-100 dropdown-list-el"
                :class="{ '-primary-100': local.attributes.includes(a.idx) }"
                @click.stop="toggleAttribute(a.idx)"
              >
                <span class="ml-100">{{ a.idx }}{{ a.name ? ` — ${a.name}` : '' }}</span>
                <FontAwesomeIcon
                  v-if="local.attributes.includes(a.idx)"
                  icon="check"
                  class="t-positive-200"
                />
              </div>
              <div v-if="!attributeOptions.length" class="ph-100 pv-100 t-basic-400 fs-200 ml-100">
                {{ $t('promo.filter_no_options') }}
              </div>
            </template>
          </Dropdown>
        </FormField>

        <!-- features_qty_greater_than_attr_value -->
        <FormField :label="$t('promo.filter_field_features_qty_gt')" class="mt-300">
          <Dropdown
            :custom_droplist="true"
            :placeholder="`${$t('promo.filter_field_features_qty_gt')} (${local.features_qty_greater_than_attr_value.length})`"
          >
            <template #custom>
              <div
                v-for="f in featureOptions"
                :key="f.idx"
                class="pointer flex jc-sb ai-ct ph-100 dropdown-list-el"
                :class="{ '-primary-100': local.features_qty_greater_than_attr_value.includes(f.idx) }"
                @click.stop="toggleFeatureGt(f.idx)"
              >
                <span class="ml-100">{{ f.idx }}{{ f.name ? ` — ${f.name}` : '' }}</span>
                <FontAwesomeIcon
                  v-if="local.features_qty_greater_than_attr_value.includes(f.idx)"
                  icon="check"
                  class="t-positive-200"
                />
              </div>
              <div v-if="!featureOptions.length" class="ph-100 pv-100 t-basic-400 fs-200 ml-100">
                {{ $t('promo.filter_no_options') }}
              </div>
            </template>
          </Dropdown>
        </FormField>

        <!-- features_qty_is_multiple_of_attr_value -->
        <FormField :label="$t('promo.filter_field_features_qty_multiple')" class="mt-300">
          <Dropdown
            :custom_droplist="true"
            :placeholder="`${$t('promo.filter_field_features_qty_multiple')} (${local.features_qty_is_multiple_of_attr_value.length})`"
          >
            <template #custom>
              <div
                v-for="f in featureOptions"
                :key="f.idx"
                class="pointer flex jc-sb ai-ct ph-100 dropdown-list-el"
                :class="{ '-primary-100': local.features_qty_is_multiple_of_attr_value.includes(f.idx) }"
                @click.stop="toggleFeatureMultiple(f.idx)"
              >
                <span class="ml-100">{{ f.idx }}{{ f.name ? ` — ${f.name}` : '' }}</span>
                <FontAwesomeIcon
                  v-if="local.features_qty_is_multiple_of_attr_value.includes(f.idx)"
                  icon="check"
                  class="t-positive-200"
                />
              </div>
              <div v-if="!featureOptions.length" class="ph-100 pv-100 t-basic-400 fs-200 ml-100">
                {{ $t('promo.filter_no_options') }}
              </div>
            </template>
          </Dropdown>
        </FormField>

        <!-- numeric ranges -->
        <div class="fed__range-grid mt-300">
          <FormField :label="$t('promo.filter_field_product_price_from')">
            <NumberInput v-model="local.product_price_from" />
          </FormField>
          <FormField :label="$t('promo.filter_field_product_price_to')">
            <NumberInput v-model="local.product_price_to" />
          </FormField>
          <FormField :label="$t('promo.filter_field_cart_price_from')">
            <NumberInput v-model="local.cart_price_from" />
          </FormField>
          <FormField :label="$t('promo.filter_field_cart_price_to')">
            <NumberInput v-model="local.cart_price_to" />
          </FormField>
          <FormField :label="$t('promo.filter_field_qty_from')">
            <NumberInput v-model="local.qty_from" />
          </FormField>
          <FormField :label="$t('promo.filter_field_qty_to')">
            <NumberInput v-model="local.qty_to" />
          </FormField>
          <FormField :label="$t('promo.filter_field_cart_qty_from')">
            <NumberInput v-model="local.cart_qty_from" />
          </FormField>
          <FormField :label="$t('promo.filter_field_cart_qty_to')">
            <NumberInput v-model="local.cart_qty_to" />
          </FormField>
        </div>
      </template>

      <!-- ===== CUSTOMER FIELDS ===== -->
      <template v-else>
        <!-- customers -->
        <FormField :label="$t('promo.filter_field_customers')" class="mt-300">
          <BasicInput
            v-model="customerSearch"
            :placeholder="$t('promo.filter_search_customers')"
            @input="debouncedFetch(fetchCustomers)"
          />
          <div v-if="customerResults.length" class="fed__results mt-100">
            <div
              v-for="c in customerResults"
              :key="c.uid"
              class="fed__result-row pointer"
              @click="toggleCustomer(c.uid)"
            >
              <FontAwesomeIcon
                v-if="local.customers.includes(c.uid)"
                icon="check"
                class="t-positive-200 mr-100"
              />
              <span>{{ c.first_name || '' }} {{ c.last_name || '' }}{{ c.email ? ` (${c.email})` : '' }}</span>
            </div>
          </div>
          <div v-if="local.customers.length" class="fed__chips mt-100">
            <span
              v-for="uid in local.customers"
              :key="uid"
              class="fed__chip fed__chip--mono"
            >
              {{ uid }}
              <button class="fed__chip-remove" @click="removeCustomer(uid)">
                <FontAwesomeIcon icon="xmark" />
              </button>
            </span>
          </div>
          <p v-if="!local.customers.length" class="fed__empty-hint">
            {{ $t('promo.filter_no_customers_selected') }}
          </p>
        </FormField>

        <!-- groups -->
        <FormField :label="$t('promo.filter_field_groups')" class="mt-300">
          <Dropdown
            :custom_droplist="true"
            :placeholder="`${$t('promo.filter_field_groups')} (${local.groups.length})`"
          >
            <template #custom>
              <div
                v-for="g in groupOptions"
                :key="g.code"
                class="pointer flex jc-sb ai-ct ph-100 dropdown-list-el"
                :class="{ '-primary-100': local.groups.includes(g.code) }"
                @click.stop="toggleGroup(g.code)"
              >
                <span class="ml-100">{{ g.code }}{{ g.name ? ` — ${g.name}` : '' }}</span>
                <FontAwesomeIcon
                  v-if="local.groups.includes(g.code)"
                  icon="check"
                  class="t-positive-200"
                />
              </div>
              <div v-if="!groupOptions.length" class="ph-100 pv-100 t-basic-400 fs-200 ml-100">
                {{ $t('promo.filter_no_options') }}
              </div>
            </template>
          </Dropdown>
        </FormField>
      </template>

      <!-- footer -->
      <div class="fed__footer mt-400">
        <BasicButton
          :text="$t('common.cancel')"
          class="bg-basic-200 t-basic-600"
          @click="onClose"
        />
        <BasicButton
          :text="$t('common.save')"
          class="bg-support-400 t-basic-100"
          :disabled="saving"
          @click="onSave"
        />
      </div>
    </div>
  </SideDrawer>
</template>

<script setup>
import { ref, computed, watch } from "vue";
import { t } from "@/i18n";
import { useSearchDebounce } from "@/composables/useSearchDebounce";
import { extractApiMessage } from "@/composables/useFormErrors";
import { GET_Products, GET_Categories, GET_Features, GET_Attributes } from "@/api/pim/api";
import { GET_Customers, GET_AccountsGroups } from "@/api/accounts/api";
import {
  POST_ProductFilter,
  POST_ThresholdFilter,
  POST_CustomerFilter,
  PATCH_ProductFilter,
  PATCH_ThresholdFilter,
  PATCH_CustomerFilter,
} from "@/api/promo/api";
import { useNotifyStore } from "@/stores/notify";
import { useLoaderStore } from "@/stores/loader";

const props = defineProps({
  visible: { type: Boolean, default: false },
  kind: { type: String, default: "product" }, // "product" | "threshold" | "customer"
  filter: { type: Object, default: null },
  channel: { type: String, required: true },
  ruleId: { type: [String, Number], required: true },
});

const emit = defineEmits(["close", "saved"]);

const notify = useNotifyStore();
const loader = useLoaderStore();

// ─── search debounce instances ─────────────────────────────────────────────
const { search: productSearch, debouncedFetch } = useSearchDebounce(300);
const { search: customerSearch, debouncedFetch: debouncedFetchCustomer } = useSearchDebounce(300);

// ─── remote option lists ────────────────────────────────────────────────────
const productResults = ref([]);
const categoryOptions = ref([]);
const attributeOptions = ref([]);
const featureOptions = ref([]);
const customerResults = ref([]);
const groupOptions = ref([]);

// ─── local form state ───────────────────────────────────────────────────────
const saving = ref(false);

function buildLocal(filter, kind) {
  if (kind === "customer") {
    return {
      is_inclusion_or_exclusion: filter?.is_inclusion_or_exclusion ?? "inclusion",
      take_common_part: filter?.take_common_part ?? false,
      customers: Array.isArray(filter?.customers) ? [...filter.customers] : [],
      groups: Array.isArray(filter?.groups) ? [...filter.groups] : [],
    };
  }
  return {
    is_inclusion_or_exclusion: filter?.is_inclusion_or_exclusion ?? "inclusion",
    take_common_part: filter?.take_common_part ?? false,
    products: Array.isArray(filter?.products) ? [...filter.products] : [],
    categories: Array.isArray(filter?.categories) ? [...filter.categories] : [],
    attributes: Array.isArray(filter?.attributes) ? [...filter.attributes] : [],
    features_qty_greater_than_attr_value: Array.isArray(filter?.features_qty_greater_than_attr_value)
      ? [...filter.features_qty_greater_than_attr_value]
      : [],
    features_qty_is_multiple_of_attr_value: Array.isArray(filter?.features_qty_is_multiple_of_attr_value)
      ? [...filter.features_qty_is_multiple_of_attr_value]
      : [],
    product_price_from: filter?.product_price_from ?? null,
    product_price_to: filter?.product_price_to ?? null,
    cart_price_from: filter?.cart_price_from ?? null,
    cart_price_to: filter?.cart_price_to ?? null,
    qty_from: filter?.qty_from ?? null,
    qty_to: filter?.qty_to ?? null,
    cart_qty_from: filter?.cart_qty_from ?? null,
    cart_qty_to: filter?.cart_qty_to ?? null,
  };
}

const local = ref(buildLocal(null, "product"));

// ─── computed ────────────────────────────────────────────────────────────────
const drawerTitle = computed(() => {
  if (props.kind === "customer") return t("promo.filter_drawer_title_customer");
  if (props.kind === "threshold") return t("promo.filter_drawer_title_threshold");
  return t("promo.filter_drawer_title_product");
});

const inclusionOptions = computed(() => [
  { label: t("promo.inclusion"), value: "inclusion", description: t("promo.mode_inclusion_desc") },
  { label: t("promo.exclusion"), value: "exclusion", description: t("promo.mode_exclusion_desc") },
]);

// ─── watchers ────────────────────────────────────────────────────────────────
watch(
  () => props.visible,
  async (open) => {
    if (!open) return;
    local.value = buildLocal(props.filter, props.kind);
    productSearch.value = "";
    productResults.value = [];
    customerSearch.value = "";
    customerResults.value = [];
    await loadStaticOptions();
  }
);

// ─── data loaders ────────────────────────────────────────────────────────────
async function loadStaticOptions() {
  if (props.kind !== "customer") {
    await Promise.all([loadCategories(), loadAttributes(), loadFeatures()]);
  } else {
    await loadGroups();
  }
}

async function loadCategories() {
  try {
    const { data } = await GET_Categories(props.channel, { page_size: 200 });
    categoryOptions.value = data.results || [];
  } catch {
    categoryOptions.value = [];
  }
}

async function loadAttributes() {
  try {
    const { data } = await GET_Attributes({ page_size: 200 });
    attributeOptions.value = data.results || [];
  } catch {
    attributeOptions.value = [];
  }
}

async function loadFeatures() {
  try {
    const { data } = await GET_Features({ page_size: 200 }, props.channel);
    featureOptions.value = data.results || [];
  } catch {
    featureOptions.value = [];
  }
}

async function loadGroups() {
  try {
    const { data } = await GET_AccountsGroups({ page_size: 200 });
    groupOptions.value = data.results || [];
  } catch {
    groupOptions.value = [];
  }
}

async function fetchProducts() {
  if (!productSearch.value.trim()) {
    productResults.value = [];
    return;
  }
  try {
    const { data } = await GET_Products(props.channel, {
      search: productSearch.value,
      page_size: 20,
    });
    productResults.value = data.results || [];
  } catch {
    productResults.value = [];
  }
}

async function fetchCustomers() {
  if (!customerSearch.value.trim()) {
    customerResults.value = [];
    return;
  }
  try {
    const { data } = await GET_Customers({
      search: customerSearch.value,
      page_size: 20,
    });
    customerResults.value = data.results || [];
  } catch {
    customerResults.value = [];
  }
}

// watch customer search separately with its own debounce
watch(customerSearch, () => {
  debouncedFetchCustomer(fetchCustomers);
});

// ─── toggle helpers ─────────────────────────────────────────────────────────
function toggleInArray(arr, value) {
  const idx = arr.indexOf(value);
  if (idx >= 0) arr.splice(idx, 1);
  else arr.push(value);
}

function toggleProduct(sku) { toggleInArray(local.value.products, sku); }
function removeProduct(sku) {
  local.value.products = local.value.products.filter((s) => s !== sku);
}
function toggleCategory(idx) { toggleInArray(local.value.categories, idx); }
function toggleAttribute(idx) { toggleInArray(local.value.attributes, idx); }
function toggleFeatureGt(idx) { toggleInArray(local.value.features_qty_greater_than_attr_value, idx); }
function toggleFeatureMultiple(idx) { toggleInArray(local.value.features_qty_is_multiple_of_attr_value, idx); }
function toggleCustomer(uid) { toggleInArray(local.value.customers, uid); }
function removeCustomer(uid) {
  local.value.customers = local.value.customers.filter((u) => u !== uid);
}
function toggleGroup(code) { toggleInArray(local.value.groups, code); }

// ─── save ────────────────────────────────────────────────────────────────────
const RANGE_FIELDS = [
  "product_price_from", "product_price_to", "cart_price_from", "cart_price_to",
  "qty_from", "qty_to", "cart_qty_from", "cart_qty_to",
];

function numOrNull(v) {
  // NumberInput emits strings; empty -> null, otherwise a number (backend ints).
  if (v === "" || v === null || v === undefined) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function buildPayload() {
  const payload = { ...local.value };
  if (props.kind !== "customer") {
    RANGE_FIELDS.forEach((k) => { payload[k] = numOrNull(payload[k]); });
  }
  return payload;
}

function filterErrorMessage(e) {
  return extractApiMessage(e, t("notifications.save_error"));
}

async function onSave() {
  saving.value = true;
  loader.loaderStart();
  try {
    const filterId = props.filter?.id;
    const isCreate = !filterId;
    const payload = buildPayload();

    if (props.kind === "product") {
      await (isCreate
        ? POST_ProductFilter(props.channel, props.ruleId, payload)
        : PATCH_ProductFilter(props.channel, props.ruleId, filterId, payload));
    } else if (props.kind === "threshold") {
      await (isCreate
        ? POST_ThresholdFilter(props.channel, props.ruleId, payload)
        : PATCH_ThresholdFilter(props.channel, props.ruleId, filterId, payload));
    } else {
      await (isCreate
        ? POST_CustomerFilter(props.channel, props.ruleId, payload)
        : PATCH_CustomerFilter(props.channel, props.ruleId, filterId, payload));
    }

    notify.spawnNotification({ type: "positive", msg: t("promo.filter_saved") });
    emit("saved");
    emit("close");
  } catch (e) {
    // Keep the drawer OPEN on error so the user can correct and retry.
    notify.spawnNotification({ type: "negative", msg: filterErrorMessage(e) });
  } finally {
    saving.value = false;
    loader.loaderFinish();
  }
}

function onClose() {
  emit("close");
}
</script>

<style lang="scss">
/* Unscoped — teleported to body */
.fed {
  display: flex;
  flex-direction: column;
  font-size: var(--fs-300);
  color: var(--c-basic-800);

  &__results {
    border: 1px solid var(--c-basic-300);
    border-radius: var(--radius-sm);
    max-height: 180px;
    overflow-y: auto;
    background: var(--c-basic-100);
  }

  &__result-row {
    display: flex;
    align-items: center;
    padding: 6px 10px;
    font-size: var(--fs-200);
    color: var(--c-basic-700);
    min-height: 36px;

    &:hover {
      background: var(--c-basic-200);
    }
  }

  &__chips {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-100);
  }

  &__chip {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 2px 8px;
    border-radius: var(--radius-sm);
    background: var(--c-support-100);
    color: var(--c-support-400);
    font-size: var(--fs-200);
    font-weight: 500;

    &--mono {
      font-family: monospace;
      font-size: var(--fs-200);
    }
  }

  &__chip-remove {
    background: none;
    border: none;
    padding: 0 2px;
    cursor: pointer;
    color: var(--c-support-300);
    line-height: 1;
    min-width: 16px;
    min-height: 16px;

    &:hover {
      color: var(--c-negative-300);
    }

    &:focus-visible {
      outline: 2px solid var(--c-support-400);
    }
  }

  &__empty-hint {
    font-size: var(--fs-200);
    color: var(--c-basic-400);
    margin-top: 4px;
  }

  &__range-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--space-200);
  }

  &__footer {
    display: flex;
    justify-content: flex-end;
    gap: var(--space-200);
    padding-top: var(--space-300);
    border-top: 1px solid var(--c-basic-200);
    flex-shrink: 0;
  }
}
</style>
