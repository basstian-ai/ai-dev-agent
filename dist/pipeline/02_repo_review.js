import { promises as fs } from 'fs';
import path from 'path';
import https from 'https';
async function readFileSafe(p) {
    return fs.readFile(p, 'utf8').catch(() => '');
}
async function listFiles(dir, root, acc) {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const e of entries) {
        const rel = path.relative(root, path.join(dir, e.name));
        if (rel.startsWith('.ai') || rel.startsWith('.github'))
            continue;
        if (acc.length >= 40)
            break;
        if (e.isDirectory())
            await listFiles(path.join(dir, e.name), root, acc);
        else
            acc.push(rel);
    }
}
function callOpenAI(prompt, key) {
    return new Promise((resolve, reject) => {
        const data = JSON.stringify({ model: 'gpt-4o-mini', messages: [{ role: 'user', content: prompt }] });
        const req = https.request('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` }
        }, res => {
            let body = '';
            res.on('data', d => body += d);
            res.on('end', () => {
                try {
                    const json = JSON.parse(body);
                    resolve(json.choices?.[0]?.message?.content || '');
                }
                catch (e) {
                    reject(e);
                }
            });
        });
        req.on('error', reject);
        req.write(data);
        req.end();
    });
}
export async function repoReview() {
    const vision = await readFileSafe(path.join('.ai', 'roadmap', 'vision.md'));
    const tasks = await readFileSafe(path.join('.ai', 'backlog', 'tasks.md'));
    const done = tasks.split('\n').filter(l => l.startsWith('- [x]'));
    const files = [];
    await listFiles('.', '.', files);
    const fileList = files.slice(0, 40).join('\n');
    let suggestions = [];
    const key = process.env.OPENAI_API_KEY;
    if (key) {
        const prompt = `Vision:\n${vision}\n\nDone:\n${done.join('\n')}\n\nFiles:\n${fileList}\n\n` +
            `Provide 5-8 single-line suggestions in format S-xxx: <short title> — rationale.`;
        const resp = await callOpenAI(prompt, key);
        suggestions = resp.split('\n').map(l => l.trim()).filter(l => l.startsWith('S-'));
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
