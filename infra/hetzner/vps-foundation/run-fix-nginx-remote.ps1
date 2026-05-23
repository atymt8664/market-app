# Phase 1 VPS only: upload and run fix-nginx-foundation.sh via SSH.
$ErrorActionPreference = "Stop"
$HostIP = "178.105.206.173"
$Root = $PSScriptRoot
$Script = Join-Path $Root "fix-nginx-foundation.sh"
$Log = Join-Path $Root "fix-nginx-run.log"
$Key = Join-Path $Root ".ssh-bootstrap\hetzner-bootstrap-ed25519"

function Write-Log($m) {
  $line = "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] $m"
  Add-Content -Path $Log -Value $line
  Write-Host $line
}

"" | Set-Content $Log

$sshOpts = @(
  "-o", "BatchMode=yes",
  "-o", "ConnectTimeout=20",
  "-o", "StrictHostKeyChecking=accept-new"
)

function Invoke-SshTest($user, $extra) {
  $target = "${user}@${HostIP}"
  & ssh @sshOpts @extra $target "echo OK" 2>$null | Out-Null
  return $LASTEXITCODE -eq 0
}

$targetUser = $null
$userArgs = @()
foreach ($u in @("deploy", "root")) {
  if (Invoke-SshTest $u @()) { $targetUser = $u; break }
  if (Test-Path $Key) {
    if (Invoke-SshTest $u @("-i", $Key, "-o", "IdentitiesOnly=yes", "-o", "IdentityAgent=none")) {
      $targetUser = $u
      $userArgs = @("-i", $Key, "-o", "IdentitiesOnly=yes", "-o", "IdentityAgent=none")
      break
    }
  }
}

if (-not $targetUser) {
  Write-Log "SSH failed for deploy and root"
  exit 2
}

Write-Log "Using SSH user: $targetUser"
$remote = "${targetUser}@${HostIP}"

Write-Log "Uploading fix script..."
& scp @sshOpts @userArgs $Script "${remote}:/tmp/fix-nginx-foundation.sh"
if ($LASTEXITCODE -ne 0) { Write-Log "SCP failed"; exit 3 }

Write-Log "Running fix script..."
$output = & ssh @sshOpts @userArgs $remote "sudo bash /tmp/fix-nginx-foundation.sh" 2>&1
$output | ForEach-Object { Write-Log $_ }
Write-Log "Exit: $LASTEXITCODE"
exit $LASTEXITCODE
