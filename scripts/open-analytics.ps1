param(
    [string]$ConnectionConfig = (Join-Path $PSScriptRoot '../release/analytics-connection.json'),
    [string]$CredentialProfile = (Join-Path $env:USERPROFILE '.workbench/config.json'),
    [string]$SshIdentity = (Join-Path $env:USERPROFILE '.ssh/id_rsa'),
    [ValidateRange(1024,65535)][int]$LocalPort = 18081
)
$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'analytics-local-access.ps1')
$analyticsMutex=[Threading.Mutex]::new($false,('Local\PayToolsAnalytics-'+[Security.Principal.WindowsIdentity]::GetCurrent().User.Value))
$analyticsLockOwned=$false
try {
try { $analyticsLockOwned=$analyticsMutex.WaitOne(0) } catch [Threading.AbandonedMutexException] { $analyticsLockOwned=$true }
if (-not $analyticsLockOwned) { throw 'Another analytics access operation is active.' }
$analyticsRoot = Join-Path $env:LOCALAPPDATA 'PayToolsAnalytics'
Initialize-AnalyticsPrivateDirectory $analyticsRoot
$analyticsCli = Join-Path $analyticsRoot 'ali-instance-cli.exe'
$analyticsSsh = (Get-Command ssh.exe -ErrorAction Stop).Source
$analyticsHostKeys = Join-Path $analyticsRoot 'analytics-known_hosts'
if (-not (Test-Path -LiteralPath $SshIdentity -PathType Leaf) -or -not (Test-Path -LiteralPath ($SshIdentity+'.pub') -PathType Leaf)) { throw 'An existing SSH identity and public key are required; this script never generates a key.' }
if (-not (Test-Path -LiteralPath $analyticsHostKeys -PathType Leaf)) { throw 'Retrieve the exact instance host public key through the existing trusted cloud channel first. Never disable host-key checking.' }
if (-not (Test-Path -LiteralPath $analyticsCli -PathType Leaf)) {
    throw 'Official ali-instance-cli is required. Install it from the Alibaba Cloud Session Manager documentation; do not use an unknown binary.'
}
if (-not (Test-Path -LiteralPath $ConnectionConfig -PathType Leaf)) {
    throw 'A local connection configuration is required. It contains the existing ECS instance/region, not new cloud credentials.'
}
$analyticsConnection = Get-Content -LiteralPath $ConnectionConfig -Raw | ConvertFrom-Json
if ($analyticsConnection.instanceId -notmatch '^i-[a-z0-9]+$' -or $analyticsConnection.region -notmatch '^[a-z0-9-]+$') {
    throw 'Invalid ECS connection metadata.'
}
$analyticsAddress = "http://127.0.0.1:$LocalPort"
$analyticsPidFile = Join-Path $analyticsRoot 'tunnel.pid'
$analyticsDedicatedConfig=Join-Path $analyticsRoot 'analytics-ssh.config'
if (Test-Path -LiteralPath $analyticsPidFile) {
    $analyticsRecordedId=0
    if (-not [int]::TryParse((Get-Content -LiteralPath $analyticsPidFile -Raw).Trim(),[ref]$analyticsRecordedId) -or $analyticsRecordedId -le 0) { throw 'Invalid tunnel state; inspect before opening another connection.' }
    $analyticsRecorded=Get-CimInstance Win32_Process -Filter ('ProcessId='+$analyticsRecordedId)
    if ($analyticsRecorded) {
        if ($analyticsRecorded.ExecutablePath -ne $analyticsSsh -or -not $analyticsRecorded.CommandLine.Contains($analyticsDedicatedConfig)) { throw 'Recorded PID belongs to another process; no tunnel state was overwritten.' }
        $analyticsOwnedListeners=@(Get-NetTCPConnection -OwningProcess $analyticsRecordedId -State Listen -ErrorAction SilentlyContinue)
        $analyticsExistingConfig=Get-Content -LiteralPath $analyticsDedicatedConfig -Raw
        if (@($analyticsOwnedListeners | Where-Object LocalPort -ne $LocalPort).Count -or $analyticsExistingConfig -notmatch ('(?m)^  HostName '+[regex]::Escape($analyticsConnection.instanceId)+'\r?$')) { throw 'Another analytics connection is already active. Close it before changing instance or local port.' }
    }
}
$analyticsExistingListener = @(Get-NetTCPConnection -LocalPort $LocalPort -State Listen -ErrorAction SilentlyContinue)
if ($analyticsExistingListener.Count) {
    if (Test-Path -LiteralPath $analyticsPidFile) {
        $analyticsExistingProcessId = [int](Get-Content -LiteralPath $analyticsPidFile -Raw).Trim()
        $analyticsExistingProcess = Get-Process -Id $analyticsExistingProcessId -ErrorAction SilentlyContinue
        if ($analyticsExistingProcess.Path -eq $analyticsSsh -and @($analyticsExistingListener | Where-Object OwningProcess -ne $analyticsExistingProcessId).Count -eq 0 -and @($analyticsExistingListener | Where-Object { -not [Net.IPAddress]::IsLoopback([Net.IPAddress]::Parse($_.LocalAddress)) }).Count -eq 0) {
            $analyticsHealth = Invoke-WebRequest -UseBasicParsing -Uri "$analyticsAddress/api/heartbeat" -TimeoutSec 5
            if ($analyticsHealth.StatusCode -eq 200) { Write-Output "DASHBOARD_URL=$analyticsAddress"; return }
        }
    }
    throw 'The requested local port is already used by another service. Choose a different -LocalPort.'
}
# Restrict only this credential/tool directory, not global Windows settings.
try {
    $analyticsOriginal = Get-Content -LiteralPath $CredentialProfile -Raw | ConvertFrom-Json
    $analyticsSource = $analyticsOriginal.profiles.($analyticsOriginal.current)
    if ($analyticsSource.mode -ne 'AK' -or -not $analyticsSource.access_key_id -or -not $analyticsSource.access_key_secret) { throw 'Unsupported existing profile.' }
} catch { throw 'Cannot read an existing AK profile. This script never creates new cloud credentials.' }
$analyticsPrivateConfig = Join-Path $analyticsRoot 'client-config.json'
$analyticsConfig = @{ current='paytools'; profiles=@(@{
    name='paytools'; mode='AK'; access_key_id=$analyticsSource.access_key_id; access_key_secret=$analyticsSource.access_key_secret;
    region_id=$analyticsConnection.region; output_format='json'; language='zh'
}) }
[IO.File]::WriteAllText($analyticsPrivateConfig,($analyticsConfig | ConvertTo-Json -Depth 5),[Text.UTF8Encoding]::new($false))
# The official direct portforward command binds all interfaces. OpenSSH owns the
# explicitly loopback-only listener; the official CLI supplies only stdio WSS.
# Register the existing public identity for the documented 60-second window.
# No new key pair, permanent authorized_keys entry, or security-group rule.
$analyticsKeyResult = (& $analyticsCli send_public_key --config-path $analyticsPrivateConfig --profile paytools --instance $analyticsConnection.instanceId --region $analyticsConnection.region --public-key ($SshIdentity+'.pub') --user-name root 2>&1 | Out-String)
if ($LASTEXITCODE -ne 0) { throw 'Temporary existing-key authentication failed. No tunnel was started.' }
$analyticsSshConfig = Join-Path $analyticsRoot 'analytics-ssh.config'
$analyticsAlias = 'paytools-analytics-'+$analyticsConnection.instanceId
foreach ($analyticsPath in @($analyticsCli,$analyticsPrivateConfig,$analyticsHostKeys,$SshIdentity)) {
    if ($analyticsPath.Contains('"') -or $analyticsPath.Contains("`r") -or $analyticsPath.Contains("`n")) { throw 'Unsupported quote or newline in local path.' }
}
$analyticsConfigText = @"
Host paytools-analytics
  HostName $($analyticsConnection.instanceId)
  User root
  Port 22
  BatchMode yes
  IdentitiesOnly yes
  IdentityAgent none
  ForwardAgent no
  GatewayPorts no
  IdentityFile "$($SshIdentity.Replace('\','/'))"
  UserKnownHostsFile "$($analyticsHostKeys.Replace('\','/'))"
  HostKeyAlias $analyticsAlias
  StrictHostKeyChecking yes
  ExitOnForwardFailure yes
  ServerAliveInterval 30
  ServerAliveCountMax 3
  LocalForward 127.0.0.1:$LocalPort 127.0.0.1:3001
  ProxyCommand "$($analyticsCli.Replace('\','/'))" ssh --config-path "$($analyticsPrivateConfig.Replace('\','/'))" --profile paytools --instance %h --region $($analyticsConnection.region) --port %p
"@
[IO.File]::WriteAllText($analyticsSshConfig,$analyticsConfigText,[Text.UTF8Encoding]::new($false))
$analyticsArguments = @('-F',$analyticsSshConfig,'-N','-T','paytools-analytics')
$analyticsQuotedArguments = ($analyticsArguments | ForEach-Object { '"' + $_ + '"' }) -join ' '
$analyticsProcess = Start-Process -FilePath $analyticsSsh -ArgumentList $analyticsQuotedArguments -WindowStyle Hidden -PassThru `
    -RedirectStandardOutput (Join-Path $analyticsRoot 'tunnel.log') -RedirectStandardError (Join-Path $analyticsRoot 'tunnel-error.log')
$analyticsReady = $false
for ($analyticsAttempt=0; $analyticsAttempt -lt 60; $analyticsAttempt++) {
    if ($analyticsProcess.HasExited) { break }
    $analyticsListeners = @(Get-NetTCPConnection -OwningProcess $analyticsProcess.Id -State Listen -ErrorAction SilentlyContinue)
    if (@($analyticsListeners | Where-Object { -not [Net.IPAddress]::IsLoopback([Net.IPAddress]::Parse($_.LocalAddress)) }).Count) {
        Stop-Process -Id $analyticsProcess.Id
        throw 'The official client exposed a non-loopback listener; it was stopped. Do not open firewall ports as a workaround.'
    }
    if ($analyticsListeners.Count) {
        try {
            $analyticsHealth = Invoke-WebRequest -UseBasicParsing -Uri "$analyticsAddress/api/heartbeat" -TimeoutSec 2
            if ($analyticsHealth.StatusCode -eq 200) { $analyticsReady=$true; break }
        } catch { }
    }
    Start-Sleep -Milliseconds 500
}
if (-not $analyticsReady) {
    if (-not $analyticsProcess.HasExited) { Stop-Process -Id $analyticsProcess.Id }
    throw 'The private SSH/WSS tunnel is not ready. Confirm Session Manager, existing-key access, and the trusted host key. Private diagnostic logs are in LOCALAPPDATA/PayToolsAnalytics; do not publish them.'
}
[IO.File]::WriteAllText($analyticsPidFile,[string]$analyticsProcess.Id)
Write-Output "DASHBOARD_URL=$analyticsAddress"
Write-Output ('LOGIN_INFO=' + (Join-Path $analyticsRoot 'umami-login.json'))
Write-Output ('TUNNEL_PID=' + $analyticsProcess.Id)
} finally {
    if ($analyticsLockOwned) { $analyticsMutex.ReleaseMutex() }
    $analyticsMutex.Dispose()
}
