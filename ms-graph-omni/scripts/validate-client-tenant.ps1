<#
.SYNOPSIS
  Validates an ms-graph-omni client tenant profile against local capability manifests.
#>
[CmdletBinding()]
param(
    [Parameter(Mandatory=$true)][string]$TenantProfilePath,
    [switch]$DryRun
)

$ErrorActionPreference = "Stop"

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

function Get-KeyVaultName {
    param([string]$Url)
    try {
        return ([Uri]$Url).Host.Split(".")[0]
    } catch {
        throw "vaultUrl must be a valid Key Vault URL."
    }
}

function Test-GraphPermissionResolution {
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

    $unresolved = @()
    foreach ($name in $DelegatedPermissions) {
        if (-not $oauth2Scopes.ContainsKey($name)) {
            $unresolved += "delegated:$name"
        }
    }
    foreach ($name in $ApplicationPermissions) {
        if (-not $appRoles.ContainsKey($name)) {
            $unresolved += "application:$name"
        }
    }
    if ($unresolved.Count -gt 0) {
        throw "Unresolved Microsoft Graph permissions: $($unresolved -join ', ')"
    }
}

if (-not (Test-Path -LiteralPath $TenantProfilePath)) {
    throw "Tenant profile not found: $TenantProfilePath"
}

$profile = Get-Content -LiteralPath $TenantProfilePath -Raw | ConvertFrom-Json
foreach ($field in @("slug", "tenantId", "clientId", "vaultUrl", "certName", "environment", "capabilityPacks")) {
    if (-not $profile.$field) {
        throw "Tenant profile is missing required field '$field'."
    }
}
if ($profile.environment -ne "client") {
    throw "validate-client-tenant.ps1 only validates environment='client' profiles."
}

$packs = @($profile.capabilityPacks)
if ($packs -contains "internal-full") {
    throw "internal-full cannot be used for a client tenant profile."
}
if (($packs | Where-Object { $_ -ne "baseline-read" }).Count -gt 0 -and -not $profile.consent.evidenceRef) {
    throw "consent.evidenceRef is required for client profiles with packs beyond baseline-read."
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

$checks = @(
    [ordered]@{ name = "profile-shape"; status = "pass" }
    [ordered]@{ name = "client-pack-policy"; status = "pass" }
    [ordered]@{ name = "consent-evidence"; status = "pass" }
    [ordered]@{ name = "capability-manifests"; status = "pass" }
)

if (-not $DryRun) {
    $account = Invoke-AzJson -Arguments @("account", "show", "-o", "json")
    if ($account.tenantId -ne $profile.tenantId) {
        throw "The active az tenant '$($account.tenantId)' does not match profile tenant '$($profile.tenantId)'."
    }
    $checks += [ordered]@{ name = "az-tenant-context"; status = "pass" }

    Invoke-AzJson -Arguments @("ad", "app", "show", "--id", $profile.clientId, "-o", "json") | Out-Null
    $checks += [ordered]@{ name = "app-registration"; status = "pass" }

    $spList = Invoke-AzJson -Arguments @("ad", "sp", "list", "--filter", "appId eq '$($profile.clientId)'", "-o", "json")
    if (@($spList).Count -eq 0) {
        throw "No service principal exists for clientId '$($profile.clientId)'."
    }
    $checks += [ordered]@{ name = "service-principal"; status = "pass" }

    $vaultName = Get-KeyVaultName -Url $profile.vaultUrl
    Invoke-AzJson -Arguments @("keyvault", "certificate", "show", "--vault-name", $vaultName, "--name", $profile.certName, "-o", "json") | Out-Null
    $checks += [ordered]@{ name = "key-vault-certificate"; status = "pass" }

    Test-GraphPermissionResolution `
        -DelegatedPermissions $graphDelegatedPermissions `
        -ApplicationPermissions $graphApplicationPermissions
    $checks += [ordered]@{ name = "graph-permission-resolution"; status = "pass" }
}

[ordered]@{
    ok = $true
    slug = $profile.slug
    checkedPacks = $packs
    requiredResources = $resources
    prerequisites = $prerequisites
    liveChecksSkipped = [bool]$DryRun
    checks = $checks
} | ConvertTo-Json -Depth 8
