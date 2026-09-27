const path = require("path");
const { test, prepareContext, openScreen } = require("./support/state");
const { writeScreenReport } = require("./support/ux-report");
const { screens } = require("./capture-spec.json");

// Layer 4 — UX checks (@ux), report mode: every capture-spec screen × viewport, dark, is measured for broken or
// inconsistent UI (support/ux.browser.js) and written to .report/ux/. A finding never fails the test; a screen that
// does not open (INFRA) is recorded under `errors` in the summary instead of measured. Any other error is a probe bug
// and fails the test — its zero counts would otherwise pass as a clean screen.
const PROBES = path.join(__dirname, "support", "ux.browser.js");

// Editors and lazy widgets mount after the data arrives; under parallel load that can land after openScreen returns.
// Measure only once the element count has not changed for QUIET_MS (at most SETTLE_MS).
const QUIET_MS = 500;
const SETTLE_MS = 5000;

async function waitForDomSettle(page) {
  await page.waitForFunction(
    ({ quietMs }) => {
      const count = document.getElementsByTagName("*").length;
      const now = performance.now();
      if (window.__uxSettle?.count !== count) window.__uxSettle = { count, since: now };
      return now - window.__uxSettle.since >= quietMs;
    },
    { quietMs: QUIET_MS },
    { timeout: SETTLE_MS, polling: 100 }
  ).catch(() => {}); // a screen that never settles (a live ticker) is measured as it is after SETTLE_MS
}

async function measureScreen(page, screen, viewport) {
  const skipReason = await openScreen(page, screen);
  if (skipReason) return { skipReason };
  await waitForDomSettle(page);
  await page.addScriptTag({ path: PROBES });
  const args = { viewportWidth: page.viewportSize().width, mobile: viewport === "mobile" };
  return page.evaluate((options) => window.uxProbes.measure(options), args);
}

function defineUxTest(screen, viewport) {
  test.describe(() => {
    test.use({ colorScheme: "dark", needsAuth: !screen.noAuth });
    test(`ux ${screen.id}-${viewport}`, { tag: ["@ux", `@${viewport}`] }, async ({ context, page }) => {
      await prepareContext(context, { theme: "dark", collapsed: screen.collapsed });
      const measured = await measureScreen(page, screen, viewport).catch((err) => {
        if (!err.message.startsWith("INFRA:")) throw err;
        return { error: err.message.split("\n")[0] };
      });
      test.skip(Boolean(measured.skipReason), measured.skipReason);
      const runId = process.env.VISUAL_RUN_ID;
      const { counts, error } = writeScreenReport({ screen: screen.id, viewport, runId, measured });
      const found = Object.entries(counts).filter(([, n]) => n).map(([kind, n]) => `${kind} ${n}`);
      test.info().annotations.push({ type: "ux", description: error || found.join(", ") || "clean" });
    });
  });
}

for (const screen of screens) {
  for (const viewport of screen.viewports) defineUxTest(screen, viewport);
}
