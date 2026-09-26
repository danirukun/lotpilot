import type { AgentResult } from "@/lib/types";

export interface AgentProgress {
  stage: "profile" | "requirements" | "matching" | "research" | "summary";
  message: string;
}
export type ProgressReporter = (progress: AgentProgress) => void;
export type AgentEvent =
  | ({ type: "progress" } & AgentProgress)
  | { type: "result"; result: AgentResult }
  | { type: "error"; error: string };

/** Decode newline-delimited events even when UTF-8 or JSON spans network chunks. */
export async function readAgentStream(response: Response, onProgress: ProgressReporter): Promise<AgentResult> {
  if (!response.body) throw new Error("The agent response was empty. Try again.");
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let result: AgentResult | undefined;
  function consume(line: string) {
    if (!line.trim()) return;
    const event = JSON.parse(line) as AgentEvent;
    if (event.type === "error") throw new Error(event.error);
    if (event.type === "progress") onProgress(event);
    if (event.type === "result") result = event.result;
  }
  try {
    while (true) {
      const { value, done } = await reader.read();
      buffer += done ? decoder.decode() : decoder.decode(value, { stream: true });
      let newline: number;
      while ((newline = buffer.indexOf("\n")) !== -1) {
        consume(buffer.slice(0, newline));
        buffer = buffer.slice(newline + 1);
      }
      if (done) break;
    }
    consume(buffer);
    if (!result) throw new Error("The connection ended before results arrived. Try again.");
    return result;
  } finally {
    await reader.cancel().catch(() => {});
    reader.releaseLock();
  }
}
