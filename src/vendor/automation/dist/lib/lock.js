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
var lock_exports = {};
__export(lock_exports, {
  acquireLock: () => acquireLock,
  releaseLock: () => releaseLock
});
module.exports = __toCommonJS(lock_exports);
var import_github = require("./github.js");
const STRATEGY = process.env.AI_LOCK_STRATEGY || "actions";
async function acquireLock(ttlSeconds = 900) {
  if (STRATEGY !== "file")
    return true;
  const LOCK_PATH = "roadmap/.state/lock";
  const now = Date.now();
  const existing = await (0, import_github.readFile)(LOCK_PATH);
  if (existing) {
    const ts = Number(existing.trim());
    if (!Number.isNaN(ts) && now - ts < ttlSeconds * 1e3)
      return false;
  }
  await (0, import_github.upsertFile)(LOCK_PATH, () => String(now) + "\n", "[skip ci] bot: acquire lock");
  return true;
}
async function releaseLock() {
  if (STRATEGY !== "file")
    return;
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  acquireLock,
  releaseLock
});
