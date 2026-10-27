param(
    [string]$ConnectionConfig = (Join-Path $PSScriptRoot '../release/analytics-connection.json'),
    [string]$CredentialProfile = (Join-Path $env:USERPROFILE '.workbench/config.json'),
    [ValidateRange(1024,65535)][int]$LocalPort = 18081
)
$ErrorActionPreference = 'Stop'
$analyticsRoot = Join-Path $env:LOCALAPPDATA 'PayToolsAnalytics'
$analyticsCli = Join-Path $analyticsRoot 'ali-instance-cli.exe'
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
$analyticsExistingListener = @(Get-NetTCPConnection -LocalPort $LocalPort -State Listen -ErrorAction SilentlyContinue)
if ($analyticsExistingListener.Count) {
    if (Test-Path -LiteralPath $analyticsPidFile) {
        $analyticsExistingProcessId = [int](Get-Content -LiteralPath $analyticsPidFile -Raw).Trim()
        $analyticsExistingProcess = Get-Process -Id $analyticsExistingProcessId -ErrorAction SilentlyContinue
        if ($analyticsExistingProcess.Path -eq $analyticsCli -and @($analyticsExistingListener | Where-Object OwningProcess -ne $analyticsExistingProcessId).Count -eq 0 -and @($analyticsExistingListener | Where-Object { -not [Net.IPAddress]::IsLoopback([Net.IPAddress]::Parse($_.LocalAddress)) }).Count -eq 0) {
            $analyticsHealth = Invoke-WebRequest -Uri "$analyticsAddress/api/heartbeat" -TimeoutSec 5
            if ($analyticsHealth.StatusCode -eq 200) { Write-Output "DASHBOARD_URL=$analyticsAddress"; return }
        }
    }
    throw 'The requested local port is already used by another service. Choose a different -LocalPort.'
}
# Restrict only this credential/tool directory, not global Windows settings.
$analyticsSid = [Security.Principal.WindowsIdentity]::GetCurrent().User.Value
& icacls.exe $analyticsRoot /grant:r ('*'+$analyticsSid+':(OI)(CI)F') | Out-Null
if ($LASTEXITCODE -ne 0) { throw 'Cannot restrict the local analytics directory.' }
& icacls.exe $analyticsRoot /inheritance:r | Out-Null
if ($LASTEXITCODE -ne 0) { throw 'Cannot remove inherited access to the local analytics directory.' }
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
$analyticsArguments = @('portforward','--config-path',$analyticsPrivateConfig,'--profile','paytools','--instance',$analyticsConnection.instanceId,'--region',$analyticsConnection.region,'--remote-port','127.0.0.1:3001','--local-port',"$LocalPort")
$analyticsQuotedArguments = ($analyticsArguments | ForEach-Object { '"' + $_ + '"' }) -join ' '
$analyticsProcess = Start-Process -FilePath $analyticsCli -ArgumentList $analyticsQuotedArguments -WindowStyle Hidden -PassThru `
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
            $analyticsHealth = Invoke-WebRequest -Uri "$analyticsAddress/api/heartbeat" -TimeoutSec 2
            if ($analyticsHealth.StatusCode -eq 200) { $analyticsReady=$true; break }
        } catch { }
    }
    Start-Sleep -Milliseconds 500
}
if (-not $analyticsReady) {
    if (-not $analyticsProcess.HasExited) { Stop-Process -Id $analyticsProcess.Id }
    throw 'The private tunnel is not ready. Confirm Session Manager is enabled in the ECS console and the existing account has StartTerminalSession permission. Private diagnostic logs are in LOCALAPPDATA/PayToolsAnalytics; do not publish them.'
}
[IO.File]::WriteAllText($analyticsPidFile,[string]$analyticsProcess.Id)
Write-Output "DASHBOARD_URL=$analyticsAddress"
Write-Output ('LOGIN_INFO=' + (Join-Path $analyticsRoot 'umami-login.json'))
Write-Output ('TUNNEL_PID=' + $analyticsProcess.Id)
