export interface ResourceTokenRequest {
    resource: string;
    tenantSlug?: string;
}
export type QueryParams = Record<string, string | number | boolean | undefined>;
export interface ResourceClientRequestOptions {
    query?: QueryParams;
    headers?: Record<string, string>;
    body?: unknown;
}
export interface ResourceClient {
    get(path: string, query?: QueryParams): Promise<unknown>;
    post(path: string, body?: unknown, options?: ResourceClientRequestOptions): Promise<unknown>;
    patch(path: string, body?: unknown, options?: ResourceClientRequestOptions): Promise<unknown>;
    put(path: string, body?: unknown, options?: ResourceClientRequestOptions): Promise<unknown>;
    delete(path: string, options?: ResourceClientRequestOptions): Promise<unknown>;
    request(method: string, path: string, options?: ResourceClientRequestOptions): Promise<unknown>;
}
type FetchLike = (input: string, init: RequestInit) => Promise<Response>;
export declare function getResourceToken(opts: ResourceTokenRequest): Promise<string>;
export declare function createResourceClient(opts: {
    resource: string;
    baseUrl: string;
    tenantSlug?: string;
    fetchFn?: FetchLike;
}): ResourceClient;
export {};
