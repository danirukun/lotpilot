import "./setup";
import assert from "node:assert/strict";
import { test } from "node:test";
import { POST } from "../src/app/api/chat/route";
import { runAgentForStore, runAgentFromDna } from "../src/lib/agent";

test("chat streams real stages before a complete offline result", async () => {
  const response = await POST(new Request("http://localhost/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/x-ndjson" },
    body: JSON.stringify({ brief: "Y2K thrift, budget £2000", refresh: true })
  }));
  assert.match(response.headers.get("content-type") ?? "", /application\/x-ndjson/);
  const events = (await response.text()).trim().split("\n").map(line => JSON.parse(line));
  assert.equal(events[0].type, "progress");
  assert.ok(events.some(event => event.type === "progress" && event.stage === "research"));
  assert.equal(events.at(-1).type, "result");
  assert.equal(events.at(-1).result.wholesale.mode, "index");
  assert.ok(events.at(-1).result.matches.length > 0);
});

test("JSON callers still receive a complete result and blank input is rejected", async () => {
  const request = (brief: string) => new Request("http://localhost/api/chat", { method: "POST", body: JSON.stringify({ brief }) });
  assert.equal((await POST(request("  "))).status, 400);
  const response = await POST(request("vintage denim, £2000 budget"));
  assert.equal(response.status, 200);
  const result = await response.json();
  assert.ok(result.matches.length > 0);
  assert.ok(result.summary.includes(result.wholesale.leads[0].name), "The briefing must use retrieved evidence");
  assert.match(result.summary, /\[1\]/);
});

test("editing requested categories and brands also changes supplier research", async () => {
  const response = await POST(new Request("http://localhost/api/chat", {
    method: "POST", body: JSON.stringify({ brief: "Nike denim shop, budget £2500", rfq: { categories: ["knitwear"], brands: ["Carhartt"] } })
  }));
  const result = await response.json();
  assert.match(result.wholesale.query, /knitwear/);
  assert.match(result.wholesale.query, /carhartt/);
  assert.doesNotMatch(result.wholesale.query, /denim|nike/i);
});

test("storefront brands survive RFQ resolution and can still be explicitly cleared", async () => {
  const original = globalThis.fetch;
  globalThis.fetch = async () => new Response("Store unavailable", { status: 503 });
  try {
    const result = await runAgentForStore("https://gadgetgrid.co.uk/", undefined, { refresh: true });
    assert.equal(result.store?.fetch.mode, "fixture");
    assert.deepEqual(result.rfq.brands, ["Apple", "Sony", "Dell"]);
    assert.match(result.wholesale!.query, /apple OR sony/);
    const cleared = await runAgentFromDna(result.dna, undefined, result.store, { rfq: { brands: [] } });
    assert.deepEqual(cleared.rfq.brands, []);
    assert.doesNotMatch(cleared.wholesale!.query, /apple|sony|dell/);
  } finally { globalThis.fetch = original; }
});
