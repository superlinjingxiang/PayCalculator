$ErrorActionPreference='Stop'
$analyticsMutex=[Threading.Mutex]::new($false,('Local\PayToolsAnalytics-'+[Security.Principal.WindowsIdentity]::GetCurrent().User.Value))
$analyticsLockOwned=$false
try {
try { $analyticsLockOwned=$analyticsMutex.WaitOne(0) } catch [Threading.AbandonedMutexException] { $analyticsLockOwned=$true }
if (-not $analyticsLockOwned) { throw 'Another analytics access operation is active.' }
$analyticsRoot=Join-Path $env:LOCALAPPDATA 'PayToolsAnalytics'
$analyticsPidFile=Join-Path $analyticsRoot 'tunnel.pid'
if (-not (Test-Path -LiteralPath $analyticsPidFile)) { Write-Output 'ANALYTICS_TUNNEL=already-closed'; return }
$analyticsProcessId=0
if (-not [int]::TryParse((Get-Content -LiteralPath $analyticsPidFile -Raw).Trim(),[ref]$analyticsProcessId) -or $analyticsProcessId -le 0) { throw 'Invalid owned tunnel PID.' }
$analyticsProcess=Get-CimInstance Win32_Process -Filter ('ProcessId='+$analyticsProcessId)
if (-not $analyticsProcess) { Remove-Item -LiteralPath $analyticsPidFile; Write-Output 'ANALYTICS_TUNNEL=already-closed'; return }
$analyticsSsh=(Get-Command ssh.exe -ErrorAction Stop).Source
$analyticsConfig=Join-Path $analyticsRoot 'analytics-ssh.config'
if ($analyticsProcess.ExecutablePath -ne $analyticsSsh -or -not $analyticsProcess.CommandLine.Contains($analyticsConfig)) { throw 'PID is not this analytics SSH tunnel; no process was stopped.' }
& taskkill.exe /PID $analyticsProcessId /T /F | Out-Null
if ($LASTEXITCODE -ne 0) { throw 'Owned tunnel shutdown failed.' }
Remove-Item -LiteralPath $analyticsPidFile
Write-Output 'ANALYTICS_TUNNEL=closed; only verified helper process tree stopped'
} finally {
    if ($analyticsLockOwned) { $analyticsMutex.ReleaseMutex() }
    $analyticsMutex.Dispose()
}
