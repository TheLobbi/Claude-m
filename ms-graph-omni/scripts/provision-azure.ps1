<#
.SYNOPSIS
  Provisions the ms-graph-omni Entra app + certificate + Key Vault + admin consent.

.DESCRIPTION
  Creates the Entra app registration `Lobbi-Cowork-Graph`, generates a self-signed cert
  in Azure Key Vault (private key never leaves the vault), uploads the public key to the
  app registration, resolves permission names to GUIDs dynamically from the Graph service
  principal, and grants admin consent. Also assigns `Key Vault Certificate User` to the
  app's service principal + the current user.

  Idempotent: safe to re-run. Will update an existing app if one with the same name exists.

.EXAMPLE
  pwsh -File scripts/provision-azure.ps1

.NOTES
  Requires: az cli, az login, Global Admin (or Application Admin + Cloud App Admin).
#>
[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)][string]$AppName,
    [Parameter(Mandatory = $true)][string]$VaultName,
    [Parameter(Mandatory = $true)][string]$CertName,
    [string]$PermissionsFile = (Join-Path $PSScriptRoot "..\config\permissions.json")
)

$ErrorActionPreference = "Stop"
$InformationPreference = "Continue"

function Write-Step { param($Msg) Write-Host "`n==> $Msg" -ForegroundColor Cyan }
function Write-OK   { param($Msg) Write-Host "   OK $Msg" -ForegroundColor Green }
function Write-Info { param($Msg) Write-Host "   -- $Msg" -ForegroundColor Gray }

# -----------------------------------------------------------------------------
Write-Step "Load context"
$account = az account show -o json | ConvertFrom-Json
$tenantId = $account.tenantId
$subId = $account.id
$me = $account.user.name
Write-Info "Tenant:       $tenantId"
Write-Info "Subscription: $subId"
Write-Info "User:         $me"

# -----------------------------------------------------------------------------
Write-Step "Load permission names"
$perms = Get-Content $PermissionsFile -Raw | ConvertFrom-Json
$delegatedNames = @($perms.graph.delegated)
$appNames = @($perms.graph.application)
Write-Info "Delegated: $($delegatedNames.Count), Application: $($appNames.Count)"

# -----------------------------------------------------------------------------
Write-Step "Resolve Graph SP + permission GUIDs"
$graphSp = az ad sp show --id "00000003-0000-0000-c000-000000000000" -o json | ConvertFrom-Json
$graphAppId = $graphSp.appId
$oauth2Scopes = @{}
foreach ($s in $graphSp.oauth2PermissionScopes) { $oauth2Scopes[$s.value] = $s.id }
$appRoles = @{}
foreach ($r in $graphSp.appRoles) { $appRoles[$r.value] = $r.id }

$resourceAccess = @()
$unresolved = @()
foreach ($n in $delegatedNames) {
    if ($oauth2Scopes.ContainsKey($n)) {
        $resourceAccess += @{ id = $oauth2Scopes[$n]; type = "Scope" }
    } else { $unresolved += "delegated:$n" }
}
foreach ($n in $appNames) {
    if ($appRoles.ContainsKey($n)) {
        $resourceAccess += @{ id = $appRoles[$n]; type = "Role" }
    } else { $unresolved += "application:$n" }
}
if ($unresolved.Count -gt 0) {
    Write-Host "   !! Unresolved permissions: $($unresolved -join ', ')" -ForegroundColor Yellow
    throw "Fix permission names in $PermissionsFile and retry"
}
Write-OK "Resolved $($resourceAccess.Count) permissions"

$requiredResourceAccess = @(@{
    resourceAppId = $graphAppId
    resourceAccess = $resourceAccess
})
$rrTempFile = [System.IO.Path]::GetTempFileName()
($requiredResourceAccess | ConvertTo-Json -Depth 5) | Set-Content -Path $rrTempFile

# -----------------------------------------------------------------------------
Write-Step "Create or update app registration: $AppName"
$existing = az ad app list --display-name $AppName -o json | ConvertFrom-Json
if ($existing.Count -eq 0) {
    $app = az ad app create `
        --display-name $AppName `
        --sign-in-audience AzureADMyOrg `
        --required-resource-accesses "@$rrTempFile" `
        --public-client-redirect-uris "http://localhost" `
        -o json | ConvertFrom-Json
    Write-OK "Created app $($app.appId)"
} else {
    $app = $existing[0]
    az ad app update `
        --id $app.appId `
        --required-resource-accesses "@$rrTempFile" `
        --public-client-redirect-uris "http://localhost" | Out-Null
    Write-OK "Updated existing app $($app.appId)"
}
$appId = $app.appId
$appObjectId = $app.id
Remove-Item $rrTempFile -Force

# Enable public client flows (for interactive delegated auth)
az ad app update --id $appId --set publicClient.redirectUris='["http://localhost"]' isFallbackPublicClient=true | Out-Null

# -----------------------------------------------------------------------------
Write-Step "Ensure service principal"
$sp = az ad sp list --filter "appId eq '$appId'" -o json | ConvertFrom-Json
if ($sp.Count -eq 0) {
    $sp = az ad sp create --id $appId -o json | ConvertFrom-Json
    Write-OK "Created SP $($sp.id)"
} else {
    $sp = $sp[0]
    Write-OK "SP exists $($sp.id)"
}
$spObjectId = $sp.id

# -----------------------------------------------------------------------------
Write-Step "Certificate in Key Vault: $CertName"
$existingCert = az keyvault certificate show --vault-name $VaultName --name $CertName -o json 2>$null | ConvertFrom-Json
if (-not $existingCert) {
    $policy = az keyvault certificate get-default-policy -o json
    $policyPath = [System.IO.Path]::GetTempFileName()
    $policy | Set-Content -Path $policyPath
    az keyvault certificate create --vault-name $VaultName --name $CertName --policy "@$policyPath" | Out-Null
    Remove-Item $policyPath
    do {
        Start-Sleep -Seconds 2
        $status = az keyvault certificate show --vault-name $VaultName --name $CertName --query "attributes.enabled" -o tsv 2>$null
    } until ($status -eq "true")
    Write-OK "Cert created"
} else {
    Write-OK "Cert exists"
}

# -----------------------------------------------------------------------------
Write-Step "Upload public key to app registration"
$cerPath = Join-Path $env:TEMP "$CertName.cer"
az keyvault certificate download --vault-name $VaultName --name $CertName --file $cerPath --encoding PEM | Out-Null

# Read cert as base64 and post to app
$certContent = Get-Content $cerPath -Raw
# Strip PEM headers / base64-decode
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
} | ConvertTo-Json -Depth 5

$kcFile = [System.IO.Path]::GetTempFileName()
$keyCredentialsBody | Set-Content -Path $kcFile
az rest --method PATCH `
    --uri "https://graph.microsoft.com/v1.0/applications/$appObjectId" `
    --headers "Content-Type=application/json" `
    --body "@$kcFile" | Out-Null
Remove-Item $kcFile
Remove-Item $cerPath
Write-OK "Public key uploaded"

# -----------------------------------------------------------------------------
Write-Step "Grant admin consent"
az ad app permission admin-consent --id $appId | Out-Null
Write-OK "Admin consent granted"

# -----------------------------------------------------------------------------
Write-Step "Key Vault RBAC"
$kvId = az keyvault show --name $VaultName --query id -o tsv
$myObjectId = az ad signed-in-user show --query id -o tsv

foreach ($assignment in @(
    @{ principal = $spObjectId;  ptype = "ServicePrincipal"; who = "SP ($appId)" }
    @{ principal = $myObjectId;  ptype = "User";             who = "Me ($me)" }
)) {
    $exists = az role assignment list --assignee-object-id $assignment.principal --scope $kvId --query "[?roleDefinitionName=='Key Vault Certificate User']" -o json 2>$null | ConvertFrom-Json
    if ($exists.Count -eq 0) {
        az role assignment create `
            --role "Key Vault Certificate User" `
            --assignee-object-id $assignment.principal `
            --assignee-principal-type $assignment.ptype `
            --scope $kvId | Out-Null
        Write-OK "Granted Key Vault Certificate User to $($assignment.who)"
    } else {
        Write-Info "Already has Key Vault Certificate User: $($assignment.who)"
    }

    $existsSecret = az role assignment list --assignee-object-id $assignment.principal --scope $kvId --query "[?roleDefinitionName=='Key Vault Secrets User']" -o json 2>$null | ConvertFrom-Json
    if ($existsSecret.Count -eq 0) {
        az role assignment create `
            --role "Key Vault Secrets User" `
            --assignee-object-id $assignment.principal `
            --assignee-principal-type $assignment.ptype `
            --scope $kvId | Out-Null
        Write-OK "Granted Key Vault Secrets User to $($assignment.who)"
    } else {
        Write-Info "Already has Key Vault Secrets User: $($assignment.who)"
    }
}

# -----------------------------------------------------------------------------
Write-Step "Write runtime config"
$runtimeFile = Join-Path $PSScriptRoot "..\config\runtime.json"
$runtime = @{
    tenantId = $tenantId
    clientId = $appId
    appObjectId = $appObjectId
    spObjectId = $spObjectId
    vaultUrl = "https://$VaultName.vault.azure.net/"
    certName = $CertName
    createdAt = (Get-Date).ToString("o")
} | ConvertTo-Json -Depth 5
$runtime | Set-Content -Path $runtimeFile -Encoding UTF8
Write-OK "Wrote $runtimeFile"

# -----------------------------------------------------------------------------
Write-Host ""
Write-Host "========================================================" -ForegroundColor Green
Write-Host "   Provisioning complete" -ForegroundColor Green
Write-Host "========================================================" -ForegroundColor Green
Write-Host "   App name:    $AppName"
Write-Host "   Client ID:   $appId"
Write-Host "   Tenant ID:   $tenantId"
Write-Host "   Key Vault:   $VaultName / $CertName"
Write-Host ""
Write-Host "Update .mcp.json env block with:" -ForegroundColor Yellow
Write-Host "   MSGO_CLIENT_ID = $appId"
Write-Host ""
