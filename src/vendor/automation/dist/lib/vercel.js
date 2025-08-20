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
var vercel_exports = {};
__export(vercel_exports, {
  getLatestProdDeployment: () => getLatestProdDeployment,
  getRuntimeLogs: () => getRuntimeLogs
});
module.exports = __toCommonJS(vercel_exports);
var import_env = require("./env.js");
const API = "https://api.vercel.com";
async function vfetch(path, params = {}) {
  const url = new URL(API + path);
  for (const [k, v] of Object.entries(params))
    if (v)
      url.searchParams.set(k, v);
  const res = await fetch(url, { headers: { Authorization: `Bearer ${import_env.ENV.VERCEL_TOKEN}` } });
  if (!res.ok)
    throw new Error(`Vercel ${path} failed: ${res.status}`);
  return res.json();
}
async function getLatestProdDeployment() {
  if (!import_env.ENV.VERCEL_PROJECT_ID)
    return void 0;
  const data = await vfetch("/v6/deployments", {
    projectId: import_env.ENV.VERCEL_PROJECT_ID,
    target: "production",
    limit: "1",
    teamId: import_env.ENV.VERCEL_TEAM_ID || void 0
  });
  return data.deployments?.[0];
}
async function getRuntimeLogs(deploymentId) {
  if (!import_env.ENV.VERCEL_PROJECT_ID)
    return [];
  const url = new URL(`${API}/v1/projects/${import_env.ENV.VERCEL_PROJECT_ID}/deployments/${deploymentId}/runtime-logs`);
  if (import_env.ENV.VERCEL_TEAM_ID)
    url.searchParams.set("teamId", import_env.ENV.VERCEL_TEAM_ID);
  const res = await fetch(url, { headers: { Authorization: `Bearer ${import_env.ENV.VERCEL_TOKEN}` } });
  if (!res.ok)
    throw new Error(`Vercel runtime-logs failed: ${res.status}`);
  const text = await res.text();
  return text.split("\n").filter(Boolean).map((l) => {
    try {
      return JSON.parse(l);
    } catch {
      return null;
    }
  }).filter(Boolean);
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  getLatestProdDeployment,
  getRuntimeLogs
});
