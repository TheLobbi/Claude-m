/**
 * Unit tests for the in-memory + on-disk change-feed buffer.
 */
import { describe, expect, it, beforeAll, afterAll } from "vitest";
import { mkdtempSync, rmSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

let tmpRoot: string;

beforeAll(() => {
  tmpRoot = mkdtempSync(join(tmpdir(), "msgo-feed-test-"));
  process.env.MSGO_CHANGEFEED_DIR = tmpRoot;
});

afterAll(() => {
  if (tmpRoot && existsSync(tmpRoot)) rmSync(tmpRoot, { recursive: true, force: true });
});

describe("changeFeed", () => {
  it("starts empty", async () => {
    const { listFeedSubscriptions, readRecent } = await import("../src/streaming/changeFeed.js");
    expect(listFeedSubscriptions()).toEqual([]);
    expect(readRecent()).toEqual([]);
  });

  it("records and reads back a notification", async () => {
    const { recordNotification, readRecent } = await import("../src/streaming/changeFeed.js");
    recordNotification({
      id: "n1",
      receivedAt: new Date().toISOString(),
      subscriptionId: "sub-A",
      changeType: "updated",
      resource: "/me/messages",
    });
    const recent = readRecent(10);
    expect(recent).toHaveLength(1);
    expect(recent[0].subscriptionId).toBe("sub-A");
    expect(recent[0].changeType).toBe("updated");
  });

  it("filters by subscriptionId", async () => {
    const { recordNotification, readRecent } = await import("../src/streaming/changeFeed.js");
    const now = Date.now();
    recordNotification({
      id: "x1",
      receivedAt: new Date(now + 10).toISOString(),
      subscriptionId: "sub-B",
      changeType: "created",
      resource: "/me/events",
    });
    recordNotification({
      id: "y1",
      receivedAt: new Date(now + 20).toISOString(),
      subscriptionId: "sub-C",
      changeType: "created",
      resource: "/me/events",
    });
    const onlyC = await import("../src/streaming/changeFeed.js").then((m) => m.readRecent(10, "sub-C"));
    expect(onlyC.every((n) => n.subscriptionId === "sub-C")).toBe(true);
  });

  it("returns notifications newest-first", async () => {
    const { recordNotification, readRecent } = await import("../src/streaming/changeFeed.js");
    const base = Date.now();
    for (let i = 0; i < 3; i++) {
      recordNotification({
        id: `o${i}`,
        receivedAt: new Date(base + i * 1000).toISOString(),
        subscriptionId: "sub-order",
        changeType: "created",
        resource: "/x",
      });
    }
    const got = readRecent(10, "sub-order");
    expect(got.length).toBeGreaterThanOrEqual(3);
    for (let i = 1; i < got.length; i++) {
      expect(got[i - 1].receivedAt >= got[i].receivedAt).toBe(true);
    }
  });

  it("listFeedSubscriptions enumerates the subs that have data", async () => {
    const { listFeedSubscriptions } = await import("../src/streaming/changeFeed.js");
    const subs = listFeedSubscriptions();
    expect(subs).toContain("sub-A");
    expect(subs).toContain("sub-B");
  });
});
