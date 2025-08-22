import { promises as fs } from 'fs';
import path from 'path';
import { chatJSON } from '../util/llm.js';
async function readLines(p) {
    const text = await fs.readFile(p, 'utf8').catch(() => '');
    return text.split('\n').filter(Boolean);
}
export async function prioritize() {
    const newSug = await readLines(path.join('.ai', 'roadmap', 'new.md'));
    const bugs = await readLines(path.join('.ai', 'backlog', 'bugs.md'));
    const vision = await fs.readFile(path.join('.ai', 'roadmap', 'vision.md'), 'utf8').catch(() => '');
    const existing = await readLines(path.join('.ai', 'backlog', 'tasks.md'));
    const done = existing.filter(l => l.startsWith('- [x]'));
    const key = process.env.OPENAI_API_KEY || '';
    let tasks = [];
    if (key) {
        const json = await chatJSON({
            apiKey: key,
            messages: [{
                    role: 'user',
                    content: `Given bugs and suggestions, return JSON:
{ "tasks": [
  "- [ ] T-### (P1|P2|P3): <title> — link:S-###/B-### — rationale",
  ...
]}
Rules: P1 for build/runtime breakers; keep each task small/safe; 6-10 items. No prose.`
                }],
            fallback: { tasks: [] }
        });
        tasks = json.tasks ?? [];
        if (!tasks.length)
            console.log('prioritize: empty tasks', json);
    }
    else {
        for (const b of bugs) {
            const id = (b.match(/B-([a-f0-9]+)/) || [])[1];
            if (id)
                tasks.push(`- [ ] T-${id} (P1): Fix bug ${id} — link:B-${id} — ensure stability`);
        }
        for (const s of newSug) {
            const m = s.match(/S-(\d+):\s([^—]+)\s—\s(.+)/);
            if (m)
                tasks.push(`- [ ] T-${m[1]} (P2): ${m[2].trim()} — link:S-${m[1]} — ${m[3].trim()}`);
        }
        tasks = tasks.slice(0, 6);
    }
    const header = '# Tasks (auto-generated, prioritized)\n\n';
    const body = header + done.join('\n') + (done.length ? '\n' : '') + tasks.join('\n') + '\n';
    const out = path.join('.ai', 'backlog');
    await fs.mkdir(out, { recursive: true });
    await fs.writeFile(path.join(out, 'tasks.md'), body, 'utf8');
}
