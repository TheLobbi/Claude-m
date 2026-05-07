<#
.SYNOPSIS
  Grants the Lobbi-Cowork-Graph app permission to act as one or more users for
  Online Meetings, Transcripts, Recordings, and Virtual Events APIs.

.DESCRIPTION
  Microsoft Graph's app-only permissions for OnlineMeetings.* and
  OnlineMeetingTranscript.* require an additional ApplicationAccessPolicy beyond
  admin consent. Without it, calls return:

      403 Forbidden — "No application access policy found for this app"

  This script:
    1. Connects to Microsoft Teams PowerShell (Skype for Business module is deprecated)
    2. Creates (or updates) an ApplicationAccessPolicy that lists the AppId
    3. Grants the policy to each named user (or to the whole tenant if -GrantToTenant)

  Propagation can take up to 30 minutes after the grant — Graph calls will keep
  returning 403 until then.

.PARAMETER AppId
  The application (client) ID of the Lobbi-Cowork-Graph Entra app.
  Default reads from .mcp.json env (MSGO_CLIENT_ID).

.PARAMETER UserPrincipalNames
  Email/UPN of each user the app should be allowed to act as.
  Mutually exclusive with -GrantToTenant.

.PARAMETER GrantToTenant
  Grant the policy to the whole tenant (any user). Use with care.

.PARAMETER PolicyName
  Name of the policy. Default: "Lobbi-Cowork-Graph-MeetingAccess".

.PARAMETER WhatIf
  Print what would happen without making changes.

.EXAMPLE
  # Grant the app permission to act as one or more named users
  ./scripts/grant-meeting-access-policy.ps1 `
    -AppId <app-guid> `
    -UserPrincipalNames "alice@example.com","bob@example.com"

.EXAMPLE
  # Grant tenant-wide (every user)
  ./scripts/grant-meeting-access-policy.ps1 -GrantToTenant

.NOTES
  - Run as a Microsoft 365 Global Administrator or Teams Administrator.
  - Requires the MicrosoftTeams PowerShell module:
        Install-Module MicrosoftTeams -Scope CurrentUser
  - Source: https://learn.microsoft.com/graph/cloud-communication-online-meeting-application-access-policy
#>

[CmdletBinding(SupportsShouldProcess = $true)]
param(
    [Parameter(Mandatory = $true)][string]$AppId,
    [string[]]$UserPrincipalNames,
    [switch]$GrantToTenant,
    [string]$PolicyName = "MsGraphOmni-MeetingAccess"
)

$ErrorActionPreference = "Stop"

if (-not $UserPrincipalNames -and -not $GrantToTenant) {
    throw "Provide -UserPrincipalNames <upn[]> or -GrantToTenant."
}
if ($UserPrincipalNames -and $GrantToTenant) {
    throw "-UserPrincipalNames and -GrantToTenant are mutually exclusive."
}

# --- Ensure module ---------------------------------------------------------
if (-not (Get-Module -ListAvailable -Name MicrosoftTeams)) {
    Write-Host "Installing MicrosoftTeams module (current user scope)..." -ForegroundColor Yellow
    Install-Module MicrosoftTeams -Scope CurrentUser -Force -AllowClobber
}
Import-Module MicrosoftTeams -ErrorAction Stop

# --- Connect ---------------------------------------------------------------
Write-Host "Connecting to Microsoft Teams (browser sign-in expected)..." -ForegroundColor Cyan
Connect-MicrosoftTeams | Out-Null

# --- Create or update policy ----------------------------------------------
$existing = Get-CsApplicationAccessPolicy -Identity $PolicyName -ErrorAction SilentlyContinue
if ($null -eq $existing) {
    if ($PSCmdlet.ShouldProcess($PolicyName, "New-CsApplicationAccessPolicy")) {
        Write-Host "Creating ApplicationAccessPolicy '$PolicyName' with AppId $AppId..." -ForegroundColor Cyan
        New-CsApplicationAccessPolicy `
            -Identity $PolicyName `
            -AppIds @($AppId) `
            -Description "Allows Lobbi-Cowork-Graph MCP server to act on behalf of users for OnlineMeetings + Transcripts + Recordings APIs." | Out-Null
    }
} else {
    $currentApps = @($existing.AppIds)
    if ($currentApps -notcontains $AppId) {
        $newApps = $currentApps + $AppId
        if ($PSCmdlet.ShouldProcess($PolicyName, "Set-CsApplicationAccessPolicy add AppId $AppId")) {
            Write-Host "Adding $AppId to existing policy '$PolicyName'..." -ForegroundColor Cyan
            Set-CsApplicationAccessPolicy -Identity $PolicyName -AppIds $newApps | Out-Null
        }
    } else {
        Write-Host "Policy '$PolicyName' already contains $AppId — no change needed." -ForegroundColor Green
    }
}

# --- Grant to users / tenant ----------------------------------------------
if ($GrantToTenant) {
    if ($PSCmdlet.ShouldProcess("(tenant)", "Grant-CsApplicationAccessPolicy -Global")) {
        Write-Host "Granting policy '$PolicyName' tenant-wide..." -ForegroundColor Cyan
        Grant-CsApplicationAccessPolicy -PolicyName $PolicyName -Global
    }
} else {
    foreach ($upn in $UserPrincipalNames) {
        if ($PSCmdlet.ShouldProcess($upn, "Grant-CsApplicationAccessPolicy")) {
            Write-Host "Granting policy '$PolicyName' to $upn..." -ForegroundColor Cyan
            Grant-CsApplicationAccessPolicy -PolicyName $PolicyName -Identity $upn
        }
    }
}

Write-Host ""
Write-Host "Done. Note: changes can take up to 30 minutes to propagate." -ForegroundColor Yellow
Write-Host "Verify with:  Get-CsApplicationAccessPolicy -Identity $PolicyName" -ForegroundColor Yellow
Write-Host "Verify user assignment with:  Get-CsUserPolicyAssignment -Identity <upn> -PolicyType ApplicationAccessPolicy" -ForegroundColor Yellow
