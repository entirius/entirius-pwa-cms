// Shared runner of the P3 codemods (scripts/codemods/p3-<section>.mjs). A codemod is a transform:
//   transform(text, file) → { edits: [{ start, end, text }], flags: [{ offset, message }] }
// Edits replace source ranges found through the parsed SFC template, so markup the codemod does not touch stays
// byte-identical. A flag is a call site the codemod cannot decide: the sweep plan resolves it by hand.
// CLI of every codemod: node scripts/codemods/p3-<section>.mjs [--write | --check] [--part 1|2] [files…]
//   (none)     dry run: report every rewrite and every flag
//   --write    apply the rewrites (flags stay)
//   --check    exit 1 while anything is left to rewrite or flagged
//   --part N   only the files of sweep partition N (p3-partitions.mjs); files given by name win over it
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import vueParser from "vue-eslint-parser";
import { partitionFiles } from "./p3-partitions.mjs";

export const ROOT = new URL("../../", import.meta.url).pathname;
const PARSER_OPTIONS = { sourceType: "module", ecmaVersion: "latest" };

export const parseSfc = (text) => vueParser.parse(text, { ...PARSER_OPTIONS, filePath: "file.vue" });
export const parseScript = (text) => vueParser.parse(text, { ...PARSER_OPTIONS, filePath: "file.js" });

// Calls visit(node) for every node of the template (elements, attributes, expressions).
export function walkTemplate(ast, visit) {
  if (!ast.templateBody) return;
  vueParser.AST.traverseNodes(ast.templateBody, { enterNode: visit, leaveNode() {} });
}

// Name of a static attribute or of a bound one (`:icon` → "icon").
export const attributeName = (attr) => (attr.directive ? attr.key.argument?.name : attr.key.name);

export function applyEdits(text, edits) {
  const sorted = [...edits].sort((a, b) => b.start - a.start);
  sorted.forEach((edit, i) => {
    if (i && edit.end > sorted[i - 1].start) throw new Error(`overlapping edits at ${edit.start}`);
  });
  return sorted.reduce((out, { start, end, text: replacement }) => out.slice(0, start) + replacement + out.slice(end), text);
}

const lineOf = (text, offset) => text.slice(0, offset).split("\n").length;

function parseArgs(argv) {
  const partAt = argv.indexOf("--part");
  const part = partAt === -1 ? null : Number(argv[partAt + 1]);
  if (partAt !== -1 && ![1, 2].includes(part)) throw new Error("--part takes 1 or 2");
  const files = argv.filter((arg, i) => !arg.startsWith("--") && (partAt === -1 || i !== partAt + 1));
  return { write: argv.includes("--write"), check: argv.includes("--check"), part, files };
}

// Rewrites one file (when `write`), returns its report lines.
function runFile(file, transform, write) {
  const text = readFileSync(join(ROOT, file), "utf8");
  const { edits, flags } = transform(text, file);
  const lines = [
    ...edits.map((e) => `${file}:${lineOf(text, e.start)}  ${text.slice(e.start, e.end)} → ${e.text}`),
    ...flags.map((f) => `${file}:${lineOf(text, f.offset)}  FLAG ${f.message}`),
  ];
  if (write && edits.length) {
    const out = applyEdits(text, edits);
    parseSfc(out); // a rewrite that breaks the SFC throws before it is written
    writeFileSync(join(ROOT, file), out);
  }
  return { lines, edits: edits.length, flags: flags.length };
}

export function runCodemod(name, transform, argv = process.argv.slice(2)) {
  const { write, check, part, files } = parseArgs(argv);
  const targets = files.length ? files : partitionFiles(part ?? undefined);
  const results = targets.map((file) => runFile(file, transform, write));
  results.forEach(({ lines }) => lines.forEach((line) => console.log(line)));
  const edits = results.reduce((sum, r) => sum + r.edits, 0);
  const flags = results.reduce((sum, r) => sum + r.flags, 0);
  console.log(`${name}: ${edits} rewrite(s)${write ? " applied" : ""}, ${flags} flag(s) in ${targets.length} file(s)`);
  if (check && edits + flags) process.exitCode = 1;
}
