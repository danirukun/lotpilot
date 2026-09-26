import { createHash } from "crypto";
import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import type { StoreProfile } from "@/lib/store/types";

export const STORE_CACHE_VERSION = 3;

/** Default 24h — enough for a demo day without serving stale storefront DNA forever. */
export const DEFAULT_TTL_MS = Number(process.env.STORE_CACHE_TTL_MS ?? 24 * 60 * 60 * 1000);

type CacheEnvelope = {
  version: number;
  key: string;
  cachedAt: string;
  ttlMs: number;
  profile: StoreProfile;
};

const memory = new Map<string, CacheEnvelope>();

function cacheRoot(): string {
  return process.env.STORE_CACHE_DIR?.trim() || path.join(process.cwd(), ".cache", "store-profiles");
}

/** Stable key: host without www + normalized path (no query/hash). */
export function storeCacheKey(url: URL): string {
  const host = url.hostname.replace(/^www\./i, "").toLowerCase();
  const pathname = url.pathname.replace(/\/+$/, "") || "/";
  return `${host}${pathname === "/" ? "" : pathname}`;
}

function fileNameFor(key: string): string {
  const hash = createHash("sha256").update(key).digest("hex").slice(0, 24);
  const safe = key.replace(/[^a-z0-9._-]+/gi, "_").slice(0, 80);
  return `${safe}__${hash}.json`;
}

function isFresh(entry: CacheEnvelope, now = Date.now()): boolean {
  if (entry.version !== STORE_CACHE_VERSION) return false;
  const age = now - Date.parse(entry.cachedAt);
  return Number.isFinite(age) && age >= 0 && age < entry.ttlMs;
}

function withCacheMeta(profile: StoreProfile, cachedAt: string, hit: boolean): StoreProfile {
  const note = hit
    ? `Cached storefront analysis from ${cachedAt} (deterministic replay).`
    : "Fresh storefront analysis stored for reuse.";
  const notes = [note, ...profile.fetch.notes.filter((n) => !n.startsWith("Cached storefront") && !n.startsWith("Fresh storefront"))];
  return {
    ...profile,
    fetch: {
      ...profile.fetch,
      notes,
      cached: hit,
      cachedAt
    }
  };
}

async function readDisk(key: string): Promise<CacheEnvelope | null> {
  try {
    const raw = await readFile(path.join(cacheRoot(), fileNameFor(key)), "utf8");
    const parsed = JSON.parse(raw) as CacheEnvelope;
    if (!parsed?.profile || typeof parsed.cachedAt !== "string") return null;
    return parsed;
  } catch {
    return null;
  }
}

async function writeDisk(entry: CacheEnvelope): Promise<void> {
  try {
    const dir = cacheRoot();
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, fileNameFor(entry.key)), JSON.stringify(entry), "utf8");
  } catch {
    /* Disk may be read-only (some serverless mounts). Memory cache still works. */
  }
}

export async function readStoreCache(key: string): Promise<StoreProfile | null> {
  const mem = memory.get(key);
  if (mem && isFresh(mem)) return withCacheMeta(mem.profile, mem.cachedAt, true);

  const disk = await readDisk(key);
  if (!disk || !isFresh(disk)) return null;
  memory.set(key, disk);
  return withCacheMeta(disk.profile, disk.cachedAt, true);
}

export async function writeStoreCache(key: string, profile: StoreProfile, ttlMs = DEFAULT_TTL_MS): Promise<StoreProfile> {
  if (profile.fetch.mode === "offline") return profile;
  const cachedAt = new Date().toISOString();
  const clean: StoreProfile = {
    ...profile,
    fetch: {
      mode: profile.fetch.mode,
      notes: profile.fetch.notes.filter((n) => !n.startsWith("Cached storefront") && !n.startsWith("Fresh storefront")),
      cached: false,
      cachedAt
    }
  };
  const entry: CacheEnvelope = {
    version: STORE_CACHE_VERSION,
    key,
    cachedAt,
    ttlMs,
    profile: clean
  };
  memory.set(key, entry);
  await writeDisk(entry);
  return withCacheMeta(clean, cachedAt, false);
}

/** Test helper — clear in-memory entries (disk files left alone). */
export function clearStoreCacheMemory(): void {
  memory.clear();
}
