const fs = require("fs");
const path = require("path");
const { REPORT_DIR, writeReport } = require("./report");

// `@ux` report (docs/testing.md → "UX checks"). Later plans gate on the summary shape: keep it stable.
const KINDS = ["zeroSize", "offViewport", "underBottomBar", "nonFocusable", "overlap", "overflow", "tapTarget"];
const HIGH = new Set(["zeroSize", "offViewport", "underBottomBar", "nonFocusable"]);
const METRICS = ["height", "paddingX", "radius", "fontSize", "border"];
const UX_DIR = path.join(REPORT_DIR, "ux");
const SUMMARY = "ux-summary.json";

const severityOf = (kind) => (HIGH.has(kind) ? "high" : "medium");
const countByKind = (issues) =>
  Object.fromEntries(KINDS.map((kind) => [kind, issues.filter((item) => item.kind === kind).length]));
const sortValues = (values) =>
  values.sort((a, b) => parseFloat(a) - parseFloat(b) || String(a).localeCompare(String(b)));
const sortKeys = (object) => Object.fromEntries(Object.entries(object).sort(([a], [b]) => a.localeCompare(b)));

// measured = window.uxProbes.measure() → { issues, buttons, bottomBar }, or { error } when the screen did not open.
function screenReport({ screen, viewport, runId, measured }) {
  if (measured.error) {
    return { runId, screen, viewport, error: measured.error, counts: countByKind([]), issues: [], buttons: [] };
  }
  const issues = measured.issues.map((item) => ({ ...item, severity: severityOf(item.kind) }));
  const { buttons, bottomBar } = measured;
  return { runId, screen, viewport, counts: countByKind(issues), bottomBar, issues, buttons };
}

// { <role>: { <metric>: [distinct values] } } over every button of every screen.
function distinctMetrics(buttons) {
  const roles = {};
  for (const button of buttons) {
    roles[button.role] ||= Object.fromEntries(METRICS.map((metric) => [metric, new Set()]));
    METRICS.forEach((metric) => roles[button.role][metric].add(button[metric]));
  }
  const listed = (sets) => Object.fromEntries(METRICS.map((metric) => [metric, sortValues([...sets[metric]])]));
  return sortKeys(Object.fromEntries(Object.entries(roles).map(([role, sets]) => [role, listed(sets)])));
}

function buildSummary(reports, runId) {
  const totals = Object.fromEntries(KINDS.map((kind) => [kind, { desktop: 0, mobile: 0 }]));
  const screens = {};
  const errors = {};
  for (const report of reports) {
    const key = `${report.screen}__${report.viewport}`;
    screens[key] = report.counts;
    if (report.error) errors[key] = report.error;
    KINDS.forEach((kind) => (totals[kind][report.viewport] += report.counts[kind]));
  }
  const severity = Object.fromEntries(KINDS.map((kind) => [kind, severityOf(kind)]));
  const buttonMetrics = distinctMetrics(reports.flatMap((report) => report.buttons));
  return { runId, totals, severity, screens: sortKeys(screens), buttonMetrics, errors: sortKeys(errors) };
}

// Per-screen reports of this run feed the summary; files of an earlier run are removed, so the folder never mixes runs.
function currentReports(runId) {
  const files = fs.readdirSync(UX_DIR).filter((file) => file.endsWith(".json") && file !== SUMMARY);
  const reports = files.map((file) => ({ file, report: JSON.parse(fs.readFileSync(path.join(UX_DIR, file), "utf8")) }));
  reports.filter(({ report }) => report.runId !== runId).forEach(({ file }) => fs.unlinkSync(path.join(UX_DIR, file)));
  return reports.filter(({ report }) => report.runId === runId).map(({ report }) => report);
}

// Rewrites the summary after every screen, so a crashed worker never loses the screens measured before it.
function writeScreenReport(input) {
  const report = screenReport(input);
  writeReport(`ux/${report.screen}__${report.viewport}.json`, report);
  writeReport(`ux/${SUMMARY}`, buildSummary(currentReports(report.runId), report.runId));
  return report;
}

module.exports = { KINDS, screenReport, buildSummary, writeScreenReport };
