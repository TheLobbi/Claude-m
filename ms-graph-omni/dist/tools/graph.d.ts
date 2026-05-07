export declare const graph_request: import("./types.js").ToolDef<{
    path: string;
    body?: unknown;
    method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE" | undefined;
    headers?: Record<string, string> | undefined;
    mode?: "app" | "delegated" | undefined;
    queryParams?: Record<string, string> | undefined;
}>;
export declare const graphTools: import("./types.js").ToolDef<{
    path: string;
    body?: unknown;
    method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE" | undefined;
    headers?: Record<string, string> | undefined;
    mode?: "app" | "delegated" | undefined;
    queryParams?: Record<string, string> | undefined;
}>[];
