<#
.SYNOPSIS
  Updates the app registration's required permissions AND manually creates the app role
  assignments + delegated permission grants. More reliable than `az ad app permission
  admin-consent` for large permission sets.

.NOTES
  Idempotent. Uses Microsoft Graph REST directly.
#>
[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)][string]$AppId,
    [Parameter(Mandatory = $true)][string]$AppObjectId,
    [Parameter(Mandatory = $true)][string]$SpObjectId,
    [string]$PermsFile   = (Join-Path $PSScriptRoot "..\config\permissions.json")
)
$ErrorActionPreference = "Stop"

function Write-Step { param($Msg) Write-Host "`n==> $Msg" -ForegroundColor Cyan }
function Write-OK   { param($Msg) Write-Host "   OK $Msg" -ForegroundColor Green }
function Write-Warn { param($Msg) Write-Host "   !! $Msg" -ForegroundColor Yellow }

Write-Step "Resolve Graph SP + all permission GUIDs"
$graphSp = az ad sp show --id "00000003-0000-0000-c000-000000000000" -o json | ConvertFrom-Json
$graphSpId = $graphSp.id
$scopeMap = @{}; foreach ($s in $graphSp.oauth2PermissionScopes) { $scopeMap[$s.value] = $s.id }
$roleMap  = @{}; foreach ($r in $graphSp.appRoles)               { $roleMap[$r.value]  = $r.id }

$perms = Get-Content $PermsFile -Raw | ConvertFrom-Json
$delegated = @($perms.graph.delegated)
$application = @($perms.graph.application)

$resolvedScopes = @()
$resolvedRoles = @()
$unknown = @()
foreach ($n in $delegated)   { if ($scopeMap.ContainsKey($n)) { $resolvedScopes += @{ name=$n; id=$scopeMap[$n] } } else { $unknown += "delegated:$n" } }
foreach ($n in $application) { if ($roleMap.ContainsKey($n))  { $resolvedRoles  += @{ name=$n; id=$roleMap[$n] } }  else { $unknown += "application:$n" } }
if ($unknown.Count -gt 0) { Write-Warn "Unresolved: $($unknown -join ', ')"; throw "Fix permission names and retry" }
Write-OK "Resolved $($resolvedScopes.Count) delegated scopes + $($resolvedRoles.Count) app roles"

Write-Step "Update app registration requiredResourceAccess"
$resourceAccess = @()
foreach ($s in $resolvedScopes) { $resourceAccess += @{ id = $s.id; type = "Scope" } }
foreach ($r in $resolvedRoles)  { $resourceAccess += @{ id = $r.id; type = "Role" } }
$rra = @(@{ resourceAppId = $graphSp.appId; resourceAccess = $resourceAccess })
$rraFile = [System.IO.Path]::GetTempFileName()
($rra | ConvertTo-Json -Depth 6) | Set-Content -Path $rraFile
az ad app update --id $AppId --required-resource-accesses "@$rraFile" | Out-Null
Remove-Item $rraFile
Write-OK "App updated"

Write-Step "Grant app-role (application) permissions via appRoleAssignments"
$existing = az rest --method GET --uri "https://graph.microsoft.com/v1.0/servicePrincipals/$SpObjectId/appRoleAssignments" -o json | ConvertFrom-Json
$existingRoleIds = @{}
foreach ($e in $existing.value) { $existingRoleIds[$e.appRoleId] = $true }

$grantedCount = 0; $skippedCount = 0; $failed = @()
foreach ($r in $resolvedRoles) {
    if ($existingRoleIds.ContainsKey($r.id)) { $skippedCount++; continue }
    $body = @{ principalId = $SpObjectId; resourceId = $graphSpId; appRoleId = $r.id } | ConvertTo-Json
    $bodyFile = [System.IO.Path]::GetTempFileName()
    $body | Set-Content -Path $bodyFile -Encoding UTF8
    $result = az rest --method POST --uri "https://graph.microsoft.com/v1.0/servicePrincipals/$SpObjectId/appRoleAssignments" --headers "Content-Type=application/json" --body "@$bodyFile" 2>&1
    Remove-Item $bodyFile
    if ($LASTEXITCODE -eq 0) { $grantedCount++ } else { $failed += "$($r.name): $result" }
}
Write-OK "Granted $grantedCount new app roles ($skippedCount already existed)"
if ($failed.Count -gt 0) { Write-Warn "Failed ($($failed.Count)):"; $failed | ForEach-Object { Write-Warn "  $_" } }

Write-Step "Grant delegated permissions via oauth2PermissionGrant (tenant-wide)"
$scopeString = ($resolvedScopes | ForEach-Object { $_.name }) -join ' '
$existingGrants = az rest --method GET --uri "https://graph.microsoft.com/v1.0/oauth2PermissionGrants?`$filter=clientId eq '$SpObjectId'" -o json | ConvertFrom-Json
$existingGrant = $existingGrants.value | Where-Object { $_.resourceId -eq $graphSpId -and $_.consentType -eq "AllPrincipals" } | Select-Object -First 1

if ($existingGrant) {
    $bodyObj = @{ scope = $scopeString }
    $bodyFile = [System.IO.Path]::GetTempFileName()
    ($bodyObj | ConvertTo-Json) | Set-Content -Path $bodyFile -Encoding UTF8
    az rest --method PATCH --uri "https://graph.microsoft.com/v1.0/oauth2PermissionGrants/$($existingGrant.id)" --headers "Content-Type=application/json" --body "@$bodyFile" | Out-Null
    Remove-Item $bodyFile
    Write-OK "Updated existing delegated grant with $($resolvedScopes.Count) scopes"
} else {
    $bodyObj = @{
        clientId    = $SpObjectId
        consentType = "AllPrincipals"
        resourceId  = $graphSpId
        scope       = $scopeString
    }
    $bodyFile = [System.IO.Path]::GetTempFileName()
    ($bodyObj | ConvertTo-Json) | Set-Content -Path $bodyFile -Encoding UTF8
    az rest --method POST --uri "https://graph.microsoft.com/v1.0/oauth2PermissionGrants" --headers "Content-Type=application/json" --body "@$bodyFile" | Out-Null
    Remove-Item $bodyFile
    Write-OK "Created new delegated grant with $($resolvedScopes.Count) scopes"
}

Write-Step "Summary"
Write-Host "   App roles assigned: $grantedCount new + $skippedCount existing = $($grantedCount + $skippedCount) total" -ForegroundColor Green
Write-Host "   Delegated scopes:   $($resolvedScopes.Count)" -ForegroundColor Green
