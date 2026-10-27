param(
    [string]$CloudCommandHelper = (Join-Path $PSScriptRoot '../release/cloud-command.ps1'),
    [string]$OutputDirectory = (Join-Path $PSScriptRoot '../release/pv-reports'),
    [string]$Python = 'python'
)
$ErrorActionPreference = 'Stop'
# The helper must be an existing, authenticated cloud-assistant entry point.
# This script contains no credentials and never retrieves raw logs or form data.
if (-not (Test-Path -LiteralPath $CloudCommandHelper -PathType Leaf)) {
    throw 'Existing cloud command helper required. Pass -CloudCommandHelper; do not create new credentials.'
}
$outputRoot = [IO.Path]::GetFullPath($OutputDirectory)
$publicRoots = @('../out', '../public') | ForEach-Object { [IO.Path]::GetFullPath((Join-Path $PSScriptRoot $_)) }
foreach ($publicRoot in $publicRoots) {
    if ($outputRoot.Equals($publicRoot, [StringComparison]::OrdinalIgnoreCase) -or $outputRoot.StartsWith($publicRoot + [IO.Path]::DirectorySeparatorChar, [StringComparison]::OrdinalIgnoreCase)) {
        throw 'Reports must remain outside out/ and public/.'
    }
}
New-Item -ItemType Directory -Path $outputRoot -Force | Out-Null
$commandFile = Join-Path $outputRoot 'get-summary.sh'
$command = @'
#!/bin/sh
set -eu
echo PV_REPORT_BEGIN
/usr/bin/python3 /usr/local/lib/paytools/pv-report.py --log-dir /var/log/paytools/pv --state /var/lib/paytools/pv/state.json --collection-start-file /var/lib/paytools/pv/collection-start --environment preview --stdout-json
echo PV_REPORT_END
'@
[IO.File]::WriteAllText($commandFile, $command.Replace("`r`n", "`n") + "`n", [Text.UTF8Encoding]::new($false))
$result = (& $CloudCommandHelper -CommandFile $commandFile -WaitSeconds 30 | Out-String)
if ($result -notmatch 'STATUS=Success EXIT_CODE=0') { throw 'Cloud summary command failed; no report was created.' }
$match = [regex]::Match($result, '(?s)PV_REPORT_BEGIN\s*(\{.*?\})\s*PV_REPORT_END')
if (-not $match.Success) { throw 'Missing or truncated cloud summary. No report was created.' }
$json = $match.Groups[1].Value
$data = $json | ConvertFrom-Json
if ($data.timezone -ne 'Asia/Shanghai' -or $null -eq $data.windows) { throw 'Invalid report schema.' }
$stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$jsonPath = Join-Path $outputRoot "pv-$stamp.json"
$htmlPath = Join-Path $outputRoot "pv-$stamp.html"
[IO.File]::WriteAllText($jsonPath, $json, [Text.UTF8Encoding]::new($false))
& $Python (Join-Path $PSScriptRoot 'pv-report.py') --input-json $jsonPath --output-html $htmlPath
if ($LASTEXITCODE -ne 0) { throw 'Local HTML rendering failed. The retrieved JSON is preserved.' }
Write-Output "JSON: $jsonPath"
Write-Output "HTML: $htmlPath"
