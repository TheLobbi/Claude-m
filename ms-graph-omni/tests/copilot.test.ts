/**
 * Unit tests for tools/copilot — Microsoft 365 Copilot API request shaping.
 * Mocks the auth/config/capability leaf deps so handlers run without tenant auth.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";

const h = vi.hoisted(() => {
  const calls: { path?: string; method?: string; body?: unknown } = {};
  const req = {
    get: vi.fn(async () => {
      calls.method = "GET";
      return { value: [] };
    }),
    post: vi.fn(async (b: unknown) => {
      calls.method = "POST";
      calls.body = b;
      return { retrievalHits: [] };
    }),
  };
  const client = {
    api: vi.fn((p: string) => {
      calls.path = p;
      return req;
    }),
  };
  return { calls, client };
});

vi.mock("../src/auth/index.js", () => ({ getGraphClient: vi.fn(async () => h.client) }));
vi.mock("../src/config.js", () => ({ getTenant: vi.fn(() => ({ slug: "test" })) }));
vi.mock("../src/capabilities.js", () => ({
  assertTenantAllowsNamespace: vi.fn(),
  namespaceForToolName: vi.fn(() => "collaboration"),
}));

import { copilot_retrieve, copilot_meeting_insights, copilot_usage_report } from "../src/tools/copilot.js";

beforeEach(() => {
  h.calls.path = undefined;
  h.calls.method = undefined;
  h.calls.body = undefined;
});

describe("copilot_retrieve", () => {
  it("is delegated and read-only", () => {
    expect(copilot_retrieve.mode).toBe("delegated");
    expect(copilot_retrieve.annotations?.readOnlyHint).toBe(true);
  });

  it("POSTs /copilot/retrieval with maximumNumberOfResults serialized as a string", async () => {
    await copilot_retrieve.handler({
      queryString: "corporate VPN setup",
      dataSource: "sharePoint",
      maximumNumberOfResults: 10,
    });
    expect(h.calls.path).toBe("/copilot/retrieval");
    expect(h.calls.method).toBe("POST");
    expect(h.calls.body).toMatchObject({
      queryString: "corporate VPN setup",
      dataSource: "sharePoint",
      maximumNumberOfResults: "10",
    });
  });

  it("wraps connectionIds into dataSourceConfiguration for externalItem only", async () => {
    await copilot_retrieve.handler({
      queryString: "vpn",
      dataSource: "externalItem",
      connectionIds: ["ITKB", "HRKB"],
    });
    expect(h.calls.body).toMatchObject({
      dataSourceConfiguration: {
        externalItem: { connections: [{ connectionId: "ITKB" }, { connectionId: "HRKB" }] },
      },
    });
  });

  it("ignores connectionIds when dataSource is not externalItem", async () => {
    await copilot_retrieve.handler({
      queryString: "vpn",
      dataSource: "sharePoint",
      connectionIds: ["ITKB"],
    });
    expect((h.calls.body as Record<string, unknown>).dataSourceConfiguration).toBeUndefined();
  });
});

describe("copilot_meeting_insights", () => {
  it("lists insights when aiInsightId is omitted (GET)", async () => {
    await copilot_meeting_insights.handler({ userId: "u1", onlineMeetingId: "m1" });
    expect(h.calls.method).toBe("GET");
    expect(h.calls.path).toBe("/copilot/users/u1/onlineMeetings/m1/aiInsights");
  });

  it("gets a single insight when aiInsightId is provided", async () => {
    await copilot_meeting_insights.handler({ userId: "u1", onlineMeetingId: "m1", aiInsightId: "i1" });
    expect(h.calls.path).toBe("/copilot/users/u1/onlineMeetings/m1/aiInsights/i1");
  });
});

describe("copilot_usage_report", () => {
  it("is app-only", () => {
    expect(copilot_usage_report.mode).toBe("app");
  });

  it("builds the report function with a quoted period", async () => {
    await copilot_usage_report.handler({ report: "userCountSummary", period: "D30" });
    expect(h.calls.path).toBe("/reports/getMicrosoft365CopilotUserCountSummary(period='D30')");
  });

  it("defaults period to D7 when omitted", async () => {
    await copilot_usage_report.handler({ report: "userCountTrend" });
    expect(h.calls.path).toBe("/reports/getMicrosoft365CopilotUserCountTrend(period='D7')");
  });

  it("uses an unquoted date for usageUserDetail when date is supplied", async () => {
    await copilot_usage_report.handler({ report: "usageUserDetail", date: "2026-01-01" });
    expect(h.calls.path).toBe("/reports/getMicrosoft365CopilotUsageUserDetail(date=2026-01-01)");
  });
});
