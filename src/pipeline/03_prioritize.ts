import { promises as fs } from 'fs';
import path from 'path';
import https from 'https';

async function readLines(p: string): Promise<string[]> {
  const text = await fs.readFile(p, 'utf8').catch(() => '');
  return text.split('\n').filter(Boolean);
}

function callOpenAI(prompt: string, key: string): Promise<string> {
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
          resolve(j.choices?.[0]?.message?.content || '');
        } catch (e) {
          reject(e);
        }
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

export async function prioritize() {
  const newSug = await readLines(path.join('.ai','roadmap','new.md'));
  const bugs = await readLines(path.join('.ai','backlog','bugs.md'));
  const vision = await fs.readFile(path.join('.ai','roadmap','vision.md'),'utf8').catch(()=> '');
  const existing = await readLines(path.join('.ai','backlog','tasks.md'));
  const done = existing.filter(l => l.startsWith('- [x]'));
  const key = process.env.OPENAI_API_KEY;
  let tasks: string[] = [];
  if (key) {
    const prompt = `Vision:\n${vision}\n\nSuggestions:\n${newSug.join('\n')}\n\nBugs:\n${bugs.join('\n')}\n\n` +
      `Return 6-10 tasks in format - [ ] T-xxx (P1|P2|P3): <title> — link:S-xxx/B-xxx — rationale. Bugs blocking build/runtime are P1 at top.`;
    const resp = await callOpenAI(prompt, key);
    tasks = resp.split('\n').map(l => l.trim()).filter(l => l.startsWith('- ['));
  } else {
    for (const b of bugs) {
      const id = (b.match(/B-([a-f0-9]+)/)||[])[1];
      if (id) tasks.push(`- [ ] T-${id} (P1): Fix bug ${id} — link:B-${id} — ensure stability`);
    }
    for (const s of newSug) {
      const m = s.match(/S-(\d+):\s([^—]+)\s—\s(.+)/);
      if (m) tasks.push(`- [ ] T-${m[1]} (P2): ${m[2].trim()} — link:S-${m[1]} — ${m[3].trim()}`);
    }
    tasks = tasks.slice(0,6);
  }
  const header = '# Tasks (auto-generated, prioritized)\n\n';
  const body = header + done.join('\n') + (done.length?'\n':'') + tasks.join('\n') + '\n';
  const out = path.join('.ai','backlog');
  await fs.mkdir(out,{recursive:true});
  await fs.writeFile(path.join(out,'tasks.md'), body, 'utf8');
}
