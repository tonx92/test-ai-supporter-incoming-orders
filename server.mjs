import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { classify } from "./mock-ai.mjs";

const html = await readFile(new URL("./index.html", import.meta.url));

function json(response, status, body) {
  response.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  response.end(JSON.stringify(body));
}

async function handleTriage(request, response) {
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);

  let body;
  try {
    body = JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    return json(response, 400, { status: "invalid_input" });
  }

  const { text } = body ?? {};
  if (typeof text !== "string" || text.length === 0) {
    return json(response, 400, { status: "invalid_input" });
  }

  try {
    const raw = await Promise.race([
      classify(text),
      new Promise((_, r) => setTimeout(r, 300, new Error())),
    ]);
    const result = JSON.parse(raw);
    if (!["delivery", "pricing", "other"].includes(result.topic) || !result.draft?.trim())
      return json(response, 200, { status: "manual_review", topic: null, draft: null });
    return json(response, 200, { status: "ready", ...result });
  } catch {
    return json(response, 200, { status: "manual_review", topic: null, draft: null });
  }
}

createServer(async (request, response) => {
  if (request.method === "GET" && request.url === "/") {
    response.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    response.end(html);
    return;
  }
  if (request.method !== "POST" || request.url !== "/api/triage") {
    return json(response, 404, { status: "not_found" });
  }
  try {
    await handleTriage(request, response);
  } catch {
    json(response, 500, { status: "server_error" });
  }
}).listen(Number(process.env.PORT || 3000), "127.0.0.1");
