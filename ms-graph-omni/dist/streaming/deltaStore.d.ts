export interface DeltaToken {
    deltaLink: string;
    savedAt: string;
    syncedAt?: string;
}
export declare function readDelta(tenantSlug: string, resource: string, scope: string): DeltaToken | null;
export declare function writeDelta(tenantSlug: string, resource: string, scope: string, deltaLink: string): void;
/** Drop a stored delta token. Call this when Graph returns syncStateNotFound / syncStateInvalid. */
export declare function clearDelta(tenantSlug: string, resource: string, scope: string): void;
/** Extract the deltaLink (if any) from a Graph delta response. */
export declare function extractDeltaLink(response: unknown): string | null;
/** Extract the @odata.nextLink (intermediate page during a multi-page delta sync). */
export declare function extractNextLink(response: unknown): string | null;
