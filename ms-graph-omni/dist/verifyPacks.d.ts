import { type CapabilityPack } from "./capabilities.js";
export interface PackVerificationCheck {
    name: string;
    status: "planned";
    details: string;
}
export interface PackVerificationPlan {
    packs: CapabilityPack[];
    requiredResources: string[];
    checks: PackVerificationCheck[];
}
export declare function buildPackVerificationPlan(packs: CapabilityPack[]): PackVerificationPlan;
export declare function parsePackArgs(args: string[]): CapabilityPack[];
