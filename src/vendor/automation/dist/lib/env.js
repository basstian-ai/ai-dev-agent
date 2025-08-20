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
var env_exports = {};
__export(env_exports, {
  ENV: () => ENV,
  requireEnv: () => requireEnv
});
module.exports = __toCommonJS(env_exports);
const ENV = {
  GH_USERNAME: process.env.GH_USERNAME || "ai-dev-agent",
  PAT_TOKEN: process.env.PAT_TOKEN || "",
  TARGET_REPO: process.env.TARGET_REPO || "",
  TARGET_DIR: process.env.TARGET_DIR || "",
  VERCEL_PROJECT_ID: process.env.VERCEL_PROJECT_ID || "",
  VERCEL_TEAM_ID: process.env.VERCEL_TEAM_ID || "",
  VERCEL_TOKEN: process.env.VERCEL_TOKEN || "",
  OPENAI_API_KEY: process.env.OPENAI_API_KEY || "",
  OPENAI_MODEL: process.env.OPENAI_MODEL || "",
  WRITE_MODE: process.env.AI_BOT_WRITE_MODE || "commit",
  DRY_RUN: process.env.DRY_RUN === "1",
  BRANCH: process.env.GITHUB_REF_NAME || process.env.GITHUB_HEAD_REF || "",
  ALLOW_PATHS: (process.env.ALLOW_PATHS || "").split(",").map((s) => s.trim()).filter(Boolean)
};
function requireEnv(names) {
  for (const n of names) {
    if (!process.env[n] || process.env[n] === "") {
      throw new Error(`Missing env: ${n}`);
    }
  }
}
