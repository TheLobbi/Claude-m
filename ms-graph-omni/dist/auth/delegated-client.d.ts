export interface DelegatedAuthOptions {
    tenantId: string;
    clientId: string;
    tokenCacheDir: string;
    scopes?: string[];
}
export declare function getDelegatedToken(opts: DelegatedAuthOptions): Promise<string>;
