const { test, openPinned } = require("./support/state");
const { writeReport } = require("./support/report");
const { tolerancePx, screens: frames } = require("./figma/figma-landmarks.json");
const { screens } = require("./capture-spec.json");

// Layer 2 — Figma landmarks, report mode until P4: elements carrying data-fid="<landmark id>" are compared
// with the frame's landmark box (±tolerancePx). Radius differences are listed, not judged: Figma radii map
// onto the code scale first (known difference KD09). Never fails in P1; no data-fid exists before the P4 shell.
const GEOMETRY = ["x", "y", "width", "height"];

const rowFor = (frame, viewport) => screens.find((row) => row.figma?.[viewport] === frame);
const withinTolerance = (expected, actual) =>
  GEOMETRY.every((key) => Math.abs(expected[key] - actual[key]) <= tolerancePx);

function compare(landmarks, boxes) {
  const found = new Map(boxes.map((box) => [box.id, box]));
  const result = { matched: [], mismatched: [], missing: [], unknown: [], radius: [] };
  for (const [id, expected] of Object.entries(landmarks)) {
    const actual = found.get(id);
    if (!actual) {
      result.missing.push(id);
      continue;
    }
    if (withinTolerance(expected, actual)) result.matched.push(id);
    else result.mismatched.push({ id, expected, actual });
    if (expected.radius !== actual.radius) result.radius.push({ id, figma: expected.radius, code: actual.radius });
  }
  result.unknown = boxes.filter((box) => !landmarks[box.id]).map((box) => box.id);
  return result;
}

for (const [frame, { viewport, landmarks }] of Object.entries(frames)) {
  test.describe(() => {
    test.use({ colorScheme: "dark" });
    test(`landmarks ${frame}`, { tag: ["@landmarks", `@${viewport}`] }, async ({ context, page }) => {
      const row = rowFor(frame, viewport);
      await openPinned({ context, page }, row.id, "dark");
      const boxes = await page.evaluate(() => window.visualProbes.fidBoxes());
      const result = compare(landmarks, boxes);
      writeReport(`landmarks/${frame}.json`, { frame, screen: row.id, viewport, ...result });
      test.info().annotations.push({
        type: "landmarks",
        description: `${frame}: ${result.matched.length} matched, ${result.mismatched.length} off, ${result.missing.length} missing`,
      });
    });
  });
}
