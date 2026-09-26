// CMS UI lint, template side. Rule IDs (C1…, T1…) refer to docs/ui-rules.md.
// Templates only, no JS style rules. P1 ships LEVEL = "warn" (debt report); P5 sets "error".
import vue from "eslint-plugin-vue";
import vueParser from "vue-eslint-parser";

const LEVEL = "warn";
const RULES = "docs/ui-rules.md";

// C2 removed component → its replacement. The P3 PR that ships a replacement adds the old name here
// (r02 removal list: BackBar, LockedField, ToolTip, HelpTooltip, HoverMe, Switcher, TextAreaBasic, Dropdown, …).
const REMOVED_COMPONENTS = { PimField: "FormField" };

const NO_REMOVED_COMPONENT = Object.entries(REMOVED_COMPONENTS).map(([old, replacement]) => ({
  selector: `VElement[rawName='${old}']`,
  message: `${old} is removed: use <${replacement}> (${RULES} § Components).`,
}));
// T1/T3 no raw colour or px in a static style attribute.
const NO_RAW_INLINE_STYLE = {
  selector: "VAttribute[directive=false][key.name='style'][value.value=/#[0-9a-fA-F]{3,8}\\b|rgba?\\(|\\d+px/]",
  message: `Raw value in style="": use a token or a utility class (${RULES} § Tokens).`,
};
// T1/T3–T5 old class names (removed in P2) render nothing: an error, not debt. The palette classes; the old spacing
// steps; radius from spacing (br-50, br-tl-50, br-50-mobile) and the plan-06 radius names (radius classes are rounded-*,
// br- is border-right only); the removed sizes and weights.
const OLD_CLASSES = [
  "/^(t|bg|b|bb|bt|bl|br|o|stroke)-(basic|support|primary|positive|negative|warning|informative|notice)-\\d+(-hover)?$/",
  "/^(p|pt|pr|pb|pl|pv|ph|m|mt|mr|mb|ml|mv|mh|gap)-(50|100|200|300|400|500|600|700)(-[a-z]+)?$/",
  "/^(br|radius)-((tl|tr|bl|br)-)?(\\d+|sm|md|base|lg|xl|2xl|3xl|4xl|full)(-[a-z]+)?$/",
  "/^(fs-(800|900|1000)|fw-(100|700))$/",
];
// C1 <input type="file"> stays raw: it is the hidden picker behind an upload button.
const NO_RAW_INPUT = {
  selector: "VElement[rawName='input']:not(:has(VAttribute[key.name='type'][value.value='file']))",
  message: `Use a boot input: BasicInput, NumberInput, ColorInput, BasicCheckbox, Switcher (${RULES} § Components).`,
};

export default [
  { ignores: ["dist/**", "node_modules/**", "__client/**", "tests/**", "public/**"] },
  {
    files: ["src/**/*.vue"],
    plugins: { vue },
    languageOptions: {
      parser: vueParser,
      parserOptions: { ecmaVersion: "latest", sourceType: "module" },
    },
    rules: {
      "vue/no-restricted-syntax": [LEVEL, ...NO_REMOVED_COMPONENT, NO_RAW_INLINE_STYLE],
    },
  },
  {
    // C3 no hand-rolled copy of a boot class · C5 no icon-font glyph.
    files: ["src/**/*.vue"],
    ignores: ["src/boots/**"], // boots own these classes
    rules: {
      "vue/no-restricted-class": [
        LEVEL,
        "filter-chip",
        "status-badge",
        "pim-badge",
        "/^icon-(?!only-mobile$)/",
      ],
    },
  },
  {
    // Old class names, boots included. The vue plugin under a second name gives this check its own severity:
    // vue/no-restricted-class above stays in warn mode.
    files: ["src/**/*.vue"],
    plugins: { "vue-p2": vue },
    rules: { "vue-p2/no-restricted-class": ["error", ...OLD_CLASSES] },
  },
  {
    // C1 views, panel components and functionals build UI from boots; boots are the implementations.
    files: ["src/views/**/*.vue", "src/components/**/*.vue", "src/functionals/**/*.vue", "src/App.vue"],
    rules: {
      "vue/no-restricted-html-elements": [
        LEVEL,
        { element: "button", message: `Use <BasicButton> (${RULES} § Components).` },
        { element: "textarea", message: `Use <TextAreaBasic> (${RULES} § Components).` },
        { element: "select", message: `Use <Dropdown> (${RULES} § Components).` },
      ],
      // Repeats the shared selectors: a later block replaces a rule's options, it does not merge them.
      "vue/no-restricted-syntax": [LEVEL, ...NO_REMOVED_COMPONENT, NO_RAW_INLINE_STYLE, NO_RAW_INPUT],
    },
  },
];
