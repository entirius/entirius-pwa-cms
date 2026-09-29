import { describe, it, expect } from "vitest";
import { ESLint } from "eslint";
import stylelint from "stylelint";

// The UI rules fail the build (plan 56): every finding of `npm run lint:ui` is an error, never a warning.
const eslint = new ESLint({ cwd: process.cwd() });
const lintVue = async (filePath, code) => (await eslint.lintText(code, { filePath }))[0].messages;
const lintScss = async (code) =>
  (await stylelint.lint({ code, codeFilename: "src/views/Probe.scss", cwd: process.cwd() })).results[0].warnings;

describe("UI lint", () => {
  it("a native <select> in a view is an error (BasicSelect only)", async () => {
    const messages = await lintVue("src/views/Probe.vue", "<template><select><option>a</option></select></template>");
    expect(messages).toEqual([expect.objectContaining({ severity: 2, message: expect.stringContaining("BasicSelect") })]);
  });

  it("a boot owns its native control", async () => {
    expect(await lintVue("src/boots/Probe/index.vue", "<template><select><option>a</option></select></template>")).toEqual([]);
  });

  it("an off-token spacing value is an error", async () => {
    const warnings = await lintScss(".probe { margin: 5px; }");
    expect(warnings.map(({ severity, rule }) => [severity, rule])).toEqual([
      ["error", "scale-unlimited/declaration-strict-value"],
    ]);
  });
});
