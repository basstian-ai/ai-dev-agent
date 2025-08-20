import * as core from "@actions/core";
import * as github from "@actions/github";

async function main() {
  try {
    const configPath   = core.getInput("config") || ".ai/agent.yml";
    const repairOnly   = core.getInput("repair-only") === "true";
    const maxDiffLines = parseInt(core.getInput("max-diff-lines") || "400", 10);

    const ghToken = process.env.GITHUB_TOKEN;
    if (!ghToken) throw new Error("GITHUB_TOKEN env var is required");

    const octokit = github.getOctokit(ghToken);

    // No-op API call just to prove Octokit works. Replace with real logic later.
    const { owner, repo } = github.context.repo;
    await octokit.rest.repos.get({ owner, repo });

    core.info(`Agent ready. config=${configPath} repairOnly=${repairOnly} maxDiff=${maxDiffLines}`);
    core.setOutput("pr-number", "0");
  } catch (e: any) {
    core.setFailed(e?.stack || String(e));
  }
}
main();
