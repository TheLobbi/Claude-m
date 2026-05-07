// Seed / proof-of-life tools (kept separate because they were the original verifiers)
import { meGetProfile } from "./me/getProfile.js";
import { orgGetTenant } from "./org/getTenant.js";
// Surface bundles
import { mailTools } from "./mail.js";
import { calendarTools } from "./calendar.js";
import { contactsTools } from "./contacts.js";
import { usersTools } from "./users.js";
import { groupsTools } from "./groups.js";
import { teamsTools } from "./teams.js";
import { sharepointTools } from "./sharepoint.js";
import { onedriveTools } from "./onedrive.js";
import { plannerTools } from "./planner.js";
import { todoTools } from "./todo.js";
import { onenoteTools } from "./onenote.js";
import { entraTools } from "./entra.js";
import { excelTools } from "./excel.js";
import { searchTools } from "./search.js";
import { graphTools } from "./graph.js";
import { onlineMeetingsTools } from "./onlineMeetings.js";
import { transcriptsTools } from "./transcripts.js";
import { callRecordsTools } from "./callRecords.js";
import { tenantsTools } from "./tenants.js";
import { deltaTools } from "./delta.js";
import { subscriptionsTools } from "./subscriptions.js";
import { exchangeTools } from "./exchange.js";
import { omiTools } from "./omi.js";
import { powerPlatformTools } from "./powerPlatform.js";
import { intuneTools } from "./intune.js";
import { securityTools } from "./security.js";
import { analyticsTools } from "./analytics.js";
import { azureTools } from "./azureOps.js";
export const tools = [
    // proof-of-life
    meGetProfile,
    orgGetTenant,
    // bundles
    ...mailTools,
    ...calendarTools,
    ...contactsTools,
    ...usersTools,
    ...groupsTools,
    ...teamsTools,
    ...sharepointTools,
    ...onedriveTools,
    ...plannerTools,
    ...todoTools,
    ...onenoteTools,
    ...entraTools,
    ...excelTools,
    ...searchTools,
    ...graphTools,
    // Phase C #2 — Cloud Communications (online meetings, transcripts, call records).
    // Most app-only tools require an ApplicationAccessPolicy grant; see
    // scripts/grant-meeting-access-policy.ps1.
    ...onlineMeetingsTools,
    ...transcriptsTools,
    ...callRecordsTools,
    // Phase C #6 — multi-tenant introspection. Every tool implicitly accepts an
    // optional tenantSlug field; this tool tells the LLM what slugs are configured.
    ...tenantsTools,
    // Phase C #1 — streaming change-feed.
    // Delta tools are pure pull-based and need no receiver. Subscriptions need
    // src/streaming/webhookReceiver.ts running and exposed via Cloudflare Tunnel
    // / ngrok / Azure Function for Graph to reach the notificationUrl.
    ...deltaTools,
    ...subscriptionsTools,
    // Microsoft service planes beyond core Graph collaboration.
    ...exchangeTools,
    ...omiTools,
    ...powerPlatformTools,
    ...intuneTools,
    ...securityTools,
    ...analyticsTools,
    ...azureTools,
];
//# sourceMappingURL=index.js.map