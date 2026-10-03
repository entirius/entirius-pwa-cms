#!/usr/bin/env node
// Read-only audit (plan 19): the mutating controls of a panel's views that the read-only mode does not reach. A
// finding is a template `@click` whose handler calls — directly or through the file's own functions — a POST, PUT,
// PATCH or DELETE function imported from `@/api`, on an element that is not a `BasicButton`/`IconButton` marked
// `mutates` (those hide themselves under a read-only PageLayout). ActionBar, FloatingActions and BulkActionBar take
// their actions as data, so they never show up here. Code only, no page is opened; a heuristic, not a proof.
// Usage: node scripts/audit/readonly.mjs [--panels pages,pim] [--fail-on-findings]
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { pathToFileURL } from "node:url";

const ROOT = new URL("../../", import.meta.url).pathname;
const ROUTER = "src/router/index.js";
const VIEWS = "src/views";
const WRITE_API = /^(POST|PUT|PATCH|DELETE)_/;
// The boots that honour `mutates` (they inject the PageLayout flag).
const AWARE = new Set(["BasicButton", "IconButton"]);
const TAG = /<([A-Za-z][\w.-]*)((?:\s+[^\s"'>/=]+(?:\s*=\s*(?:"[^"]*"|'[^']*'))?)*)\s*\/?>/g;
const CLICK = /(?:@|v-on:)click(?:\.[\w.]+)?\s*=\s*"([^"]*)"/;
const FUNCTION = /(?:function\s+(\w+)\s*\(|(?:const|let)\s+(\w+)\s*=\s*(?:async\s*)?(?:\([^)]*\)|\w+)\s*=>|^\s+(?:async\s+)?(\w+)\s*\([^)]*\)\s*\{)/gm;

const KEYWORDS = new Set(["if", "for", "while", "switch", "catch", "function", "return"]);

const read = (file) => readFileSync(join(ROOT, file), "utf8");

function vueFiles(dir) {
  return readdirSync(join(ROOT, dir), { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return vueFiles(path);
    return entry.name.endsWith(".vue") ? [path] : [];
  });
}

/** [{ panel, file }] of every routed view: the component's file and the `panel` of its route's meta. */
export function routedViews(source) {
  const statics = Object.fromEntries(
    [...source.matchAll(/^import (\w+) from "\.\.\/views\/([^"]+)"/gm)].map(([, name, path]) => [name, path])
  );
  const components = [...source.matchAll(/component:\s*(?:\(\)\s*=>\s*import\((?:\/\*.*?\*\/\s*)?"\.\.\/views\/([^"]+)"\)|(\w+))/g)];
  return components.flatMap((match, index) => {
    const path = match[1] ?? statics[match[2]];
    const end = components[index + 1]?.index ?? source.length;
    const panel = source.slice(match.index, end).match(/panel:\s*"([\w-]+)"/)?.[1];
    return path && panel ? [{ panel, file: join(VIEWS, path) }] : [];
  });
}

/** The .vue files of a panel: the directory of each routed view (a view at the views root alone). */
export function panelFiles(views, panel) {
  const files = views
    .filter((view) => view.panel === panel)
    .flatMap(({ file }) => (dirname(file) === VIEWS ? [file] : vueFiles(dirname(file))));
  return [...new Set(files)].sort();
}

/** The file's functions whose body (sliced up to the next function) calls a write API, directly or transitively. */
export function mutatingNames(script) {
  const imported = [...script.matchAll(/import\s*\{([^}]*)\}\s*from\s*"@\/api\/[^"]+"/g)]
    .flatMap(([, names]) => names.split(","))
    .map((spec) => spec.trim().split(/\s+as\s+/))
    .filter(([name]) => WRITE_API.test(name))
    .map((parts) => parts.at(-1));
  const starts = [...script.matchAll(FUNCTION)]
    .map((m) => ({ name: m[1] ?? m[2] ?? m[3], at: m.index }))
    .filter(({ name }) => !KEYWORDS.has(name));
  const bodies = starts.map((fn, i) => ({ name: fn.name, body: script.slice(fn.at, starts[i + 1]?.at) }));
  const names = new Set(imported);
  let grew = true;
  while (grew) {
    const found = bodies.filter(({ name, body }) => !names.has(name) && callsAny(body, names));
    found.forEach(({ name }) => names.add(name));
    grew = found.length > 0;
  }
  return names;
}

const callsAny = (code, names) => (code.match(/[A-Za-z_$][\w$]*(?=\s*\()/g) ?? []).some((id) => names.has(id));

const sfcPart = (source, tag) =>
  [...source.matchAll(new RegExp(`^<${tag}[^>]*>([\\s\\S]*?)^</${tag}>`, "gm"))].map((m) => m[1]).join("\n");

/** [{ line, tag, handler }] of one SFC. */
export function auditSource(source) {
  const names = mutatingNames(sfcPart(source, "script"));
  if (!names.size) return [];
  return [...source.matchAll(TAG)].flatMap((match) => {
    const [, tag, attrs] = match;
    const handler = attrs.match(CLICK)?.[1];
    if (!handler || (AWARE.has(tag) && /\s:?mutates\b/.test(attrs))) return [];
    const ids = handler.match(/[A-Za-z_$][\w$]*/g) ?? [];
    if (!ids.some((id) => names.has(id))) return [];
    return [{ line: source.slice(0, match.index).split("\n").length, tag, handler }];
  });
}

function audit(panels) {
  const views = routedViews(read(ROUTER));
  const wanted = panels ?? [...new Set(views.map((view) => view.panel))].sort();
  return wanted.flatMap((panel) =>
    panelFiles(views, panel).flatMap((file) =>
      auditSource(read(file)).map((finding) => ({ panel, file, ...finding }))
    )
  );
}

function main(argv) {
  const panelsArg = argv[argv.indexOf("--panels") + 1];
  const panels = argv.includes("--panels") ? panelsArg.split(",").map((p) => p.trim()) : null;
  const findings = audit(panels);
  for (const { panel, file, line, tag, handler } of findings) {
    console.log(`${panel}\t${relative(ROOT, join(ROOT, file))}:${line}\t<${tag}> @click="${handler}"`);
  }
  console.log(`readonly audit: ${findings.length} finding(s) in ${panels ? panels.join(", ") : "every panel"}`);
  return argv.includes("--fail-on-findings") && findings.length ? 1 : 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) process.exit(main(process.argv.slice(2)));
