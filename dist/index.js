const core = { setFailed: (msg) => { console.error(msg); process.exit(1); } };
import { collectSignals } from './pipeline/01_collect_signals.js';
import { repoReview } from './pipeline/02_repo_review.js';
import { prioritize } from './pipeline/03_prioritize.js';
import { implement } from './pipeline/04_implement.js';
async function main() {
    try {
        await collectSignals();
        await repoReview();
        await prioritize();
        await implement();
        process.exit(0);
    }
    catch (e) {
        core.setFailed(e?.message || String(e));
    }
}
main();
