// CMS UI lint, style side. Rule IDs (T1…) refer to docs/ui-rules.md § Tokens.
// P1 ships it as warnings (debt report); P5 flips defaultSeverity to "error".

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
    // T2 no fallback on a token: var(--c-basic-100, #fff) hides a missing token
    "declaration-property-value-disallowed-list": {
      "/.*/": ["/var\\(\\s*--(c|space|fs|radius|shadow|overlay)-[\\w-]+\\s*,/"],
      // T4 radius comes from the radius scale, never from spacing (var(--space-50) as a radius)
      "/radius$/": ["/var\\(\\s*--(?!radius-)/"],
    },
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
