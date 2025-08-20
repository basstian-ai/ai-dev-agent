"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
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
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var prompts_exports = {};
__export(prompts_exports, {
  implementPlan: () => implementPlan,
  reviewToIdeas: () => reviewToIdeas,
  reviewToSummary: () => reviewToSummary,
  summarizeLogToBug: () => summarizeLogToBug,
  synthesizeTasksPrompt: () => synthesizeTasksPrompt
});
module.exports = __toCommonJS(prompts_exports);
var import_openai = __toESM(require("openai"));
var import_env = require("./env.js");
function getOpenAI() {
  (0, import_env.requireEnv)(["OPENAI_API_KEY"]);
  return new import_openai.default({ apiKey: import_env.ENV.OPENAI_API_KEY });
}
async function summarizeLogToBug(entries) {
  const openai = getOpenAI();
  const messages = [
    {
      role: "system",
      content: "You are an experienced software architect. Convert each unique error/warning into a succinct bug with a short title and 2\u20134 line description. No priorities, no duplicates. Output concise markdown."
    },
    { role: "user", content: JSON.stringify(entries, null, 2) }
  ];
  const r = await openai.chat.completions.create({
    model: import_env.ENV.OPENAI_MODEL,
    messages
  });
  return r.choices[0]?.message?.content ?? "";
}
async function reviewToSummary(input) {
  const openai = getOpenAI();
  const messages = [
    {
      role: "system",
      content: "You are an experienced software architect. Review the provided repository context and write a high-level summary of the current status, recent activity, and potential areas for improvement. Output should be human-readable markdown, suitable for a technical project manager."
    },
    { role: "user", content: JSON.stringify(input, null, 2) }
  ];
  const r = await openai.chat.completions.create({
    model: import_env.ENV.OPENAI_MODEL,
    messages
  });
  return r.choices[0]?.message?.content ?? "";
}
async function reviewToIdeas(input) {
  const openai = getOpenAI();
  const messages = [
    {
      role: "system",
      content: "You are an experienced software architect. Based on the provided summary and other context, propose concise, actionable items for a code bot. Include tasks that make visible progress for the end user.Return ONLY YAML in a code block with the shape:\n```yaml\nqueue:\n  - id: <leave blank or omit>\n    title: <short>\n    details: <1-3 lines>\n    created: <ISO>\n```\nAvoid duplicates vs the provided lists. Focus on the opportunities identified in the summary."
    },
    { role: "user", content: JSON.stringify(input, null, 2) }
  ];
  const r = await openai.chat.completions.create({
    model: import_env.ENV.OPENAI_MODEL,
    messages
  });
  return r.choices[0]?.message?.content ?? "";
}
async function synthesizeTasksPrompt(input) {
  const openai = getOpenAI();
  const messages = [
    {
      role: "system",
      content: "Promote items from roadmap/new.md (ideas queue) into tasks.\nReturn ONLY YAML in a code block with the shape:\n```yaml\nitems:\n  - id: <leave blank or omit>\n    type: bug|improvement|feature\n    title: <short>\n    desc: <2\u20134 lines>\n    source: logs|review|user|vision\n    created: <ISO>\n    priority: <int>\n```\nRules: no duplicates vs existing tasks; unique priorities 1..N; prefer critical bugs and user-impactful work; cap at ~100."
    },
    { role: "user", content: JSON.stringify(input, null, 2) }
  ];
  const r = await openai.chat.completions.create({
    model: import_env.ENV.OPENAI_MODEL,
    messages
  });
  return r.choices[0]?.message?.content ?? "";
}
async function implementPlan(input) {
  const openai = getOpenAI();
  const messages = [
    {
      role: "system",
      content: "You are a senior developer. Develope task and deliver in a safe diff. Output ONLY JSON with keys: operations (array of {path, action:create|update, content?}), testHint, commitTitle, commitBody. Keep diffs tangible; only files relevant to the task; include at least one test file if a test harness exists; avoid broad refactors."
    },
    { role: "user", content: JSON.stringify(input, null, 2) }
  ];
  const r = await openai.chat.completions.create({
    model: import_env.ENV.OPENAI_MODEL,
    messages
  });
  return r.choices[0]?.message?.content ?? "{}";
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  implementPlan,
  reviewToIdeas,
  reviewToSummary,
  summarizeLogToBug,
  synthesizeTasksPrompt
});
