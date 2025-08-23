import fs from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import cp from "node:child_process";
import crypto from "node:crypto";
import { chatJSON } from "../util/llm.js";

const sh = (c: string) => cp.execSync(c, { stdio: "inherit" });

function rand(n = 4) {
  return crypto.randomBytes(n).toString("hex");
}

function remoteBranchExists(name: string) {
  try {
    cp.execSync(`git ls-remote --exit-code --heads origin ${name}`, {
      stdio: "ignore",
    });
    return true;
  } catch {
    return false;
  }
}

function uniqueBranch(base: string) {
  let name = base;
  let tries = 0;
  while (remoteBranchExists(name) && tries < 5) {
    name = `${base}-${new Date()
      .toISOString()
      .replace(/[-:TZ.]/g, "")
      .slice(0, 12)}-${rand(2)}`;
    tries++;
  }
  return name;
}

type Patch = { path: string; action: "add" | "edit"; content: string };

async function llmPatchPlan(prompt: string, apiKey: string): Promise<Patch[]> {
  const json = await chatJSON<{ plan: Patch[] }>({
    apiKey,
    messages: [
      {
        role: "user",
        content:
          `Return JSON: { "plan": [ { "path": "pages/api/....js", "action":"add|edit", "content": "<file content>" }, ... ] }
Only include files under pages/**, lib/**, src/**. Keep changes minimal.`,
      },
    ],
    fallback: { plan: [] },
  });
  return json.plan ?? [];
}

const changed: string[] = [];

async function writeFileSafely(filePath: string, content: string) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, content, "utf8");
}

async function markTopTaskDone(newTitle?: string) {
  const tasksPath = path.join(".ai", "backlog", "tasks.md");
  const text = await fs.readFile(tasksPath, "utf8").catch(() => "");
  if (!text) return;
  const lines = text.split("\n");
  const idx = lines.findIndex((l) => l.startsWith("- [ ] T-"));
  if (idx === -1) return;
  if (newTitle) {
    const prefix = lines[idx].split(":")[0];
    lines[idx] = `${prefix}: ${newTitle}`;
  }
  lines[idx] = lines[idx].replace("- [ ]", "- [x]");
  await fs.writeFile(tasksPath, lines.join("\n"), "utf8");
}

async function tryHeuristics(taskLine: string): Promise<boolean> {
  // /api/vote
  if (/\/?api\/?vote|vote api/i.test(taskLine)) {
    const p = "pages/api/vote.js";
    const content = `export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }
  const { featureId } = req.body || {};
  if (!featureId) return res.status(400).json({ ok: false, error: 'featureId required' });
  // TODO: Wire to Supabase in a later task
  return res.status(200).json({ ok: true });
}
`;
    await writeFileSafely(p, content);
    changed.push(p);
    await markTopTaskDone("Implement /api/vote (POST)");
    return true;
  }

  // /features list page
  if (/features\s+page|list\s+page/i.test(taskLine)) {
    const p = "pages/features.js";
    const content = `export default function Features() {
  const features = [
    { id: 'feat-1', title: 'Example feature', votes: 0 }
  ];
  return (
    <main style={{ padding: 24 }}>
      <h1>Features</h1>
      <ul>
        {features.map(f => (
          <li key={f.id}>
            <strong>{f.title}</strong> — votes: {f.votes}
          </li>
        ))}
      </ul>
    </main>
  );
}
`;
    await writeFileSafely(p, content);
    changed.push(p);
    await markTopTaskDone("Create minimal features list page");
    return true;
  }

  return false;
}

export async function implement() {
  changed.length = 0;
  const tasksPath = path.join(".ai", "backlog", "tasks.md");
  const content = await fs.readFile(tasksPath, "utf8").catch(() => null);
  if (!content) return;
  const lines = content.split("\n");
  const idx = lines.findIndex((l) => l.startsWith("- [ ] T-"));
  if (idx === -1) return;
  const topTaskLine = lines[idx];
  const idMatch = topTaskLine.match(/T-([A-Za-z0-9]+)/);
  const id = idMatch ? idMatch[1] : "000";
  const title = (topTaskLine.split(":")[1] || "").split("—")[0].trim();

  const vision = await fs
    .readFile(path.join(".ai", "roadmap", "vision.md"), "utf8")
    .catch(() => "");

  const prompt = `
You are coding in a Next.js repo (pages router). Only modify files under pages/**, lib/**, or src/**.
Implement exactly ONE tiny, build-safe change that pushes the product toward the vision.

Vision (excerpt, keep context short):
${vision.slice(0, 1200)}

Top task to implement (do exactly this if safe/small):
${topTaskLine}

Return JSON only:
{ "plan": [ { "path": "pages/api/health.js", "action": "add", "content": "<entire file content>" } ] }

Rules:
- Keep the plan 1–3 files max, <= 120 added lines total.
- Must compile with 'npm run build'.
- Prefer serverless API endpoints and minimal UI stubs.
- Do NOT touch package.json or CI configs.
- If you cannot produce a safe plan, return { "plan": [] }.
`.trim();

const apiKey = process.env.OPENAI_API_KEY || "";
let plan: Patch[] = [];
if (apiKey) {
  plan = await llmPatchPlan(prompt, apiKey);
}

if (!plan || plan.length === 0) {
  console.log("implement: empty plan []");
  const didHeuristic = await tryHeuristics(topTaskLine);
  if (!didHeuristic) {
    console.log("No heuristic matched; skipping PR this run.");
    return;
  }
} else {
  for (const step of plan) {
    if (!step.path || !/^((pages|lib|src)\/)/.test(step.path)) continue;
    await writeFileSafely(step.path, step.content || "");
    changed.push(step.path);
  }
  if (!changed.length) {
    console.log("Plan had no valid steps; skipping PR.");
    return;
  }
  await markTopTaskDone();
}

if (!changed.length) return;

if (!existsSync("node_modules")) {
  try {
    sh("npm ci");
  } catch {
    sh("npm i");
  }
}
sh("npm run build");

const addFiles = [tasksPath, ...changed].join(" ");
const tmpl = await fs
  .readFile(path.join(".ai", "templates", "pr-template.md"), "utf8")
  .catch(() => "");
const body = tmpl.replace("{{id}}", id).replace("{{title}}", title);

sh(`git fetch origin --prune`);
const baseBranch = `agent/${id.toLowerCase()}`;
const branch = uniqueBranch(baseBranch);

try {
  sh(`git checkout -B ${branch}`);
} catch {
  sh(`git checkout -b ${branch}`);
}
sh(`git add ${addFiles}`);
sh(`git -c user.email=actions@github.com -c user.name="github-actions[bot]" commit -m "feat(${id}): ${title}" || true`);

const pushCmd =
  remoteBranchExists(baseBranch) && branch === baseBranch
    ? `git push -u origin ${branch} --force-with-lease`
    : `git push -u origin ${branch}`;
sh(pushCmd);

const prTitle = `AI Agent: ${id} ${title}`;
try {
  sh(
    `gh pr create --base main --head ${branch} --title "${prTitle}" --body '${body.replace(/'/g, "'\\''")}'`
  );
} catch {
  console.log("gh failed; PR may already exist or auto-merge disabled.");
}
}

