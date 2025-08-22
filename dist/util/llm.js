import https from "https";
function stripCodeFences(s) {
    // remove ```json ... ``` or ``` ... ```
    return s.replace(/^```(?:json)?\s*/i, "").replace(/```$/i, "").trim();
}
function tryParseJSON(raw) {
    const txt = stripCodeFences(raw);
    try {
        return JSON.parse(txt);
    }
    catch { }
    // last resort: grab the first {...} or [...]
    const m = txt.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
    if (m) {
        try {
            return JSON.parse(m[1]);
        }
        catch { }
    }
    return null;
}
export async function chatJSON(opts) {
    const apiKey = opts.apiKey;
    const model = opts.model ?? "gpt-4o-mini";
    const body = JSON.stringify({
        model,
        messages: [
            { role: "system", content: "You are a precise JSON generator. Do not include any explanation. Respond with a single valid JSON object or array only." },
            ...opts.messages
        ],
        temperature: 0,
        response_format: { type: "json_object" } // forces JSON when supported
    });
    const resText = await new Promise((resolve, reject) => {
        const req = https.request({
            method: "POST",
            host: "api.openai.com",
            path: "/v1/chat/completions",
            headers: {
                "Authorization": `Bearer ${apiKey}`,
                "Content-Type": "application/json"
            }
        }, (res) => {
            let data = "";
            res.on("data", (c) => (data += c));
            res.on("end", () => resolve(data));
        });
        req.on("error", reject);
        req.write(body);
        req.end();
    });
    // Basic response extraction
    let content = "";
    try {
        const json = JSON.parse(resText);
        content = json.choices?.[0]?.message?.content ?? "";
    }
    catch {
        // OpenAI error JSON - surface a minimal hint
        console.log("OpenAI raw response (non-JSON):", resText.slice(0, 200));
    }
    const parsed = tryParseJSON(content);
    if (parsed)
        return parsed;
    console.log("LLM did not return valid JSON. Content preview:", content.slice(0, 120));
    if (opts.fallback !== undefined)
        return opts.fallback;
    // give the caller something safe
    return [];
}
