const fs = require("fs");
const path = require("path");

// Expected token values, read from today's SCSS sources (not from the built CSS the parity check verifies).
const SCSS = path.resolve(__dirname, "../../../src/assets/scss");
const THEME_FILES = { dark: "themes/__dark.scss", light: "themes/__default.scss" };
const THEME_SELECTORS = { dark: "dark", light: "default" };
const MOBILE_MAX_WIDTH = 640; // main.scss: `max-width: 40rem` switches --space-* to the `m` set

const read = (file) => fs.readFileSync(path.join(SCSS, file), "utf8");

// `$<theme>_colors: (basic: (100: #0C1017, …), …)` → { "--c-basic-100": "#0C1017", … }
function themeColors(theme) {
  const tokens = {};
  let color = null;
  for (const line of read(THEME_FILES[theme]).split("\n")) {
    const group = line.match(/^\s*([a-z][\w-]*):\s*\($/i);
    const shade = line.match(/^\s*(\d+):\s*(.+?)\s*,?\s*$/);
    if (group) color = group[1];
    else if (shade && color) tokens[`--c-${color}-${shade[1]}`] = shade[2];
  }
  return tokens;
}

function declarations(block, prefix) {
  const pattern = new RegExp(`(--${prefix}-[\\w-]+):\\s*([^;]+);`, "g");
  return Object.fromEntries([...block.matchAll(pattern)].map((m) => [m[1], m[2].trim()]));
}

function themeBlock(theme) {
  const source = read("main.scss");
  const selector = `[data-theme="${THEME_SELECTORS[theme]}"] {`;
  const start = source.indexOf(selector);
  if (start < 0) throw new Error(`main.scss has no ${selector} block`);
  return source.slice(start, source.indexOf("\n}", start));
}

// `$spacing: (m: (0: 0, 50: 5px, …), d: (…))` → the set for the viewport width
function spacing(viewportWidth) {
  const device = viewportWidth <= MOBILE_MAX_WIDTH ? "m" : "d";
  const source = read("variables/_spacing.scss");
  const start = source.indexOf(`${device}: (`);
  if (start < 0) throw new Error(`_spacing.scss has no "${device}" set`);
  const block = source.slice(start, source.indexOf(")", start));
  const entries = [...block.matchAll(/^\s*(\d+):\s*([^,\n]+),/gm)];
  return Object.fromEntries(entries.map((m) => [`--space-${m[1]}`, m[2].trim()]));
}

// kind → the CSS property a probe element normalises the value through. Fails closed: a source the parser
// no longer understands must break the gate, never shrink it to nothing.
function expectedTokens(theme, viewportWidth) {
  const expected = {
    color: themeColors(theme),
    boxShadow: declarations(themeBlock(theme), "shadow"),
    borderTopLeftRadius: declarations(read("main.scss"), "radius"),
    marginLeft: spacing(viewportWidth),
  };
  const empty = Object.keys(expected).filter((kind) => !Object.keys(expected[kind]).length);
  if (empty.length) throw new Error(`no ${empty.join(", ")} tokens parsed for ${theme}: update support/tokens.js`);
  return expected;
}

module.exports = { expectedTokens, themeColors };
