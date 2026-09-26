import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { after } from "node:test";

// Each test worker is offline and owns its caches, independent of developer keys.
for (const key of ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY", "WHOLESALE_EMBED_MODEL", "OPENAI_API_KEY", "ANTHROPIC_API_KEY", "TAVILY_API_KEY", "GOOGLE_MAPS_API_KEY"]) delete process.env[key];
const cache = mkdtempSync(path.join(tmpdir(), "lotpilot-test-"));
process.env.WHOLESALE_CACHE_DIR = path.join(cache, "wholesale");
process.env.STORE_CACHE_DIR = path.join(cache, "store");
after(() => rmSync(cache, { recursive: true, force: true }));
