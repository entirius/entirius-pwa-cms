// CMS UI lint, style side. Rule IDs (T1…) refer to docs/ui-rules.md § Tokens.
// P1 ships it as warnings (debt report); P5 flips defaultSeverity to "error".
// The old palette (`--c-<colour>-<shade>` and its classes, removed in P2) is an error already: it no longer renders.

const OLD_COLOUR_VAR = /var\(\s*--c-[a-z]+-\d/;
const OLD_COLOUR_CLASS = /\.(t|bg|b|bb|bt|bl|br|o|stroke)-(basic|support|primary|positive|negative|warning|informative|notice)-\d+/;

export default {
  defaultSeverity: "warning",
  plugins: ["stylelint-declaration-strict-value"],
  overrides: [
    { files: ["**/*.vue"], customSyntax: "postcss-html" },
    { files: ["**/*.scss"], customSyntax: "postcss-scss" },
  ],
  // Token definitions are the one place raw values are allowed.
  ignoreFiles: [
    "src/assets/scss/themes/**",
    "src/assets/scss/variables/**",
    "src/assets/scss/main.scss",
    "src/assets/scss/typo/font-icons/**",
    "src/assets/scss/typo/wysiwyg-icons/**",
  ],
  rules: {
    // T1 colour comes from a token
    "color-no-hex": true,
    "color-named": "never",
    "function-disallowed-list": ["rgb", "rgba", "hsl", "hsla", "hwb"],
    // T1 no old palette var (error) · T2 no fallback on a token: var(--text-body, #fff) hides a missing token
    "declaration-property-value-disallowed-list": [
      {
        "/.*/": [OLD_COLOUR_VAR, "/var\\(\\s*--(space|fs|radius|shadow|overlay|surface|text|border|accent|positive|negative|warning|info)[\\w-]*\\s*,/"],
        // T4 radius comes from the radius scale, never from spacing (var(--space-50) as a radius)
        "/radius$/": ["/var\\(\\s*--(?!radius-)/"],
      },
      { severity: (property, value) => (OLD_COLOUR_VAR.test(value) ? "error" : "warning") },
    ],
    // T1 no old palette class as a selector
    "selector-disallowed-list": [[OLD_COLOUR_CLASS], { severity: "error" }],
    // T3 spacing, T4 radius, T5 type size and shadow come from tokens
    "scale-unlimited/declaration-strict-value": [
      [
        "/^(margin|padding)-(top|right|bottom|left|inline|block)(-(start|end))?$/",
        "gap",
        "row-gap",
        "column-gap",
        "/^border-(top|bottom)-(left|right)-radius$/",
        "font-size",
        "box-shadow",
      ],
      {
        ignoreVariables: true,
        ignoreFunctions: true, // calc()/min()/clamp(); raw colour functions are caught by T1
        expandShorthand: true, // margin/padding/border-radius shorthands are checked per side
        ignoreValues: {
          "": ["0", "auto", "inherit", "initial", "unset", "none"],
          "/^border-(top|bottom)-(left|right)-radius$/": ["0", "50%", "inherit"],
          "font-size": ["inherit", "100%", "1em"],
        },
        message: "Raw ${value} in ${property}: use a token (docs/ui-rules.md § Tokens)",
      },
    ],
  },
};
