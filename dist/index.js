/* Minimal AI Dev Agent action - no external deps */
function getInput(name, def) {
  const key = 'INPUT_' + name.toUpperCase().replace(/ /g, '_');
  return (process.env[key] ?? def ?? '').toString();
}
function setOutput(name, value) {
  const fs = require('fs'); const p = process.env.GITHUB_OUTPUT;
  if (p) fs.appendFileSync(p, `${name}=${value}\n`);
  else console.log(`::set-output name=${name}::${value}`);
}
(async () => {
  try {
    const config = getInput('config', '.ai/agent.yml');
    const repairOnly = getInput('repair-only', 'false');
    const maxDiff = getInput('max-diff-lines', '400');
    console.log('AI Dev Agent (dummy) running…');
    console.log({ repo: process.env.GITHUB_REPOSITORY, config, repairOnly, maxDiff });
    setOutput('pr-number', '0');
  } catch (e) {
    console.error(e?.stack || String(e));
    process.exit(1);
  }
})();
