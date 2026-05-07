import { z } from "zod";
import { getGraphClient } from "../../auth/index.js";
const InputSchema = z.object({
    select: z
        .array(z.string())
        .optional()
        .describe("Override the default \$select list. Pass an empty array [] to fetch the full /organization payload (warning: 60+ kB on real tenants because of historical assignedPlans / provisionedPlans)."),
});
// Slim default keeps the response under ~3 kB on a typical tenant. Callers
// who need the full assignedPlans / provisionedPlans history can pass
// \`select: []\` to disable the projection.
const DEFAULT_SELECT = [
    "id",
    "displayName",
    "verifiedDomains",
    "defaultUsageLocation",
    "technicalNotificationMails",
    "createdDateTime",
    "businessPhones",
    "city",
    "country",
    "countryLetterCode",
    "marketingNotificationEmails",
    "preferredLanguage",
    "tenantType",
];
export const orgGetTenant = {
    name: "org_getTenant",
    description: "Get tenant/organization metadata via /organization (app-only). Confirms cert auth + Graph reachability. Returns a slim projection by default (id, displayName, verifiedDomains, technicalNotificationMails, etc.); pass \`select: []\` to fetch the full payload.",
    inputSchema: InputSchema,
    mode: "app",
    handler: async (input) => {
        const client = await getGraphClient({ mode: "app" });
        const select = input?.select;
        let req = client.api("/organization");
        if (select === undefined) {
            req = req.select(DEFAULT_SELECT.join(","));
        }
        else if (select.length > 0) {
            req = req.select(select.join(","));
        }
        return await req.get();
    },
};
//# sourceMappingURL=getTenant.js.map