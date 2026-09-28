const { test, expect, openPinned } = require("./support/state");
const { writeReport } = require("./support/report");
const { tolerancePx, screens: frames } = require("./figma/figma-landmarks.json");
const { screens } = require("./capture-spec.json");

// Layer 2 — Figma landmarks: elements carrying data-fid="<landmark id>" are compared with the frame's landmark box
// (±tolerancePx). A box is clipped to its frame first (Figma draws the content container past the frame's bottom; the
// code's <main> ends at the viewport). Gate for the shell ids since P4: one of them off or missing fails the frame.
// The page ids (title, card, sticky header, FAB) stay in report mode until their P5 screens. Radius differences are
// listed, not judged: Figma radii map onto the code scale first (known difference KD09).
const GEOMETRY = ["x", "y", "width", "height"];
const SHELL_IDS = ["header", "logo", "user-button", "sidebar", "tab-bar", "mobile-menu", "content"];

const clipToFrame = (box, frame) => ({
  ...box,
  width: Math.min(box.width, frame.width - box.x),
  height: Math.min(box.height, frame.height - box.y),
});

function rowFor(frame, viewport) {
  const row = screens.find((candidate) => candidate.figma?.[viewport] === frame);
  if (!row) throw new Error(`INFRA: no capture-spec row for frame ${frame} on ${viewport}`);
  return row;
}
const withinTolerance = (expected, actual) =>
  GEOMETRY.every((key) => Math.abs(expected[key] - actual[key]) <= tolerancePx);

function compare(frame, boxes) {
  const found = new Map(boxes.map((box) => [box.id, box]));
  const result = { matched: [], mismatched: [], missing: [], unknown: [], radius: [] };
  for (const [id, landmark] of Object.entries(frame.landmarks)) {
    const expected = clipToFrame(landmark, frame);
    const actual = found.get(id);
    if (!actual) {
      result.missing.push(id);
      continue;
    }
    if (withinTolerance(expected, actual)) result.matched.push(id);
    else result.mismatched.push({ id, expected, actual });
    if (expected.radius !== actual.radius) result.radius.push({ id, figma: expected.radius, code: actual.radius });
  }
  result.unknown = boxes.filter((box) => !frame.landmarks[box.id]).map((box) => box.id);
  return result;
}

const shellFailures = ({ mismatched, missing }) => [
  ...mismatched.filter(({ id }) => SHELL_IDS.includes(id)),
  ...missing.filter((id) => SHELL_IDS.includes(id)).map((id) => ({ id, missing: true })),
];

for (const [frame, spec] of Object.entries(frames)) {
  const { viewport } = spec;
  test.describe(() => {
    test.use({ colorScheme: "dark" });
    test(`landmarks ${frame}`, { tag: ["@landmarks", `@${viewport}`] }, async ({ context, page }) => {
      const row = rowFor(frame, viewport);
      await openPinned({ context, page }, row.id, "dark");
      const boxes = await page.evaluate(() => window.visualProbes.fidBoxes());
      const result = compare(spec, boxes);
      writeReport(`landmarks/${frame}.json`, { frame, screen: row.id, viewport, ...result });
      test.info().annotations.push({
        type: "landmarks",
        description: `${frame}: ${result.matched.length} matched, ${result.mismatched.length} off, ${result.missing.length} missing`,
      });
      expect(shellFailures(result), `${frame}: shell landmarks off by more than ${tolerancePx} px`).toEqual([]);
    });
  });
}
