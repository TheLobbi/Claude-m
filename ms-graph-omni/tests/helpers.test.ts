/**
 * Unit tests for tools/_helpers — pagination cursor + annotation defaults.
 */
import { describe, expect, it } from "vitest";
import {
  encodeNextPageToken,
  decodePageToken,
  shapeListResponse,
  defaultAnnotationsForName,
} from "../src/tools/_helpers.js";

describe("pageToken codec", () => {
  it("round-trips an @odata.nextLink URL through encode/decode", () => {
    const url = "https://graph.microsoft.com/v1.0/users/delta?$skiptoken=abc123";
    const token = encodeNextPageToken({ "@odata.nextLink": url });
    expect(token).not.toBeNull();
    expect(decodePageToken(token!)).toBe(url);
  });

  it("returns null when no nextLink is present", () => {
    expect(encodeNextPageToken({ value: [] })).toBeNull();
    expect(encodeNextPageToken({})).toBeNull();
    expect(encodeNextPageToken(null)).toBeNull();
  });
});

describe("shapeListResponse", () => {
  it("preserves all original Graph fields and adds nextPageToken", () => {
    const input = {
      value: [{ id: "1" }, { id: "2" }],
      "@odata.nextLink": "https://graph.microsoft.com/v1.0/users?$skiptoken=xyz",
      "@odata.count": 42,
    };
    const out = shapeListResponse(input);
    expect(out.value).toEqual(input.value);
    expect(out["@odata.nextLink"]).toBe(input["@odata.nextLink"]);
    expect(out["@odata.count"]).toBe(42);
    expect(out.nextPageToken).not.toBeNull();
  });

  it("returns nextPageToken=null on the last page", () => {
    const out = shapeListResponse({ value: [{ id: "1" }] });
    expect(out.nextPageToken).toBeNull();
  });
});

describe("defaultAnnotationsForName", () => {
  it.each([
    ["mail_listMessages", "readOnlyHint"],
    ["users_get", "readOnlyHint"],
    ["search_query", "readOnlyHint"],
    ["drive_search", "readOnlyHint"],
    ["drive_downloadFile", "readOnlyHint"],
  ])("classifies %s as readOnly", (name, hint) => {
    expect(defaultAnnotationsForName(name)[hint as "readOnlyHint"]).toBe(true);
  });

  it.each([
    ["mail_deleteMessage", "destructiveHint"],
    ["users_delete", "destructiveHint"],
    ["teams_archive", "destructiveHint"],
  ])("classifies %s as destructive", (name, hint) => {
    expect(defaultAnnotationsForName(name)[hint as "destructiveHint"]).toBe(true);
  });

  it.each([
    ["users_update", "idempotentHint"],
    ["mail_moveMessage", "idempotentHint"],
    ["users_assignLicense", "idempotentHint"],
  ])("classifies %s as idempotent", (name, hint) => {
    expect(defaultAnnotationsForName(name)[hint as "idempotentHint"]).toBe(true);
  });

  it("falls through to openWorldHint-only for create/send/post verbs", () => {
    const a = defaultAnnotationsForName("mail_sendMail");
    expect(a.readOnlyHint).toBeUndefined();
    expect(a.destructiveHint).toBeUndefined();
    expect(a.idempotentHint).toBeUndefined();
    expect(a.openWorldHint).toBe(true);
  });
});
