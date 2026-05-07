export interface ResolvedCertificate {
    privateKey: string;
    thumbprint: string;
}
export declare function getCertificate(vaultUrl: string, certName: string): Promise<ResolvedCertificate>;
