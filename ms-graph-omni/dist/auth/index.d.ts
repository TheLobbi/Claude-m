/**
 * The single entry point any tool uses to get an authenticated Graph client.
 *
 *   const client = await getGraphClient({ mode: "app" });                                  // default tenant
 *   const client = await getGraphClient({ mode: "app", tenantSlug: "client-acme" });       // specific tenant
 *   const client = await getGraphClient({ mode: "delegated" });                            // act as user
 *
 * Each tool file declares its mode at the top. Optionally a tool can pass
 * tenantSlug from its input. The factory caches Graph clients per (tenantSlug, mode)
 * so we don't spin up token requests on every call.
 */
import "isomorphic-fetch";
import { Client } from "@microsoft/microsoft-graph-client";
export type AuthMode = "app" | "delegated";
interface GetClientOpts {
    mode: AuthMode;
    scopes?: string[];
    /** Optional tenant slug. Falls back to defaultTenant when omitted. */
    tenantSlug?: string;
}
export declare function getGraphClient(opts: GetClientOpts): Promise<Client>;
export {};
