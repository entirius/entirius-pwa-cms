const { AxeBuilder } = require("@axe-core/playwright");
const { test, expect, THEME_VALUES, openPinned } = require("./support/state");
const { expectedTokens, themeColors } = require("./support/tokens");
const { writeReport } = require("./support/report");

// Layer 1 — token parity. Only token resolution is a gate in P1; census, fonts and contrast are reports.
const THEMES = ["dark", "light"];
const CENSUS_SCREENS = ["g-home", "pages-content-list", "pages-content-editor", "pim-products-list"]; // S1, S4, S6, PIM
const CONTRAST_SCREENS = ["g-home", "pages-content-list", "pages-content-editor"]; // S1, S4, S6
const FONT_TARGETS = { title: ".route-title", navLabel: ".nav-label", button: ".data-table__action-btn" };
const BRAND_FAMILIES = ["Lexend Deca", "Inter"];
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

test.describe("census (report)", () => {
  const results = {};
  test.use({ colorScheme: "dark" });
  test.afterAll(() => writeReport("census.json", { theme: "dark", screens: results }));
  for (const id of CENSUS_SCREENS) {
    test(`census ${id}`, REPORT, async ({ context, page }) => {
      await openPinned({ context, page }, id, "dark");
      const names = Object.keys(themeColors("dark"));
      results[id] = await page.evaluate((tokens) => window.visualProbes.census(tokens), names);
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
  const results = {};
  test.afterAll(() => writeReport("contrast.json", results));
  for (const theme of THEMES) {
    test.describe(theme, () => {
      test.use({ colorScheme: colorScheme(theme) });
      for (const id of CONTRAST_SCREENS) {
        test(`color-contrast ${id} (${theme})`, REPORT, async ({ context, page }) => {
          await openPinned({ context, page }, id, theme);
          const { violations } = await new AxeBuilder({ page }).withRules(["color-contrast"]).analyze();
          results[`${id}-${theme}`] = violations.flatMap((v) =>
            v.nodes.map((node) => ({ target: node.target.join(" "), summary: node.failureSummary }))
          );
        });
      }
    });
  }
});
