#!/usr/bin/env node
// Minimal, repo-agnostic CLI. All scheduling happens in the TARGET repo via workflows.
// Guardrails baked in. TODOs are intentionally small & focused.

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const CONFIG = {
  openaiKey: process.env.OPENAI_API_KEY || "",
  githubToken: process.env.GITHUB_TOKEN || "",
  vercelToken: process.env.VERCEL_TOKEN || "",
  vercelProjectId: process.env.VERCEL_PROJECT_ID || "",
  targetBranch: process.env.TARGET_BRANCH || "main",
  limits: { maxFiles: 5, maxLoc: 300 }
};

function parseArgs() {
  const args = process.argv.slice(2);
  const cmd = args[0];
  const map = {};
  for (let i = 1; i < args.length; i++) {
    if (args[i] === "--job") map.job = args[++i];
    else if (args[i] === "--dir") map.dir = args[++i];
    else if (args[i] === "--dry-run") map.dryRun = true;
  }
  return { cmd, ...map };
}

function logNoop(reason) {
  console.log(`NO-OP: ${reason}`);
  process.exit(0);
}

function readText(p) {
  try { return fs.readFileSync(p, "utf8"); } catch { return ""; }
}
function writeText(p, content) {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, content, "utf8");
}
function dedupeLines(existingMd, newItems) {
  const existing = new Set(existingMd.split("\n").map(s => s.trim().toLowerCase()).filter(Boolean));
  const out = [];
  for (const item of newItems) {
    const key = item.trim().toLowerCase();
    if (!existing.has(key)) out.push(item);
  }
  return out;
}
function countLocDiff(before, after) {
  const b = before.split("\n").length;
  const a = after.split("\n").length;
  return Math.abs(a - b);
}

async function jobJ1(dir) {
  // Ingest logs → /roadmap/bugs.md
  if (!CONFIG.vercelToken || !CONFIG.vercelProjectId) return logNoop("Missing Vercel tokens");
  const bugsPath = path.join(dir, "roadmap", "bugs.md");
  const existing = readText(bugsPath);

  // TODO(Codex): fetch latest build + recent runtime logs via Vercel API and parse errors/warnings
  // For now, produce no changes if not implemented
  const parsed = []; // e.g., ["- [bug] Build warning XYZ — short note", "- [bug] Runtime error ABC — stack..."]

  if (parsed.length === 0) return logNoop("No new logs to ingest");
  const additions = dedupeLines(existing, parsed);
  if (additions.length === 0) return logNoop("All parsed bugs already exist");
  const updated = (existing ? existing.trim() + "\n" : "") + additions.join("\n") + "\n";

  if (countLocDiff(existing, updated) > CONFIG.limits.maxLoc) return logNoop("Change too large");
  writeText(bugsPath, updated);
  console.log(`UPDATED: ${bugsPath}`);
}

async function jobJ2(dir) {
  // Review → bugs.md & new.md (dedupe; no priorities)
  const vision = readText(path.join(dir, "roadmap", "vision.md"));
  const done = readText(path.join(dir, "roadmap", "done.md"));
  const bugsPath = path.join(dir, "roadmap", "bugs.md");
  const newPath = path.join(dir, "roadmap", "new.md");
  const bugs = readText(bugsPath);
  const newMd = readText(newPath);

  if (!CONFIG.openaiKey) return logNoop("Missing OPENAI_API_KEY");

  // TODO(Codex): read last 24h commits (via GitHub API) and ask LLM for concise items
  const newBugs = [];      // e.g., ["- [bug] Title — body"]
  const newImprovements = []; // e.g., ["- [improvement] Title — body"] or features

  let changed = false;
  if (newBugs.length) {
    const add = dedupeLines(bugs, newBugs);
    if (add.length) {
      const updated = (bugs ? bugs.trim()+"\n" : "") + add.join("\n") + "\n";
      if (countLocDiff(bugs, updated) <= CONFIG.limits.maxLoc) {
        writeText(bugsPath, updated); changed = true;
      }
    }
  }
  if (newImprovements.length) {
    const add = dedupeLines(newMd, newImprovements);
    if (add.length) {
      const updated = (newMd ? newMd.trim()+"\n" : "") + add.join("\n") + "\n";
      if (countLocDiff(newMd, updated) <= CONFIG.limits.maxLoc) {
        writeText(newPath, updated); changed = true;
      }
    }
  }
  if (!changed) return logNoop("No review changes");
  console.log("UPDATED: bugs.md / new.md");
}

function parseList(md) {
  return md.split("\n").map(l => l.trim()).filter(l => l.startsWith("- "));
}
function stringifyList(items) { return items.join("\n") + (items.length ? "\n" : ""); }

async function jobJ3(dir) {
  // Sync → tasks.md; delete moved items from bugs/new; prioritize 1..N <= 100
  const bugsPath = path.join(dir, "roadmap", "bugs.md");
  const newPath  = path.join(dir, "roadmap", "new.md");
  const tasksPath= path.join(dir, "roadmap", "tasks.md");

  const bugs = parseList(readText(bugsPath));
  const news = parseList(readText(newPath));
  let tasks = parseList(readText(tasksPath));

  const toAdd = [...bugs, ...news].map(line => line.replace(/^\-\s*/,"- [todo] ")); // placeholder type
  // Dedup
  const existingSet = new Set(tasks.map(t => t.toLowerCase()));
  const adds = toAdd.filter(t => !existingSet.has(t.toLowerCase()));

  // Prioritize 1..N (simple stable order); trim to 100
  tasks = [...tasks, ...adds].slice(0, 100).map((t, i) => t.replace(/^\d+\.\s+/, "").startsWith("- ") ? `${i+1}. ${t}` : `${i+1}. ${t}`);

  // Delete moved items from bugs/new
  const nextBugs = []; const nextNews = []; // Items moved are removed.

  writeText(tasksPath, stringifyList(tasks));
  writeText(bugsPath, stringifyList(nextBugs));
  writeText(newPath, stringifyList(nextNews));
  console.log("UPDATED: tasks.md, cleared bugs/new");
}

async function jobJ4(dir) {
  // Implement top task → minimal patch + 1 test, update done.md
  const tasksPath = path.join(dir, "roadmap", "tasks.md");
  const donePath  = path.join(dir, "roadmap", "done.md");
  const tasksRaw  = readText(tasksPath);
  const lines = tasksRaw.split("\n").filter(Boolean);
  const top = lines.find(l => /^\s*1\.\s+-\s+/.test(l)) || lines[0];

  if (!top) return logNoop("No tasks to implement");
  if (!CONFIG.openaiKey || !CONFIG.githubToken) return logNoop("Missing OPENAI_API_KEY or GITHUB_TOKEN");

  // TODO(Codex):
  // 1) Ask LLM for a minimal diff (≤5 files, ≤300 LoC) implementing the task + 1 small test.
  // 2) Apply diff in temp branch, run verify (if repo has tests), open PR.
  // 3) On PR creation, remove task from tasks.md and append entry to done.md (commit hash TBD).

  return logNoop("Implementation stub – to be completed by Codex with minimal diff + PR flow");
}

async function main() {
  const { cmd, job, dir, dryRun } = parseArgs();
  if (cmd !== "run") {
    console.log("Usage: ai-dev-agent run --job J1|J2|J3|J4 --dir <target> [--dry-run]");
    process.exit(1);
  }
  if (!dir) return logNoop("Missing --dir");
  const abs = path.resolve(dir);
  if (!fs.existsSync(abs)) return logNoop(`Target dir not found: ${abs}`);

  // Enforce: J1-J3 only modify /roadmap/*; J4 may modify code/tests + /roadmap/done.md
  // NOTE: PR creation is left for Codex to implement via GitHub API calls (kept out for minimal skeleton).

  if (job === "J1") return jobJ1(abs);
  if (job === "J2") return jobJ2(abs);
  if (job === "J3") return jobJ3(abs);
  if (job === "J4") return jobJ4(abs);
  console.log("Unknown job. Use J1|J2|J3|J4");
  process.exit(1);
}

main().catch(e => { console.error(e); process.exit(1); });
