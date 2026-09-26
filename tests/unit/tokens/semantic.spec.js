import { describe, it, expect } from "vitest";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

const ROOT = path.resolve(__dirname, "../../..");
const SCRIPT = path.join(ROOT, "scripts/tokens/build-theme.mjs");
const GENERATED = path.join(ROOT, "src/assets/scss/themes/_semantic.generated.scss");

describe("semantic token layer", () => {
  it("the committed theme matches semantic.json (regenerate: node scripts/tokens/build-theme.mjs)", () => {
    const dir = mkdtempSync(path.join(tmpdir(), "cms-semantic-"));
    try {
      const fresh = path.join(dir, "_semantic.generated.scss");
      execFileSync(process.execPath, [SCRIPT, fresh]);
      expect(readFileSync(GENERATED, "utf8")).toBe(readFileSync(fresh, "utf8"));
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
