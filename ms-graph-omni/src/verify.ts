/**
 * Quick standalone verifier — tests both auth modes without going through MCP.
 *
 *   pnpm verify
 *
 * App-only: should always work (cert in KV, SP has 106 app roles).
 * Delegated: first run opens browser; subsequent runs silent.
 */
import { orgGetTenant } from "./tools/org/getTenant.js";
import { meGetProfile } from "./tools/me/getProfile.js";
import { buildPackVerificationPlan, parsePackArgs } from "./verifyPacks.js";

async function main() {
  console.log("=== ms-graph-omni verifier ===\n");
  const packArgs = parsePackArgs(process.argv.slice(2));
  if (packArgs.length > 0) {
    const packPlan = buildPackVerificationPlan(packArgs);
    console.log(">> Capability pack checks");
    console.log(JSON.stringify(packPlan, null, 2));
    console.log("");
  }

  console.log(">> [1/2] App-only: org_getTenant");
  try {
    const result = (await orgGetTenant.handler({})) as any;
    const orgs = result?.value ?? [];
    console.log(`   OK got ${orgs.length} org record(s)`);
    if (orgs[0]) {
      console.log(`   tenant: ${orgs[0].displayName} (${orgs[0].id})`);
      console.log(`   verifiedDomains: ${orgs[0].verifiedDomains?.length ?? 0}`);
    }
  } catch (e) {
    console.error("   FAIL", (e as Error).message);
    process.exit(1);
  }

  const skipDelegated = process.argv.includes("--skip-delegated");
  if (skipDelegated) {
    console.log("\n[skipping delegated check — pass without --skip-delegated to run]");
    return;
  }

  console.log("\n>> [2/2] Delegated: me_getProfile (browser may open)");
  try {
    const result = (await meGetProfile.handler({
      select: ["id", "displayName", "mail", "userPrincipalName", "jobTitle"],
    })) as any;
    console.log(`   OK ${result.displayName} <${result.mail ?? result.userPrincipalName}>`);
    console.log(`   jobTitle: ${result.jobTitle ?? "(none)"}`);
  } catch (e) {
    console.error("   FAIL", (e as Error).message);
    process.exit(1);
  }

  console.log("\nAll checks passed.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
