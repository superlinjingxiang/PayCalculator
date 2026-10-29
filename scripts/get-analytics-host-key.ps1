param(
    [string]$CloudCommandHelper=(Join-Path $PSScriptRoot '../release/cloud-command.ps1'),
    [string]$ConnectionConfig=(Join-Path $PSScriptRoot '../release/analytics-connection.json')
)
$ErrorActionPreference='Stop'
. (Join-Path $PSScriptRoot 'analytics-local-access.ps1')
if (-not (Test-Path -LiteralPath $CloudCommandHelper -PathType Leaf)) { throw 'Existing authenticated cloud-assistant helper required.' }
$analyticsConnection=Get-Content -LiteralPath $ConnectionConfig -Raw | ConvertFrom-Json
if ($analyticsConnection.instanceId -notmatch '^i-[a-z0-9]+$' -or $analyticsConnection.region -notmatch '^[a-z0-9-]+$') { throw 'Invalid expected instance metadata.' }
$analyticsRoot=Join-Path $env:LOCALAPPDATA 'PayToolsAnalytics'
Initialize-AnalyticsPrivateDirectory $analyticsRoot
$analyticsCommandFile=Join-Path $analyticsRoot 'get-host-key.sh'
$analyticsCommand=@'
#!/usr/bin/env bash
set -eu
printf 'HOSTKEY_BEGIN\n'
cat /etc/ssh/ssh_host_ed25519_key.pub
printf '\nHOSTKEY_END\n'
'@
[IO.File]::WriteAllText($analyticsCommandFile,$analyticsCommand.Replace("`r`n","`n")+"`n",[Text.UTF8Encoding]::new($false))
$analyticsResult=(& $CloudCommandHelper -CommandFile $analyticsCommandFile -WaitSeconds 30 | Out-String)
if ($analyticsResult -notmatch 'STATUS=Success EXIT_CODE=0') { throw 'Trusted instance host-key retrieval failed.' }
if ($analyticsResult -notmatch ('(?m)^EXECUTED_INSTANCE_ID='+[regex]::Escape($analyticsConnection.instanceId)+'\r?$') -or $analyticsResult -notmatch ('(?m)^EXECUTED_REGION='+[regex]::Escape($analyticsConnection.region)+'\r?$')) { throw 'Cloud helper executed on a different or unverified instance/region. Trust was not changed.' }
$analyticsMatch=[regex]::Match($analyticsResult,'(?s)HOSTKEY_BEGIN\s*(ssh-ed25519 [A-Za-z0-9+/=]+)[^\r\n]*\s*HOSTKEY_END')
if (-not $analyticsMatch.Success) { throw 'Missing trusted host public key.' }
$analyticsAlias='paytools-analytics-'+$analyticsConnection.instanceId
$analyticsHostKeys=Join-Path $analyticsRoot 'analytics-known_hosts'
# An existing trust record must be reviewed on a host-key change, never overwritten.
$analyticsExpected=$analyticsAlias+' '+$analyticsMatch.Groups[1].Value
if (Test-Path -LiteralPath $analyticsHostKeys) {
    if ((Get-Content -LiteralPath $analyticsHostKeys -Raw).Trim() -ne $analyticsExpected) { throw 'Existing trusted host key differs. Verify the expected instance before replacing it.' }
} else {
    [IO.File]::WriteAllText($analyticsHostKeys,$analyticsExpected+"`n",[Text.UTF8Encoding]::new($false))
}
Write-Output 'TRUSTED_HOST_KEY=verified through existing authenticated cloud channel'
