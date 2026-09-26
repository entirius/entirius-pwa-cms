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
    // C3 no hand-rolled copy of a boot class · T4 no radius from the spacing scale · C5 no icon-font glyph
    // · T1 no colour shade the palette does not generate (renders nothing; regenerate the regex in P2).
    files: ["src/**/*.vue"],
    ignores: ["src/boots/**"], // boots own these classes
    rules: {
      "vue/no-restricted-class": [
        LEVEL,
        "filter-chip",
        "status-badge",
        "pim-badge",
        "/^br-\\d+$/",
        "/^icon-(?!only-mobile$)/",
        "/^(t|bg|b|bb|bt|bl|br|o|stroke)-(primary|positive|negative|warning|informative)-[4-9]00$/",
      ],
    },
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
