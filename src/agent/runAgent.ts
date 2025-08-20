import * as core from "@actions/core";
import * as github from "@actions/github";

// Vendored modules from Automation-test (built JS)
const env = require("../vendor/automation/dist/lib/env.js");
const md = require("../vendor/automation/dist/lib/md.js");

// Example: use review-repo or prompt pieces later if needed
// import("../vendor/automation/review-repo.ts")  // if you later want TS source

type Ctx = {
  octokit: ReturnType<typeof github.getOctokit>;
  owner: string;
  repo: string;
  cfg: Record<string, any>;
  repairOnly: boolean;
  maxDiffLines: number;
  workspace: string;
  env: Record<string, string>;
};

export async function runAgent(ctx: Ctx) {
  core.info(`[agent] starting for ${ctx.owner}/${ctx.repo}`);
  // Prove we can hit GitHub API through Octokit
  await ctx.octokit.rest.repos.get({ owner: ctx.owner, repo: ctx.repo });

  // Tiny heartbeat: create/update a docs file in memory (no write yet)
  const heartbeat = md && typeof md.toMarkdown === "function"
    ? md.toMarkdown({ title: "AI Agent Heartbeat", body: `maxDiffLines=${ctx.maxDiffLines}` })
    : `# AI Agent Heartbeat\n\nmaxDiffLines=${ctx.maxDiffLines}\n`;

  core.info(`[agent] prepared heartbeat doc (${heartbeat.length} chars)`);

  // TODO:
  // - parse backlog (tasks.md / bugs.md)
  // - analyze repo (review-repo)
  // - generate plan (prompt.ts / prompts.js)
  // - create branch, write files, open/update PR.
  core.info("[agent] noop complete (wire-up checkpoint)");
}
