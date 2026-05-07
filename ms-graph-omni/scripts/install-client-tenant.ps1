<#
.SYNOPSIS
  Builds or applies a client tenant installation plan for ms-graph-omni.

.DESCRIPTION
  This script is dry-run-first. By default it emits a deterministic, non-secret
  JSON plan containing the tenant profile, required token audiences, and consent
  prerequisites. Apply mode is intentionally explicit, requires the active Azure
  CLI tenant to match the target tenant, and writes only a non-secret tenant
  profile to the requested output path.
#>
[CmdletBinding()]
param(
    [Parameter(Mandatory=$true)][string]$Slug,
    [Parameter(Mandatory=$true)][string]$TenantId,
    [string]$ClientId = "",
    [Parameter(Mandatory=$true)][string]$VaultUrl,
    [Parameter(Mandatory=$true)][string]$CertName,
    [Parameter(Mandatory=$true)][string]$CapabilityPacks,
    [Parameter(Mandatory=$true)][string]$ConsentEvidenceRef,
    [string]$GrantedBy = "",
    [string]$TenantProfileOutputPath = "",
    [string]$AppName = "",
    [switch]$Apply,
    [switch]$GrantAdminConsent
)

$ErrorActionPreference = "Stop"

function Get-CapabilityPackNames {
    param([string]$Value)
    return @(
        $Value -split "," |
            ForEach-Object { $_.Trim() } |
            Where-Object { $_.Length -gt 0 }
    )
}

function Get-PackManifest {
    param([string]$PackName)
    $path = Join-Path $PSScriptRoot "..\config\capability-packs\$PackName.json"
    if (-not (Test-Path -LiteralPath $path)) {
        throw "Unknown capability pack '$PackName'. Expected manifest at $path."
    }
    return Get-Content -LiteralPath $path -Raw | ConvertFrom-Json
}

function Invoke-AzJson {
    param([string[]]$Arguments)
    $output = & az @Arguments 2>&1
    if ($LASTEXITCODE -ne 0) {
        throw ($output -join "`n")
    }
    $text = ($output -join "`n").Trim()
    if ([string]::IsNullOrWhiteSpace($text)) {
        return $null
    }
    return $text | ConvertFrom-Json
}

function Try-AzJson {
    param([string[]]$Arguments)
    try {
        return Invoke-AzJson -Arguments $Arguments
    } catch {
        return $null
    }
}

function Resolve-GraphResourceAccess {
    param(
        [string[]]$DelegatedPermissions,
        [string[]]$ApplicationPermissions
    )
    $graphSp = Invoke-AzJson -Arguments @("ad", "sp", "show", "--id", "00000003-0000-0000-c000-000000000000", "-o", "json")
    $oauth2Scopes = @{}
    foreach ($scope in @($graphSp.oauth2PermissionScopes)) {
        $oauth2Scopes[$scope.value] = $scope.id
    }
    $appRoles = @{}
    foreach ($role in @($graphSp.appRoles)) {
        $appRoles[$role.value] = $role.id
    }

    $resourceAccess = @()
    $unresolved = @()
    foreach ($name in $DelegatedPermissions) {
        if ($oauth2Scopes.ContainsKey($name)) {
            $resourceAccess += @{ id = $oauth2Scopes[$name]; type = "Scope" }
        } else {
            $unresolved += "delegated:$name"
        }
    }
    foreach ($name in $ApplicationPermissions) {
        if ($appRoles.ContainsKey($name)) {
            $resourceAccess += @{ id = $appRoles[$name]; type = "Role" }
        } else {
            $unresolved += "application:$name"
        }
    }
    if ($unresolved.Count -gt 0) {
        throw "Unresolved Microsoft Graph permissions: $($unresolved -join ', ')"
    }
    return @(@{
        resourceAppId = $graphSp.appId
        resourceAccess = $resourceAccess
    })
}

function Get-KeyVaultName {
    param([string]$Url)
    try {
        return ([Uri]$Url).Host.Split(".")[0]
    } catch {
        throw "VaultUrl must be a valid Key Vault URL."
    }
}

$packs = @(Get-CapabilityPackNames -Value $CapabilityPacks)
if ($packs.Count -eq 0) {
    throw "At least one capability pack is required."
}
if ($packs -contains "internal-full") {
    throw "internal-full cannot be used for a client tenant install."
}
if (($packs | Where-Object { $_ -ne "baseline-read" }).Count -gt 0 -and [string]::IsNullOrWhiteSpace($ConsentEvidenceRef)) {
    throw "ConsentEvidenceRef is required when a client tenant install enables packs beyond baseline-read."
}

$manifests = @($packs | ForEach-Object { Get-PackManifest -PackName $_ })
$resources = @(
    $manifests |
        ForEach-Object { $_.resources } |
        Where-Object { $_ } |
        Select-Object -Unique
)
$graphApplicationPermissions = @(
    $manifests |
        ForEach-Object { $_.graphApplicationPermissions } |
        Where-Object { $_ } |
        Select-Object -Unique
)
$graphDelegatedPermissions = @(
    $manifests |
        ForEach-Object { $_.graphDelegatedPermissions } |
        Where-Object { $_ } |
        Select-Object -Unique
)
$prerequisites = @(
    $manifests |
        ForEach-Object { $_.prerequisites } |
        Where-Object { $_ } |
        Select-Object -Unique
)

$profile = [ordered]@{
    slug = $Slug
    tenantId = $TenantId
    clientId = $ClientId
    vaultUrl = $VaultUrl
    certName = $CertName
    environment = "client"
    capabilityPacks = $packs
    consent = [ordered]@{
        appRegistrationMode = "single-tenant"
        grantedAt = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
        grantedBy = $GrantedBy
        evidenceRef = $ConsentEvidenceRef
    }
}

if ($Apply) {
    if ([string]::IsNullOrWhiteSpace($TenantProfileOutputPath)) {
        throw "TenantProfileOutputPath is required when using -Apply."
    }

    $account = Invoke-AzJson -Arguments @("account", "show", "-o", "json")
    if ($account.tenantId -ne $TenantId) {
        throw "The active az tenant '$($account.tenantId)' does not match target tenant '$TenantId'. Run az login --tenant $TenantId first."
    }

    $requiredResourceAccess = Resolve-GraphResourceAccess `
        -DelegatedPermissions $graphDelegatedPermissions `
        -ApplicationPermissions $graphApplicationPermissions
    $rraFile = [System.IO.Path]::GetTempFileName()
    ($requiredResourceAccess | ConvertTo-Json -Depth 8) | Set-Content -LiteralPath $rraFile -Encoding UTF8

    $effectiveAppName = if ([string]::IsNullOrWhiteSpace($AppName)) { "msgo-$Slug" } else { $AppName }
    if ([string]::IsNullOrWhiteSpace($ClientId)) {
        $app = Invoke-AzJson -Arguments @(
            "ad", "app", "create",
            "--display-name", $effectiveAppName,
            "--sign-in-audience", "AzureADMyOrg",
            "--required-resource-accesses", "@$rraFile",
            "--public-client-redirect-uris", "http://localhost",
            "--is-fallback-public-client", "true",
            "-o", "json"
        )
        $ClientId = $app.appId
    } else {
        $app = Invoke-AzJson -Arguments @("ad", "app", "show", "--id", $ClientId, "-o", "json")
        Invoke-AzJson -Arguments @(
            "ad", "app", "update",
            "--id", $ClientId,
            "--required-resource-accesses", "@$rraFile",
            "--public-client-redirect-uris", "http://localhost",
            "--is-fallback-public-client", "true",
            "-o", "json"
        ) | Out-Null
    }
    Remove-Item -LiteralPath $rraFile -Force

    $appObjectId = $app.id
    if ([string]::IsNullOrWhiteSpace($appObjectId)) {
        throw "Unable to resolve app object id for clientId '$ClientId'."
    }

    $spList = Invoke-AzJson -Arguments @("ad", "sp", "list", "--filter", "appId eq '$ClientId'", "-o", "json")
    if (@($spList).Count -eq 0) {
        $sp = Invoke-AzJson -Arguments @("ad", "sp", "create", "--id", $ClientId, "-o", "json")
    } else {
        $sp = @($spList)[0]
    }
    $spObjectId = $sp.id
    if ([string]::IsNullOrWhiteSpace($spObjectId)) {
        throw "Unable to resolve service principal object id for clientId '$ClientId'."
    }

    $vaultName = Get-KeyVaultName -Url $VaultUrl
    $existingCert = Try-AzJson -Arguments @("keyvault", "certificate", "show", "--vault-name", $vaultName, "--name", $CertName, "-o", "json")
    if (-not $existingCert) {
        $policy = Invoke-AzJson -Arguments @("keyvault", "certificate", "get-default-policy", "-o", "json")
        $policyFile = [System.IO.Path]::GetTempFileName()
        ($policy | ConvertTo-Json -Depth 8) | Set-Content -LiteralPath $policyFile -Encoding UTF8
        Invoke-AzJson -Arguments @("keyvault", "certificate", "create", "--vault-name", $vaultName, "--name", $CertName, "--policy", "@$policyFile", "-o", "json") | Out-Null
        Remove-Item -LiteralPath $policyFile -Force
    }

    $cerPath = Join-Path $env:TEMP "$CertName.cer"
    Invoke-AzJson -Arguments @("keyvault", "certificate", "download", "--vault-name", $vaultName, "--name", $CertName, "--file", $cerPath, "--encoding", "PEM", "-o", "json") | Out-Null
    $certContent = Get-Content -LiteralPath $cerPath -Raw
    $certBody = ($certContent -replace '-----.*?-----', '' -replace '\s+', '').Trim()
    $keyCredentialsBody = @{
        keyCredentials = @(
            @{
                type = "AsymmetricX509Cert"
                usage = "Verify"
                key = $certBody
                displayName = "KV: $CertName"
            }
        )
    } | ConvertTo-Json -Depth 8
    $keyCredentialFile = [System.IO.Path]::GetTempFileName()
    $keyCredentialsBody | Set-Content -LiteralPath $keyCredentialFile -Encoding UTF8
    Invoke-AzJson -Arguments @(
        "rest",
        "--method", "PATCH",
        "--uri", "https://graph.microsoft.com/v1.0/applications/$appObjectId",
        "--headers", "Content-Type=application/json",
        "--body", "@$keyCredentialFile",
        "-o", "json"
    ) | Out-Null
    Remove-Item -LiteralPath $keyCredentialFile -Force
    Remove-Item -LiteralPath $cerPath -Force

    $kv = Invoke-AzJson -Arguments @("keyvault", "show", "--name", $vaultName, "-o", "json")
    foreach ($roleName in @("Key Vault Certificate User", "Key Vault Secrets User")) {
        $existingRole = Invoke-AzJson -Arguments @(
            "role", "assignment", "list",
            "--assignee-object-id", $spObjectId,
            "--scope", $kv.id,
            "--query", "[?roleDefinitionName=='$roleName']",
            "-o", "json"
        )
        if (@($existingRole).Count -eq 0) {
            Invoke-AzJson -Arguments @(
                "role", "assignment", "create",
                "--role", $roleName,
                "--assignee-object-id", $spObjectId,
                "--assignee-principal-type", "ServicePrincipal",
                "--scope", $kv.id,
                "-o", "json"
            ) | Out-Null
        }
    }

    $profile.clientId = $ClientId
    $profile.consent.grantedAt = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
    $profileDir = Split-Path -Parent $TenantProfileOutputPath
    if (-not [string]::IsNullOrWhiteSpace($profileDir)) {
        New-Item -ItemType Directory -Force -Path $profileDir | Out-Null
    }
    ($profile | ConvertTo-Json -Depth 8) | Set-Content -LiteralPath $TenantProfileOutputPath -Encoding UTF8

    $manualConsentCommand = "az ad app permission admin-consent --id $ClientId"
    $adminConsentStatus = "manual-required"
    if ($GrantAdminConsent) {
        Invoke-AzJson -Arguments @("ad", "app", "permission", "admin-consent", "--id", $ClientId, "-o", "json") | Out-Null
        $adminConsentStatus = "granted"
    }

    [ordered]@{
        mode = "apply"
        tenantProfile = $profile
        tenantProfileOutputPath = $TenantProfileOutputPath
        requiredResources = $resources
        graphApplicationPermissions = $graphApplicationPermissions
        graphDelegatedPermissions = $graphDelegatedPermissions
        prerequisites = $prerequisites
        sensitiveValuesWritten = $false
        adminConsent = $adminConsentStatus
        manualConsentCommand = if ($GrantAdminConsent) { $null } else { $manualConsentCommand }
    } | ConvertTo-Json -Depth 8
    exit 0
}

[ordered]@{
    mode = "dry-run"
    tenantProfile = $profile
    requiredResources = $resources
    graphApplicationPermissions = $graphApplicationPermissions
    graphDelegatedPermissions = $graphDelegatedPermissions
    prerequisites = $prerequisites
    sensitiveValuesWritten = $false
    nextCommands = @(
        "az login --tenant $TenantId",
        "pwsh -File scripts/provision-azure.ps1 -AppName msgo-$Slug -CertName $CertName",
        "Set MSGO_TENANTS_JSON to include the emitted tenantProfile JSON"
    )
} | ConvertTo-Json -Depth 8
