function Set-AnalyticsOwnerOnlyAcl([string]$Path) {
    $entry=Get-Item -LiteralPath $Path -Force
    if ($entry.Attributes -band [IO.FileAttributes]::ReparsePoint) { throw 'Analytics access paths must not be reparse points.' }
    $sid=[Security.Principal.WindowsIdentity]::GetCurrent().User
    $acl=Get-Acl -LiteralPath $Path
    $acl.SetAccessRuleProtection($true,$false)
    foreach ($oldRule in @($acl.GetAccessRules($true,$false,[Security.Principal.SecurityIdentifier]))) { $acl.RemoveAccessRuleSpecific($oldRule) }
    if ($entry.PSIsContainer) {
        $rule=[Security.AccessControl.FileSystemAccessRule]::new($sid,[Security.AccessControl.FileSystemRights]::FullControl,([Security.AccessControl.InheritanceFlags]::ContainerInherit -bor [Security.AccessControl.InheritanceFlags]::ObjectInherit),[Security.AccessControl.PropagationFlags]::None,[Security.AccessControl.AccessControlType]::Allow)
    } else {
        $rule=[Security.AccessControl.FileSystemAccessRule]::new($sid,[Security.AccessControl.FileSystemRights]::FullControl,[Security.AccessControl.AccessControlType]::Allow)
    }
    $acl.AddAccessRule($rule)
    # Persist only modified DACL sections; Set-Acl on Windows PowerShell may
    # request SACL privileges even though this operation changes no audit rules.
    if ($PSVersionTable.PSEdition -eq 'Desktop') { $entry.SetAccessControl($acl) }
    else { [IO.FileSystemAclExtensions]::SetAccessControl($entry,$acl) }
}

function Initialize-AnalyticsPrivateDirectory([string]$Path) {
    New-Item -ItemType Directory -Path $Path -Force | Out-Null
    Set-AnalyticsOwnerOnlyAcl $Path
    # Existing credential/config/log files must not retain explicit broad grants.
    Get-ChildItem -LiteralPath $Path -File -Force | ForEach-Object { Set-AnalyticsOwnerOnlyAcl $_.FullName }
    $logs=Join-Path $Path 'log'
    if (Test-Path -LiteralPath $logs) {
        Set-AnalyticsOwnerOnlyAcl $logs
        Get-ChildItem -LiteralPath $logs -File -Force | ForEach-Object { Set-AnalyticsOwnerOnlyAcl $_.FullName }
    }
}
