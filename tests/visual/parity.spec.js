const { AxeBuilder } = require("@axe-core/playwright");
const { test, expect, THEME_VALUES, openPinned } = require("./support/state");
const { expectedTokens, themeColors, brandFamilies } = require("./support/tokens");
const { writeReport, mergeReport } = require("./support/report");

// Layer 1 — token parity. Gates: token resolution (semantic and brand-scale tokens) and body text in Inter.
// Census, the other fonts and contrast are reports.
const THEMES = ["dark", "light"];
const CENSUS_SCREENS = ["g-home", "pages-content-list", "pages-content-editor", "pim-products-list"]; // S1, S4, S6, PIM
const CONTRAST_SCREENS = ["g-home", "pages-content-list", "pages-content-editor"]; // S1, S4, S6
const FONT_TARGETS = { title: ".route-title", navLabel: ".nav-label", button: ".data-table__action-btn" };
const FAMILIES = brandFamilies();
const BRAND_FAMILIES = [FAMILIES.brand, FAMILIES.ui];
const BODY_TEXT = ".data-table__cell[data-column]"; // a text cell (not a checkbox/toggle cell) inherits the body font
const REPORT = { tag: ["@parity", "@desktop"] };

const colorScheme = (theme) => (theme === "dark" ? "dark" : "light");

for (const theme of THEMES) {
  test.describe(`token resolution ${theme}`, () => {
    test.use({ colorScheme: colorScheme(theme) });
    test(`every source token resolves on / (${theme})`, { tag: "@parity" }, async ({ context, page }, testInfo) => {
      await openPinned({ context, page }, "g-home", theme);
      await expect(page.locator("html")).toHaveAttribute("data-theme", THEME_VALUES[theme]);
      const expected = expectedTokens(theme, testInfo.project.use.viewport.width);
      const mismatches = await page.evaluate((tokens) => window.visualProbes.resolveTokens(tokens), expected);
      expect(mismatches).toEqual([]);
    });
  });
}

test.describe("census (report, dark)", () => {
  test.use({ colorScheme: "dark" });
  for (const id of CENSUS_SCREENS) {
    test(`census ${id}`, REPORT, async ({ context, page }) => {
      await openPinned({ context, page }, id, "dark");
      const names = Object.keys(themeColors("dark"));
      const census = await page.evaluate((tokens) => window.visualProbes.census(tokens), names);
      mergeReport("census.json", id, census);
    });
  }
});

async function platformFonts(page, selector) {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("DOM.enable");
  await cdp.send("CSS.enable");
  const { root } = await cdp.send("DOM.getDocument");
  const { nodeId } = await cdp.send("DOM.querySelector", { nodeId: root.nodeId, selector });
  if (!nodeId) return { selector, found: false, fonts: [] };
  const { fonts } = await cdp.send("CSS.getPlatformFontsForNode", { nodeId });
  return { selector, found: true, fonts: fonts.map((f) => ({ family: f.familyName, isCustomFont: f.isCustomFont })) };
}

test.describe("font gate", () => {
  test.use({ colorScheme: "dark" });
  test("body text renders in the UI font on S4", { tag: ["@parity", "@desktop"] }, async ({ context, page }) => {
    await openPinned({ context, page }, "pages-content-list", "dark");
    const { found, fonts } = await platformFonts(page, BODY_TEXT);
    expect(found, `${BODY_TEXT} not on the page`).toBe(true);
    expect(fonts.length).toBeGreaterThan(0);
    expect(fonts).toEqual(fonts.map(() => ({ family: FAMILIES.ui, isCustomFont: true })));
  });
});

test.describe("font gate (report)", () => {
  test.use({ colorScheme: "dark" });
  test("brand fonts render on S4", REPORT, async ({ context, page }) => {
    await openPinned({ context, page }, "pages-content-list", "dark");
    const targets = {};
    for (const [name, selector] of Object.entries(FONT_TARGETS)) targets[name] = await platformFonts(page, selector);
    const brand = Object.values(targets).every(
      ({ fonts }) => fonts.length && fonts.every((f) => f.isCustomFont && BRAND_FAMILIES.includes(f.family))
    );
    writeReport("fonts.json", { screen: "pages-content-list", brandFontsRendered: brand, targets });
  });
});

test.describe("contrast (report)", () => {
  for (const theme of THEMES) {
    test.describe(theme, () => {
      test.use({ colorScheme: colorScheme(theme) });
      for (const id of CONTRAST_SCREENS) {
        test(`color-contrast ${id} (${theme})`, REPORT, async ({ context, page }) => {
          await openPinned({ context, page }, id, theme);
          const { violations } = await new AxeBuilder({ page }).withRules(["color-contrast"]).analyze();
          const nodes = violations.flatMap((v) =>
            v.nodes.map((node) => ({ target: node.target.join(" "), summary: node.failureSummary }))
          );
          mergeReport("contrast.json", `${id}-${theme}`, nodes);
        });
      }
    });
  }
});
