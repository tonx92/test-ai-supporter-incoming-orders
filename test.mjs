import { test } from "node:test";
import { spawn } from "node:child_process";

test("manual_review при сбое модели", async () => {
  const server = spawn("node", ["server.mjs"], { env: { ...process.env, PORT: "3199" } });
  await new Promise((r) => setTimeout(r, 600));
  try {
    const res = await fetch("http://127.0.0.1:3199/api/triage", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: "[error] заявка" }),
    });
    const data = await res.json();
    if (data.status !== "manual_review" || data.topic !== null || data.draft !== null)
      throw new Error(`Неожиданный ответ: ${JSON.stringify(data)}`);
  } finally {
    server.kill();
  }
});
