import test from "node:test";
import assert from "node:assert/strict";
import { build } from "esbuild";

const compiled = await build({ entryPoints: ["lib/supabase-fetch.ts"], bundle: true, write: false, platform: "node", format: "esm" });
const { supabaseFetch } = await import("data:text/javascript;base64," + Buffer.from(compiled.outputFiles[0].text).toString("base64"));

test("Transient gateway clock rejection retries once with identical credentials and body", async () => {
  const original = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (...args) => { calls.push(args); return calls.length === 1 ? Response.json({ message: "JWT issued at future" }, { status: 401 }) : Response.json({ accepted: true }); };
  try {
    const init = { method: "POST", headers: { apikey: "synthetic-qa-only" }, body: '{"p_code":"864209"}' };
    assert.deepEqual(await (await supabaseFetch("https://example.invalid/rest/v1/rpc/join_room", init)).json(), { accepted: true });
    assert.equal(calls.length, 2);
    assert.equal(calls[0][1], init);
    assert.equal(calls[1][1], init);
  } finally { globalThis.fetch = original; }
});

test("Gateway retry is bounded and ordinary auth failures are preserved", async () => {
  const original = globalThis.fetch;
  try {
    let count = 0;
    globalThis.fetch = async () => { count++; return Response.json({ message: "JWT issued at future" }, { status: 401 }); };
    assert.equal((await supabaseFetch("https://example.invalid")).status, 401);
    assert.equal(count, 2);
    count = 0;
    globalThis.fetch = async () => { count++; return Response.json({ message: "invalid JWT" }, { status: 403 }); };
    assert.deepEqual(await (await supabaseFetch("https://example.invalid")).json(), { message: "invalid JWT" });
    assert.equal(count, 1);
  } finally { globalThis.fetch = original; }
});

test("Successful, non-JSON and aborted responses are not retried", async () => {
  const original = globalThis.fetch;
  try {
    let count = 0;
    globalThis.fetch = async () => { count++; return new Response("unavailable", { status: 401 }); };
    assert.equal(await (await supabaseFetch("https://example.invalid")).text(), "unavailable");
    assert.equal(count, 1);
    globalThis.fetch = async () => { count++; return Response.json({ message: "JWT issued at future" }, { status: 401 }); };
    const controller = new AbortController(); controller.abort();
    await supabaseFetch("https://example.invalid", { signal: controller.signal });
    assert.equal(count, 2);
    globalThis.fetch = async () => { count++; return Response.json({ ok: true }); };
    assert.deepEqual(await (await supabaseFetch("https://example.invalid")).json(), { ok: true });
    assert.equal(count, 3);
  } finally { globalThis.fetch = original; }
});
