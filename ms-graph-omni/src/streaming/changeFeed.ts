/**
 * In-memory ring buffer of recent Graph change notifications, with disk overflow.
 *
 * The webhook receiver writes here when a notification arrives. The MCP server
 * reads here when a client lists or subscribes to change-feed Resources. Both
 * processes (receiver + MCP server) point at the same file directory so the
 * MCP can replay notifications received while it was offline.
 *
 * Design:
 *   - Per-subscription file at ~/.msgo-cache/changefeed/{subscriptionId}.ndjson
 *   - File capped at MAX_LINES_PER_SUB; oldest lines dropped
 *   - In-memory index of last N notifications across all subs for quick listing
 *   - Best-effort: notification loss on disk-full / write-fail is logged but not fatal
 */
import { existsSync, mkdirSync, appendFileSync, readFileSync, writeFileSync, readdirSync, unlinkSync } from "node:fs";
import { join } from "node:path";
import { logger } from "../logger.js";

const FEED_DIR =
  process.env.MSGO_CHANGEFEED_DIR ??
  join(process.env.USERPROFILE ?? process.env.HOME ?? ".", ".msgo-cache", "changefeed");

const MAX_LINES_PER_SUB = 5000;

export interface NotificationRecord {
  id: string;
  receivedAt: string;
  subscriptionId: string;
  subscriptionExpirationDateTime?: string;
  changeType: string;
  clientState?: string;
  resource: string;
  resourceData?: Record<string, unknown>;
  encryptedContent?: Record<string, unknown>;
  tenantId?: string;
  /** Lifecycle event when this is a lifecycle notification, not a regular change. */
  lifecycleEvent?: "reauthorizationRequired" | "subscriptionRemoved" | "missed";
}

function ensureDir(): void {
  if (!existsSync(FEED_DIR)) mkdirSync(FEED_DIR, { recursive: true });
}

function feedPath(subscriptionId: string): string {
  // subscriptionId is a Graph GUID — already filename-safe, but be defensive.
  const safe = subscriptionId.replace(/[^a-zA-Z0-9_.-]/g, "_").slice(0, 80);
  return join(FEED_DIR, `${safe}.ndjson`);
}

export function recordNotification(rec: NotificationRecord): void {
  try {
    ensureDir();
    appendFileSync(feedPath(rec.subscriptionId), JSON.stringify(rec) + "\n", { encoding: "utf-8", mode: 0o600 });
    rotateIfNeeded(rec.subscriptionId);
  } catch (e) {
    logger.warn({ err: (e as Error).message, sub: rec.subscriptionId }, "changefeed write failed");
  }
}

function rotateIfNeeded(subscriptionId: string): void {
  try {
    const p = feedPath(subscriptionId);
    const raw = readFileSync(p, "utf-8");
    const lines = raw.split("\n").filter((l) => l.length > 0);
    if (lines.length <= MAX_LINES_PER_SUB) return;
    const trimmed = lines.slice(-MAX_LINES_PER_SUB);
    writeFileSync(p, trimmed.join("\n") + "\n", { encoding: "utf-8", mode: 0o600 });
  } catch {
    // Rotation is best-effort.
  }
}

/** List subscription IDs that have at least one buffered notification. */
export function listFeedSubscriptions(): string[] {
  try {
    ensureDir();
    return readdirSync(FEED_DIR)
      .filter((f) => f.endsWith(".ndjson"))
      .map((f) => f.slice(0, -".ndjson".length));
  } catch {
    return [];
  }
}

/** Read the last N notifications across all subscriptions, newest first. */
export function readRecent(limit = 50, subscriptionId?: string): NotificationRecord[] {
  try {
    ensureDir();
    const subs = subscriptionId ? [subscriptionId] : listFeedSubscriptions();
    const all: NotificationRecord[] = [];
    for (const s of subs) {
      const p = feedPath(s);
      if (!existsSync(p)) continue;
      const lines = readFileSync(p, "utf-8").split("\n").filter((l) => l.length > 0);
      // Cheap "tail": only parse the last `limit` per file, since the file is append-only.
      const slice = lines.slice(-limit);
      for (const line of slice) {
        try {
          all.push(JSON.parse(line) as NotificationRecord);
        } catch {
          // Skip malformed lines.
        }
      }
    }
    // Sort newest-first by receivedAt
    all.sort((a, b) => (a.receivedAt < b.receivedAt ? 1 : -1));
    return all.slice(0, limit);
  } catch (e) {
    logger.warn({ err: (e as Error).message }, "changefeed read failed");
    return [];
  }
}

export function clearFeed(subscriptionId: string): void {
  try {
    const p = feedPath(subscriptionId);
    if (existsSync(p)) unlinkSync(p);
  } catch {
    // Best-effort.
  }
}
