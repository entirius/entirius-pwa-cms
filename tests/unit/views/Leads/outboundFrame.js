import { reactive } from "vue";
import { mount } from "@vue/test-utils";
import { routeLocationKey } from "vue-router";
import { ACCESS_STORE } from "@/composables/useReadonly";
import BasicButton from "@/boots/BasicButton/index.vue";
import BasicInput from "@/boots/BasicInput/index.vue";
import BulkActionBar from "@/boots/BulkActionBar/index.vue";
import IconButton from "@/boots/IconButton/index.vue";
import StatusBadge from "@/boots/StatusBadge/index.vue";
import { leadsFrame } from "./leadsFrame";

// Plan 14 (Leads CRM): the outbound screens on the Leads frame. The page's area decides read-only through the access
// store (`write: false` = read only); dialogs and drawers render their body and their actions while open, so a spec
// clicks the action a user does; the loader and the empty state show their test ids.
const stub = (name, props, template) => ({ name, props, template });

const actionButtons = `<button v-for="a in actions || []" :key="a.key" :data-testid="a.testid || a.key" @click="a.onClick && a.onClick()" />`;

export const outboundStubs = {
  ...leadsFrame.stubs,
  // real: a write button hides itself on a read-only page, a field shows what it holds
  BasicButton,
  BasicInput,
  StatusBadge,
  IconButton,
  PageHeader: stub(
    "PageHeader",
    ["title", "back", "crumbs", "description"],
    '<header><h1>{{ title }}</h1><p>{{ description }}</p><slot name="meta" /><slot name="actions" /></header>'
  ),
  BasicCard: stub("BasicCard", ["title", "gap"], '<section :data-title="title"><slot name="actions" /><slot /></section>'),
  Loader: stub("Loader", ["block"], '<div data-testid="loader" />'),
  EmptyState: stub("EmptyState", ["title", "icon", "size"], "<div>{{ title }}<slot /></div>"),
  BasicModal: stub("BasicModal", ["open", "title", "actions", "size", "persistent"], `<div v-if="open" :data-title="title"><slot />${actionButtons}<slot name="footer" /></div>`),
  SideDrawer: stub("SideDrawer", ["visible", "title", "width"], '<div v-if="visible"><slot /></div>'),
  MobileFilterPanel: stub("MobileFilterPanel", ["activeCount", "triggerLabel"], "<div><slot /></div>"),
  Pagination: stub("Pagination", ["page", "pages", "disabled"], "<nav />"),
  BasicTextarea: stub("BasicTextarea", ["modelValue"], "<div />"),
  BasicRadioGroup: stub("BasicRadioGroup", ["modelValue", "options"], "<div />"),
  BasicDatePicker: stub("BasicDatePicker", ["modelValue"], "<div />"),
  NumberInput: stub("NumberInput", ["modelValue", "min", "max", "disabled"], "<div />"),
  SegmentedControl: stub("SegmentedControl", ["modelValue", "options"], "<div />"),
  BasicTooltip: stub("BasicTooltip", ["text"], "<span :title='text'><slot /></span>"),
  RouterLink: stub("RouterLink", ["to"], "<a><slot /></a>"),
  AiToolboxHint: true,
};

export function mountOutbound(component, { area = "communicator.settings", write = true, props = {}, stubs = {}, mocks = {} } = {}) {
  const access = { available: true, can: (wanted, level) => wanted === area && (write || level !== "write") };
  return mount(component, {
    props,
    global: {
      components: { ...leadsFrame.components, BulkActionBar },
      stubs: { ...outboundStubs, ...stubs },
      provide: { [routeLocationKey]: reactive({ meta: { area } }), [ACCESS_STORE]: access },
      mocks,
    },
  });
}

export const byTestid = (wrapper, testid) => wrapper.find(`[data-testid="${testid}"]`);
