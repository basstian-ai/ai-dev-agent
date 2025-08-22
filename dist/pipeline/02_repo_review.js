import { promises as fs } from 'fs';
import path from 'path';
import { chatJSON } from '../util/llm.js';
async function readFileSafe(p) {
    return fs.readFile(p, 'utf8').catch(() => '');
}
async function listFiles(dir, root, acc) {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const e of entries) {
        const rel = path.relative(root, path.join(dir, e.name));
        if (rel.startsWith('.ai') || rel.startsWith('.github') || rel.startsWith('node_modules'))
            continue;
        if (acc.length >= 40)
            break;
        if (e.isDirectory())
            await listFiles(path.join(dir, e.name), root, acc);
        else
            acc.push(rel);
    }
}
export async function repoReview() {
    const vision = await readFileSafe(path.join('.ai', 'roadmap', 'vision.md'));
    const tasks = await readFileSafe(path.join('.ai', 'backlog', 'tasks.md'));
    const done = tasks.split('\n').filter(l => l.startsWith('- [x]'));
    const files = [];
    await listFiles('.', '.', files);
    const fileList = files.slice(0, 40).join('\n');
    let ideas = [];
    const key = process.env.OPENAI_API_KEY || '';
    if (key) {
        const json = await chatJSON({
            apiKey: key,
            messages: [{
                    role: 'user',
                    content: `Return JSON with key "ideas": an array of 5-8 items.
Each item: { "id": "S-###", "title": "<short>", "rationale": "<one sentence>" }.
No prose. Use S-101, S-102, ... sequentially.`
                }],
            fallback: { ideas: [] }
        });
        ideas = json.ideas ?? [];
        if (!ideas.length)
            console.log('repoReview: empty ideas', json);
    }
    let suggestions = [];
    if (ideas.length) {
        suggestions = ideas.map(i => `${i.id}: ${i.title} — ${i.rationale}`);
    }
    else {
        suggestions = [
            'S-001: Add health endpoint — monitor uptime',
            'S-002: Add features table stub — prepare database',
            'S-003: Create list page — show entries',
            'S-004: Implement vote API — accept votes',
            'S-005: Improve README — clarify project'
        ];
    }
    const outPath = path.join('.ai', 'roadmap');
    await fs.mkdir(outPath, { recursive: true });
    const content = '# Suggestions (auto-generated)\n\n' + suggestions.map(s => `- ${s}`).join('\n') + '\n';
    await fs.writeFile(path.join(outPath, 'new.md'), content, 'utf8');
}
