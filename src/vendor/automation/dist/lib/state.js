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
var state_exports = {};
__export(state_exports, {
  loadState: () => loadState,
  saveState: () => saveState
});
module.exports = __toCommonJS(state_exports);
var import_github = require("./github.js");
const STATE_PATH = "roadmap/.state/agent-state.json";
async function loadState() {
  const raw = await (0, import_github.readFile)(STATE_PATH);
  if (!raw)
    return {};
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}
async function saveState(next) {
  await (0, import_github.upsertFile)(STATE_PATH, () => JSON.stringify(next, null, 2) + "\n", "bot: update state");
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  loadState,
  saveState
});
