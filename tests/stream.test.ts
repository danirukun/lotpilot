import assert from "node:assert/strict";
import { test } from "node:test";
import { readAgentStream } from "../src/lib/progress";

function streamed(text: string) {
  const bytes = new TextEncoder().encode(text);
  return new Response(new ReadableStream({ start(controller) {
    for (let i = 0; i < bytes.length; i += 3) controller.enqueue(bytes.slice(i, i + 3));
    controller.close();
  } }));
}

test("progress parser preserves split UTF-8 and result frames", async () => {
  const steps: string[] = [];
  const result = await readAgentStream(streamed(
    '{"type":"progress","stage":"research","message":"Checking £2000 budget"}\n' +
    '{"type":"result","result":{"summary":"Found denim"}}\n'
  ), event => steps.push(event.message));
  assert.deepEqual(steps, ["Checking £2000 budget"]);
  assert.equal(result.summary, "Found denim");
});

test("a broken stream reports failure instead of succeeding with no results", async () => {
  await assert.rejects(readAgentStream(streamed('{"type":"progress","stage":"research","message":"Searching"}\n'), () => {}), /before results/);
  await assert.rejects(readAgentStream(streamed('{"type":"error","error":"Search failed"}\n'), () => {}), /Search failed/);
});
