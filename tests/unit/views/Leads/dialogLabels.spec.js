import fs from "fs";
import path from "path";
import { describe, it, expect } from "vitest";

// Plan 34: a dialog or sheet of the Leads panel that has an action of its own is left with "Cancel"; "Close" only on
// a dialog with nothing to do (a read-only view). A ConfirmDialog names what is kept ("Keep task") — not walked here.
const LEADS = path.resolve(__dirname, "../../../../src/views/Leads");
const CLOSE_ONLY = ["DealStages.vue", "SendCheckDialog.vue"];
const CLOSE_KEYS = /\$?t\(\s*["'](common\.close|leads\.task\.close)["']/;

const vueFiles = (dir) =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return vueFiles(full);
    return entry.name.endsWith(".vue") ? [full] : [];
  });

describe("Leads dialogs' secondary labels", () => {
  it("say Close only where the dialog has no action of its own", () => {
    const closing = vueFiles(LEADS)
      .filter((file) => CLOSE_KEYS.test(fs.readFileSync(file, "utf8")))
      .map((file) => path.basename(file));
    expect(closing.sort()).toEqual(CLOSE_ONLY);
  });
});
