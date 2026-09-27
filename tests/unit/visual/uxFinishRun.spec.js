import fs from "fs";
import os from "os";
import path from "path";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

// The report folder is resolved when ux-report loads, so point it at a temp dir before the import.
const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ux-report-"));
const uxDir = path.join(dir, "ux");
let finishRun;

const screen = (runId, name) => ({ runId, screen: name, viewport: "desktop", counts: {}, issues: [], buttons: [] });
const put = (file, data) => fs.writeFileSync(path.join(uxDir, file), JSON.stringify(data));
const files = () => fs.readdirSync(uxDir).sort();

describe("@ux finishRun (global teardown)", () => {
  beforeAll(async () => {
    process.env.VISUAL_REPORT_DIR = dir;
    ({ finishRun } = await import("../../visual/support/ux-report"));
  });

  afterAll(() => {
    fs.rmSync(dir, { recursive: true, force: true });
    delete process.env.VISUAL_REPORT_DIR;
  });

  beforeEach(() => {
    fs.rmSync(uxDir, { recursive: true, force: true });
    fs.mkdirSync(uxDir, { recursive: true });
  });

  it("leaves the folder untouched when the run measured no @ux screen", () => {
    put("a__desktop.json", screen("earlier", "a"));
    expect(finishRun("parity-run")).toBe(false);
    expect(files()).toEqual(["a__desktop.json"]);
  });

  it("rebuilds the summary from every screen of the run and drops an earlier run", () => {
    put("a__desktop.json", screen("run", "a"));
    put("b__desktop.json", screen("run", "b"));
    put("c__desktop.json", screen("earlier", "c"));
    expect(finishRun("run")).toBe(true);
    const summary = JSON.parse(fs.readFileSync(path.join(uxDir, "ux-summary.json"), "utf8"));
    expect(Object.keys(summary.screens)).toEqual(["a__desktop", "b__desktop"]);
    expect(files()).toEqual(["a__desktop.json", "b__desktop.json", "ux-summary.json"]);
  });
});
