import "./setup";
import assert from "node:assert/strict";
import { test } from "node:test";
import { POST } from "../src/app/api/chat/route";

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
