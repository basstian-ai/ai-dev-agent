import * as core from "@actions/core";
import * as github from "@actions/github";
import * as fs from "fs/promises";
import * as path from "path";
import yaml from "js-yaml";
import { runAgent } from "./agent/runAgent";

async function loadConfig(relPath: string): Promise<Record<string, any>> {
  const full = path.resolve(process.cwd(), relPath);
  try {
    await fs.access(full);
  } catch {
    throw new Error(`Config file not found: ${full}`);
  }
  const raw = await fs.readFile(full, "utf8");
  return yaml.load(raw) as Record<string, any>;
}

async function main() {
  try {
    const configPath   = core.getInput("config") || ".ai/agent.yml";
    const repairOnly   = core.getInput("repair-only") === "true";
    const maxDiffLines = parseInt(core.getInput("max-diff-lines") || "400", 10);

    const token = process.env.GITHUB_TOKEN || "";
    if (!token) throw new Error("GITHUB_TOKEN is required");

    if (!process.env.VERCEL_TOKEN) {
      core.info("VERCEL_TOKEN not set; Vercel features disabled");
    }
    if (!process.env.OPENAI_API_KEY) {
      core.info("OPENAI_API_KEY not set; LLM features disabled");
    }

    const { owner, repo } = github.context.repo;
    const cfg = await loadConfig(configPath);

    const octokit = github.getOctokit(token);
    await runAgent({
      octokit,
      owner, repo,
      cfg,
      repairOnly,
      maxDiffLines,
      workspace: process.cwd(),
      env: {
        ...process.env,
        VERCEL_TOKEN: process.env.VERCEL_TOKEN || "",
        OPENAI_API_KEY: process.env.OPENAI_API_KEY || ""
      } as Record<string, string>
    });

    core.info("Agent completed.");
  } catch (e: any) {
    core.setFailed(e?.stack || String(e));
  }
}
main();
