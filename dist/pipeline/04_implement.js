import { promises as fs } from 'fs';
import path from 'path';
import * as cp from 'child_process';
import { promisify } from 'util';
import https from 'https';
import crypto from 'crypto';
const run = promisify(cp.exec);
function sh(cmd) { cp.execSync(cmd, { stdio: 'inherit' }); }
function rand(n = 4) { return crypto.randomBytes(n).toString("hex"); }
function remoteBranchExists(name) {
    try {
        cp.execSync(`git ls-remote --exit-code --heads origin ${name}`, { stdio: "ignore" });
        return true;
    }
    catch {
        return false;
    }
}
function uniqueBranch(base) {
    let name = base;
    let tries = 0;
    while (remoteBranchExists(name) && tries < 5) {
        name = `${base}-${new Date().toISOString().replace(/[-:TZ.]/g, "").slice(0, 12)}-${rand(2)}`;
        tries++;
    }
    return name;
}
async function callOpenAI(prompt, key) {
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
                    const j = JSON.parse(body);
                    resolve(JSON.parse(j.choices?.[0]?.message?.content || '[]'));
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
export async function implement() {
    const tasksPath = path.join('.ai', 'backlog', 'tasks.md');
    const content = await fs.readFile(tasksPath, 'utf8').catch(() => null);
    if (!content)
        return;
    const lines = content.split('\n');
    const idx = lines.findIndex(l => l.startsWith('- [ ] T-'));
    if (idx === -1)
        return;
    const line = lines[idx];
    const idMatch = line.match(/T-([A-Za-z0-9]+)/);
    const id = idMatch ? idMatch[1] : '000';
    const title = (line.split(':')[1] || '').split('—')[0].trim();
    const lower = line.toLowerCase();
    const changed = [];
    try {
        const hasNodeModules = await fs.access('node_modules').then(() => true).catch(() => false);
        if (!hasNodeModules) {
            try {
                await run('npm ci');
            }
            catch {
                await run('npm i');
            }
        }
        if (lower.includes('health')) {
            const file = path.join('pages', 'api', 'health.js');
            await fs.mkdir(path.dirname(file), { recursive: true });
            await fs.writeFile(file, 'export default function handler(req,res){ res.statusCode=200; res.setHeader("Content-Type","application/json"); res.end(JSON.stringify({status:"ok"})); }\n');
            changed.push(file);
        }
        else if (lower.includes('features table')) {
            const file = path.join('lib', 'db-notes.md');
            await fs.mkdir(path.dirname(file), { recursive: true });
            await fs.writeFile(file, '## Features Table\n- id uuid primary key\n- title text\n- votes integer\n');
            changed.push(file);
        }
        else if (lower.includes('vote api')) {
            const file = path.join('pages', 'api', 'vote.js');
            await fs.mkdir(path.dirname(file), { recursive: true });
            await fs.writeFile(file, 'export default async function handler(req,res){ if(req.method!=="POST"){ res.statusCode=405; res.end(); return;} res.statusCode=200; res.setHeader("Content-Type","application/json"); res.end(JSON.stringify({ok:true})); }\n');
            changed.push(file);
        }
        else if (process.env.OPENAI_API_KEY) {
            const prompt = `Task: ${line}\nProvide minimal JSON plan [{"path","action","content"}]`;
            const plan = await callOpenAI(prompt, process.env.OPENAI_API_KEY);
            for (const step of plan) {
                if (!step.path || !/^((pages|lib|src)\/)/.test(step.path))
                    continue;
                await fs.mkdir(path.dirname(step.path), { recursive: true });
                await fs.writeFile(step.path, step.content || '', 'utf8');
                changed.push(step.path);
            }
        }
        else {
            return;
        }
        await run('npm run build');
        lines[idx] = line.replace('- [ ]', '- [x]');
        await fs.writeFile(tasksPath, lines.join('\n'), 'utf8');
        const addFiles = [tasksPath, ...changed].join(' ');
        const tmpl = await fs.readFile(path.join('.ai', 'templates', 'pr-template.md'), 'utf8').catch(() => '');
        const body = tmpl.replace('{{id}}', id).replace('{{title}}', title);
        sh(`git fetch origin --prune`);
        const baseBranch = `agent/${id.toLowerCase()}`;
        const branch = uniqueBranch(baseBranch);
        try {
            sh(`git checkout -B ${branch}`);
        }
        catch {
            sh(`git checkout -b ${branch}`);
        }
        sh(`git add ${addFiles}`);
        sh(`git -c user.email=actions@github.com -c user.name="github-actions[bot]" commit -m "feat(${id}): ${title}" || true`);
        const pushCmd = remoteBranchExists(baseBranch) && branch === baseBranch
            ? `git push -u origin ${branch} --force-with-lease`
            : `git push -u origin ${branch}`;
        sh(pushCmd);
        const prTitle = `AI Agent: ${id} ${title}`;
        try {
            sh(`gh pr create --base main --head ${branch} --title "${prTitle}" --body '${body.replace(/'/g, "'\\''")}'`);
        }
        catch {
            console.log("gh failed; PR may already exist or auto-merge disabled.");
        }
    }
    catch (e) {
        for (const p of changed) {
            await run(`git checkout -- ${p}`).catch(() => { });
            await run(`git clean -f ${p}`).catch(() => { });
        }
        throw e;
    }
}
