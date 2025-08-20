import * as core from "@actions/core";
import * as github from "@actions/github";

async function run() {
  try {
    const config = core.getInput("config") || ".ai/agent.yml";
    const repairOnly = core.getInput("repair-only") === "true";
    const maxDiff = core.getInput("max-diff-lines") || "400";

    core.info("AI Dev Agent running…");
    core.info(JSON.stringify({
      repo: github.context.repo,
      config,
      repairOnly,
      maxDiff
    }, null, 2));

    // 🔮 Later: add real orchestrator code here
  } catch (error: any) {
    core.setFailed(error.message);
  }
}

run();
