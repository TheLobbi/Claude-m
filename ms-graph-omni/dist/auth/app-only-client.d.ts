export type AppOnlyTokenCachePolicy = "persistent" | "memory";
export declare function getAppOnlyToken(opts: {
    tenantId: string;
    clientId: string;
    vaultUrl: string;
    certName: string;
    scope?: string;
    cachePolicy?: AppOnlyTokenCachePolicy;
}): Promise<string>;
