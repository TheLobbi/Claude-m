import { makeTool, ListOptionsSchema, listRequest, shapeListResponse } from "./_helpers.js";
export const intune_listManagedDevices = makeTool({
    name: "intune_listManagedDevices",
    description: "List Intune managed devices.",
    namespace: "endpoint",
    mode: "app",
    inputSchema: ListOptionsSchema,
    call: async (opts, client) => shapeListResponse(await listRequest(client, "/deviceManagement/managedDevices", opts).get()),
});
export const intune_listMobileApps = makeTool({
    name: "intune_listMobileApps",
    description: "List Intune mobile/client apps.",
    namespace: "endpoint",
    mode: "app",
    inputSchema: ListOptionsSchema,
    call: async (opts, client) => shapeListResponse(await listRequest(client, "/deviceAppManagement/mobileApps", opts).get()),
});
export const intune_listCompliancePolicies = makeTool({
    name: "intune_listCompliancePolicies",
    description: "List Intune device compliance policies.",
    namespace: "endpoint",
    mode: "app",
    inputSchema: ListOptionsSchema,
    call: async (opts, client) => shapeListResponse(await listRequest(client, "/deviceManagement/deviceCompliancePolicies", opts).get()),
});
export const intune_listConfigurationProfiles = makeTool({
    name: "intune_listConfigurationProfiles",
    description: "List Intune device configuration profiles.",
    namespace: "endpoint",
    mode: "app",
    inputSchema: ListOptionsSchema,
    call: async (opts, client) => shapeListResponse(await listRequest(client, "/deviceManagement/deviceConfigurations", opts).get()),
});
export const intuneTools = [
    intune_listManagedDevices,
    intune_listMobileApps,
    intune_listCompliancePolicies,
    intune_listConfigurationProfiles,
];
//# sourceMappingURL=intune.js.map