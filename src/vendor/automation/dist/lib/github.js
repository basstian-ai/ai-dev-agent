"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var github_exports = {};
__export(github_exports, {
  commitMany: () => commitMany,
  ensureBranch: () => ensureBranch,
  getDefaultBranch: () => getDefaultBranch,
  gh: () => gh,
  parseRepo: () => parseRepo,
  readFile: () => readFile,
  resolveRepoPath: () => resolveRepoPath,
  upsertFile: () => upsertFile
});
module.exports = __toCommonJS(github_exports);
var import_octokit = require("octokit");
var import_node_path = require("node:path");
var import_env = require("./env.js");
function parseRepo(s) {
  const [owner, repo] = s.split("/");
  if (!owner || !repo)
    throw new Error(`Invalid TARGET_REPO: ${s}`);
  return { owner, repo };
}
function gh() {
  return new import_octokit.Octokit({ auth: import_env.ENV.PAT_TOKEN });
}
function b64(s) {
  return Buffer.from(s, "utf8").toString("base64");
}
async function getFile(owner, repo, path, ref) {
  const client = gh();
  try {
    const res = await client.rest.repos.getContent({ owner, repo, path, ref });
    const data = res.data;
    if (Array.isArray(data))
      throw new Error(`Expected file at ${path}, got directory`);
    const sha = data.sha;
    const content = data.content ? Buffer.from(data.content, "base64").toString("utf8") : void 0;
    return { sha, content };
  } catch (e) {
    if (e?.status === 404)
      return { sha: void 0, content: void 0 };
    throw e;
  }
}
async function getDefaultBranch() {
  const { owner, repo } = parseRepo(import_env.ENV.TARGET_REPO);
  const { data } = await gh().rest.repos.get({ owner, repo });
  return data.default_branch;
}
async function ensureBranch(branch, baseBranch) {
  const { owner, repo } = parseRepo(import_env.ENV.TARGET_REPO);
  const ref = `heads/${branch}`;
  try {
    await gh().rest.git.getRef({ owner, repo, ref });
    return;
  } catch (e) {
    if (e?.status !== 404)
      throw e;
  }
  const base = baseBranch || await getDefaultBranch();
  const baseRef = await gh().rest.git.getRef({ owner, repo, ref: `heads/${base}` });
  const baseSha = baseRef.data.object.sha;
  await gh().rest.git.createRef({ owner, repo, ref: `refs/heads/${branch}`, sha: baseSha });
}
function resolveRepoPath(p) {
  if (!p)
    throw new Error("Empty path");
  let norm = p.replace(/\\/g, "/").replace(/^\/+/, "").replace(/^\.\//, "");
  norm = import_node_path.posix.normalize(norm);
  if (norm === "" || norm === "." || norm.startsWith("..")) {
    throw new Error(`Refusing path outside repo: ${p}`);
  }
  const rawBase = import_env.ENV.TARGET_DIR || "";
  const base = rawBase.replace(/^\/+|\/+$/g, "");
  if (base.includes("://") || base.includes(":")) {
    throw new Error(`Invalid TARGET_DIR: ${import_env.ENV.TARGET_DIR}`);
  }
  const joined = base ? import_node_path.posix.join(base, norm) : norm;
  return joined.replace(/^\/+/, "");
}
async function readFile(path) {
  const { owner, repo } = parseRepo(import_env.ENV.TARGET_REPO);
  const got = await getFile(owner, repo, path);
  return got.content;
}
async function upsertFile(path, updater, message, opts) {
  const { owner, repo } = parseRepo(import_env.ENV.TARGET_REPO);
  const safePath = resolveRepoPath(path);
  const ref = opts?.branch;
  if (import_env.ENV.DRY_RUN) {
    const next2 = updater(void 0);
    console.log(`[DRY_RUN] upsert ${safePath} on ${ref || "(default branch)"}: ${message}
---
${next2}
---`);
    return;
  }
  const { sha, content: old } = await getFile(owner, repo, safePath, ref);
  const next = updater(old);
  await gh().rest.repos.createOrUpdateFileContents({
    owner,
    repo,
    path: safePath,
    message,
    content: b64(next),
    sha,
    ...ref ? { branch: ref } : {},
    committer: { name: "ai-dev-agent", email: "bot@local" },
    author: { name: "ai-dev-agent", email: "bot@local" }
  });
}
async function commitMany(files, message, opts) {
  const { owner, repo } = parseRepo(import_env.ENV.TARGET_REPO);
  const ref = opts?.branch;
  if (import_env.ENV.DRY_RUN) {
    console.log(`[DRY_RUN] commitMany ${files.length} files on ${ref || "(default branch)"}: ${message}`);
    return;
  }
  for (const f of files) {
    const safePath = resolveRepoPath(f.path);
    const { sha } = await getFile(owner, repo, safePath, ref);
    await gh().rest.repos.createOrUpdateFileContents({
      owner,
      repo,
      path: safePath,
      message,
      content: b64(f.content),
      sha,
      ...ref ? { branch: ref } : {},
      committer: { name: "ai-dev-agent", email: "bot@local" },
      author: { name: "ai-dev-agent", email: "bot@local" }
    });
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  commitMany,
  ensureBranch,
  getDefaultBranch,
  gh,
  parseRepo,
  readFile,
  resolveRepoPath,
  upsertFile
});
