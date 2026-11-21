// Plan 15 (Leads CRM screens): stubs on top of the outbound frame for the boots these screens add.
export const crmStubs = {
  FilterChip: { name: "FilterChip", props: ["label", "count", "active"], emits: ["click"], template: "<button :data-active='active' @click=\"$emit('click')\">{{ label }} {{ count }}</button>" },
  EntitySearchPicker: { name: "EntitySearchPicker", props: ["modelValue", "displayValue", "fetchFn", "placeholder"], template: "<div />" },
  BasicSelect: { name: "BasicSelect", props: ["modelValue", "options", "floatingLabel", "multiple", "disabled"], template: '<div class="basic-select" />' },
  ScoreCard: false,
};
