const { test, expect, guide, goto } = require("../support/capture");
const { idle } = require("../../visual/support/state");
const { ROWS } = require("./helpers");

// Guide "Picture checks": the results of a ComfyUI picture check, its run, the product card opened on the checked
// picture, a check started from the PIM grid and a derived picture in Review. Data: the test package's
// `scripts/seed-comfy.py` (workers `demo.packshot_check` and `demo.packshot_whiten`, no ComfyUI). Writes nothing: the
// run dialog is closed without starting, the add / replace choice is kept by the page only and the proposal is never
// accepted. Without the demo the spec fails with `INFRA: picture-checks needs a fresh make seed`.
const { shot } = guide("picture-checks");

const CHECK = "demo.packshot_check";
const WHITEN = "demo.packshot_whiten";
const DERIVED_SKU = "ENT-C005";
const TEMPLATE = "Packshot check"; // the seed's template label
const WORKER_LABEL = "Packshot check (demo)"; // the seed's worker label
const DEMO_SKU_PREFIX = "ENT-";
const CHIP_ESCALATE = '[data-testid="checks-verdict-escalate"]';
const FILTERS = '[data-testid="checks-filters-row"]';
const RESULTS = `[data-testid^="enrichment-task-results-"]`;
const GALLERY = ".media-gallery";
const SELECTED_TILE = ".media-tile--selected";
const DIALOG = '[data-testid="ai-task-dialog"]';
const DETAIL = '[data-testid="enrichment-detail"]';
const APPLY_MODE = '[data-testid="proposal-apply-mode"]';

async function assertDemo(page) {
  if (await page.locator(ROWS).count()) return;
  throw new Error("INFRA: picture-checks needs a fresh make seed");
}

test("picture-checks", async ({ page }) => {
  await test.step("Picture checks of one worker", async () => {
    await goto(page, `/enrichment/checks?worker=${CHECK}`, { ready: `${ROWS}, [data-testid="checks-empty"]` });
    await assertDemo(page);
    await shot(page, "01-picture-checks", {
      callouts: [
        { target: CHIP_ESCALATE, label: "1" },
        { target: FILTERS, label: "2" },
      ],
    });
  });

  await test.step("Escalations only", async () => {
    await page.click(CHIP_ESCALATE);
    await idle(page);
    await expect(page).toHaveURL(/verdict=escalate/);
    await shot(page, "02-escalations");
  });

  await test.step("The run in Runs", async () => {
    await goto(page, "/enrichment/runs", { ready: RESULTS });
    const run = page.locator(ROWS).filter({ has: page.locator(RESULTS) }).filter({ hasText: WORKER_LABEL });
    const results = run.locator(RESULTS);
    await shot(page, "03-run", { callouts: [{ target: `${ROWS}:has-text("${WORKER_LABEL}") ${RESULTS}`, label: "1" }] });
    await results.click();
    await expect(page).toHaveURL(/\/enrichment\/checks\?.*task=/);
    await page.locator(ROWS).first().waitFor();
    await shot(page, "04-run-results", { callouts: [{ target: '[data-testid="checks-task-chip"]', label: "1" }] });
  });

  await test.step("Product card on the checked picture", async () => {
    await goto(page, `/enrichment/checks?worker=${CHECK}&sku=${DERIVED_SKU}`, { ready: ROWS });
    await page.locator(ROWS).first().getByRole("link", { name: DERIVED_SKU }).click();
    await page.waitForURL(new RegExp(`/pim/products/${DERIVED_SKU}\\?picture=`));
    await page.locator(SELECTED_TILE).waitFor();
    await idle(page);
    // The gallery opens on the checked picture: the large preview shows it and its tile is selected.
    await shot(page, "05-product-picture", { element: GALLERY, callouts: [{ target: SELECTED_TILE, label: "1" }] });
  });

  await test.step("Run a check on every matching product", async () => {
    await goto(page, "/pim/products", { ready: ROWS });
    await page.locator(".product-list__search input").fill(DEMO_SKU_PREFIX);
    await idle(page);
    await page.getByTestId("ai-run-matching").click();
    const dialog = page.locator(DIALOG);
    await dialog.waitFor();
    await dialog.getByTestId("ai-task-template").click();
    await page.getByRole("option", { name: TEMPLATE, exact: true }).click();
    await shot(page, "06-run-on-matching", { element: DIALOG });
    await page.keyboard.press("Escape");
    await expect(dialog).toHaveCount(0);
  });

  await test.step("A derived picture in Review", async () => {
    const source = encodeURIComponent(`worker:${WHITEN}@v1`);
    await goto(page, `/enrichment?subject_ref=${DERIVED_SKU}&source=${source}`, { ready: ROWS });
    await page.locator(ROWS).first().click();
    const detail = page.locator(DETAIL);
    await detail.waitFor();
    await detail.locator(APPLY_MODE).getByText("Replace the original", { exact: true }).click();
    await shot(page, "07-derived-picture", { callouts: [{ target: APPLY_MODE, label: "1" }] });
  });
});
