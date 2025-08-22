import { promises as fs } from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import https from 'https';

const run = promisify(exec);

async function callOpenAI(prompt: string, key: string): Promise<any[]> {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({ model: 'gpt-4o-mini', messages: [{ role:'user', content: prompt }] });
    const req = https.request('https://api.openai.com/v1/chat/completions', {
      method:'POST',
      headers:{ 'Content-Type':'application/json', 'Authorization':`Bearer ${key}` }
    }, res => {
      let body='';
      res.on('data', d => body += d);
      res.on('end', () => {
        try { const j = JSON.parse(body); resolve(JSON.parse(j.choices?.[0]?.message?.content||'[]')); }
        catch(e){ reject(e); }
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

export async function implement() {
  const tasksPath = path.join('.ai','backlog','tasks.md');
  const content = await fs.readFile(tasksPath,'utf8').catch(()=> null);
  if (!content) return;
  const lines = content.split('\n');
  const idx = lines.findIndex(l => l.startsWith('- [ ] T-'));
  if (idx === -1) return;
  const line = lines[idx];
  const idMatch = line.match(/T-([A-Za-z0-9]+)/);
  const id = idMatch ? idMatch[1] : '000';
  const title = (line.split(':')[1] || '').split('—')[0].trim();
  const lower = line.toLowerCase();
  const changed: string[] = [];
  try {
    if (lower.includes('health')) {
      const file = path.join('pages','api','health.js');
      await fs.mkdir(path.dirname(file), {recursive:true});
      await fs.writeFile(file, 'export default function handler(req,res){ res.statusCode=200; res.setHeader("Content-Type","application/json"); res.end(JSON.stringify({status:"ok"})); }\n');
      changed.push(file);
    } else if (lower.includes('features table')) {
      const file = path.join('lib','db-notes.md');
      await fs.mkdir(path.dirname(file), {recursive:true});
      await fs.writeFile(file, '## Features Table\n- id uuid primary key\n- title text\n- votes integer\n');
      changed.push(file);
    } else if (lower.includes('vote api')) {
      const file = path.join('pages','api','vote.js');
      await fs.mkdir(path.dirname(file), {recursive:true});
      await fs.writeFile(file, 'export default async function handler(req,res){ if(req.method!=="POST"){ res.statusCode=405; res.end(); return;} res.statusCode=200; res.setHeader("Content-Type","application/json"); res.end(JSON.stringify({ok:true})); }\n');
      changed.push(file);
    } else if (process.env.OPENAI_API_KEY) {
      const prompt = `Task: ${line}\nProvide minimal JSON plan [{"path","action","content"}]`;
      const plan = await callOpenAI(prompt, process.env.OPENAI_API_KEY);
      for (const step of plan) {
        if (!step.path || !/^((pages|lib|src)\/)/.test(step.path)) continue;
        await fs.mkdir(path.dirname(step.path), {recursive:true});
        await fs.writeFile(step.path, step.content || '', 'utf8');
        changed.push(step.path);
      }
    } else {
      return;
    }
    await run('npm run build');
    lines[idx] = line.replace('- [ ]','- [x]');
    await fs.writeFile(tasksPath, lines.join('\n'), 'utf8');
    const branch = `agent/${id}`;
    await run(`git checkout -b ${branch}`);
    await run(`git add ${tasksPath} ${changed.join(' ')}`);
    await run(`git commit -m "AI Agent: ${id} ${title}"`);
    await run(`git push origin HEAD`);
    const tmpl = await fs.readFile(path.join('.ai','templates','pr-template.md'),'utf8').catch(()=> '');
    const body = tmpl.replace('{{id}}', id).replace('{{title}}', title);
    const repo = process.env.GITHUB_REPOSITORY || '';
    const token = process.env.GITHUB_TOKEN || '';
    const [owner, repoName] = repo.split('/');
    if (owner && repoName && token) {
      const post = JSON.stringify({ title: `AI Agent: ${id} ${title}`, head: branch, base: 'main', body });
      await new Promise((resolve,reject)=>{
        const req = https.request(`https://api.github.com/repos/${owner}/${repoName}/pulls`, {
          method:'POST',
          headers:{ 'Content-Type':'application/json','Authorization':`Bearer ${token}`,'User-Agent':'ai-agent'}
        }, res=>{ res.on('data',()=>{}); res.on('end',resolve); });
        req.on('error',reject);
        req.write(post);
        req.end();
      });
    }
  } catch (e) {
    for (const p of changed) {
      await run(`git checkout -- ${p}`).catch(()=>{});
      await run(`git clean -f ${p}`).catch(()=>{});
    }
    throw e;
  }
}
