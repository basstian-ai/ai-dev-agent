import { promises as fs } from 'fs';
import { createHash } from 'crypto';
import https from 'https';
import path from 'path';
function getJSON(url, token) {
    return new Promise((resolve, reject) => {
        const req = https.get(url, { headers: token ? { Authorization: `Bearer ${token}` } : {} }, res => {
            let data = '';
            res.on('data', d => data += d);
            res.on('end', () => {
                try {
                    resolve(JSON.parse(data));
                }
                catch (e) {
                    reject(e);
                }
            });
        });
        req.on('error', reject);
    });
}
async function appendBug(kind, msg, source) {
    const hash = createHash('sha1').update(msg).digest('hex').slice(0, 8);
    const line = `- [ ] B-${hash}: ${kind} - ${msg} | source:${source} | firstSeen:${new Date().toISOString()} | occurrences:1`;
    const file = path.join('.ai', 'backlog', 'bugs.md');
    await fs.mkdir(path.dirname(file), { recursive: true });
    const existing = await fs.readFile(file, 'utf8').catch(() => '');
    if (existing.includes(`B-${hash}`))
        return;
    const updated = existing ? existing.trimEnd() + '\n' + line + '\n' : line + '\n';
    await fs.writeFile(file, updated, 'utf8');
}
export async function collectSignals() {
    const token = process.env.VERCEL_TOKEN;
    const project = process.env.VERCEL_PROJECT_ID;
    const team = process.env.VERCEL_TEAM_ID || process.env.VERCEL_ORG_ID;
    if (!token || !project) {
        console.log('Missing Vercel env vars, skipping collectSignals');
        return;
    }
    const teamParam = team ? `&teamId=${team}` : '';
    const url = `https://api.vercel.com/v6/deployments?projectId=${project}&limit=1${teamParam}`;
    const data = await getJSON(url, token).catch(() => null);
    const dep = data?.deployments?.[0];
    if (!dep)
        return;
    if (dep.state === 'ERROR' && dep.error?.message) {
        await appendBug('Build error', dep.error.message, 'build');
    }
    if (dep.url) {
        await new Promise(resolve => {
            const url = `https://${dep.url}`;
            https.get(url, res => {
                if ((res.statusCode || 0) >= 500) {
                    appendBug('Runtime issue', `hitting ${url}, status ${res.statusCode}`, 'runtime').then(() => resolve());
                }
                else
                    resolve();
            }).on('error', () => {
                appendBug('Runtime issue', `hitting ${url}, no response`, 'runtime').then(() => resolve());
            });
        });
    }
}
