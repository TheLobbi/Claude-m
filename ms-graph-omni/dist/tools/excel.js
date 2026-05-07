/**
 * Excel workbook ops via Graph. Operates on .xlsx files in OneDrive or SharePoint
 * (driveItem with file.mimeType = workbook).
 */
import { z } from "zod";
import { makeTool } from "./_helpers.js";
const wbTarget = z.discriminatedUnion("type", [
    z.object({ type: z.literal("me"), itemId: z.string() }),
    z.object({ type: z.literal("user"), userId: z.string(), itemId: z.string() }),
    z.object({ type: z.literal("site"), siteId: z.string(), driveId: z.string().optional(), itemId: z.string() }),
]);
function wbPath(t) {
    if (t.type === "me")
        return `/me/drive/items/${t.itemId}/workbook`;
    if (t.type === "user")
        return `/users/${t.userId}/drive/items/${t.itemId}/workbook`;
    return t.driveId
        ? `/sites/${t.siteId}/drives/${t.driveId}/items/${t.itemId}/workbook`
        : `/sites/${t.siteId}/drive/items/${t.itemId}/workbook`;
}
export const excel_listWorksheets = makeTool({
    name: "excel_listWorksheets",
    description: "List worksheets in a workbook.",
    mode: "delegated",
    inputSchema: z.object({ target: wbTarget }),
    call: async ({ target }, client) => client.api(`${wbPath(target)}/worksheets`).get(),
});
export const excel_getRange = makeTool({
    name: "excel_getRange",
    description: "Get the values + formulas + formatting of a range. Range is A1 notation, e.g. 'A1:D10' or 'NamedRange'.",
    mode: "delegated",
    inputSchema: z.object({
        target: wbTarget,
        worksheetName: z.string(),
        range: z.string(),
        valuesOnly: z.boolean().default(false),
    }),
    call: async ({ target, worksheetName, range, valuesOnly }, client) => {
        const base = `${wbPath(target)}/worksheets/${encodeURIComponent(worksheetName)}/range(address='${encodeURIComponent(range)}')`;
        if (valuesOnly) {
            const r = await client.api(base).select("address,values").get();
            return { address: r.address, values: r.values };
        }
        return await client.api(base).get();
    },
});
export const excel_updateRange = makeTool({
    name: "excel_updateRange",
    description: "Set values in a range. values is a 2D array matching the range dimensions.",
    mode: "delegated",
    inputSchema: z.object({
        target: wbTarget,
        worksheetName: z.string(),
        range: z.string(),
        values: z.array(z.array(z.union([z.string(), z.number(), z.boolean(), z.null()]))),
    }),
    call: async ({ target, worksheetName, range, values }, client) => {
        const path = `${wbPath(target)}/worksheets/${encodeURIComponent(worksheetName)}/range(address='${encodeURIComponent(range)}')`;
        return await client.api(path).patch({ values });
    },
});
export const excel_listTables = makeTool({
    name: "excel_listTables",
    description: "List Excel tables in a workbook (or in a specific worksheet).",
    mode: "delegated",
    inputSchema: z.object({
        target: wbTarget,
        worksheetName: z.string().optional(),
    }),
    call: async ({ target, worksheetName }, client) => {
        const path = worksheetName
            ? `${wbPath(target)}/worksheets/${encodeURIComponent(worksheetName)}/tables`
            : `${wbPath(target)}/tables`;
        return await client.api(path).get();
    },
});
export const excel_addRowsToTable = makeTool({
    name: "excel_addRowsToTable",
    description: "Append rows to an Excel table.",
    mode: "delegated",
    inputSchema: z.object({
        target: wbTarget,
        tableNameOrId: z.string(),
        values: z.array(z.array(z.union([z.string(), z.number(), z.boolean(), z.null()]))),
    }),
    call: async ({ target, tableNameOrId, values }, client) => client.api(`${wbPath(target)}/tables/${encodeURIComponent(tableNameOrId)}/rows/add`).post({ values }),
});
export const excel_createSession = makeTool({
    name: "excel_createSession",
    description: "Create a persistent workbook session for batch operations (avoids re-opening the file). Returns a session id usable for ~5 min.",
    mode: "delegated",
    inputSchema: z.object({ target: wbTarget, persistChanges: z.boolean().default(true) }),
    call: async ({ target, persistChanges }, client) => client.api(`${wbPath(target)}/createSession`).post({ persistChanges }),
});
export const excelTools = [
    excel_listWorksheets,
    excel_getRange,
    excel_updateRange,
    excel_listTables,
    excel_addRowsToTable,
    excel_createSession,
];
//# sourceMappingURL=excel.js.map