# VPS foundation bootstrap — uses bootstrap key only (no default identity guessing).
$ErrorActionPreference = "Stop"
$HostIP = "178.105.206.173"
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$Bootstrap = Join-Path $Root "bootstrap-foundation.sh"
$Verify = Join-Path $Root "verify-foundation.sh"
$BootstrapKey = Join-Path $Root ".ssh-bootstrap\hetzner-bootstrap-ed25519"

if (-not (Test-Path $BootstrapKey)) {
  Write-Error "Missing bootstrap private key: $BootstrapKey"
}

# Short path without spaces for OpenSSH on Windows
$KeyLink = "C:\ssh-souq\id_ed25519"
$KeyDir = Split-Path $KeyLink
if (-not (Test-Path $KeyDir)) { New-Item -ItemType Directory -Force -Path $KeyDir | Out-Null }
if (-not (Test-Path $KeyLink)) {
  Copy-Item -Force $BootstrapKey $KeyLink
  icacls $KeyLink /inheritance:r /grant:r "${env:USERNAME}:(R)" | Out-Null
}

$sshBase = @(
  "-i", "C:/ssh-souq/id_ed25519",
  "-o", "IdentitiesOnly=yes",
  "-o", "IdentityAgent=none",
  "-o", "BatchMode=yes",
  "-o", "ConnectTimeout=20",
  "-o", "StrictHostKeyChecking=accept-new"
)

function Test-BootstrapSsh {
  $prev = $ErrorActionPreference
  $ErrorActionPreference = "SilentlyContinue"
  & ssh @sshBase "root@${HostIP}" "echo ok" 2>$null | Out-Null
  $ok = $LASTEXITCODE -eq 0
  $ErrorActionPreference = $prev
  return $ok
}

if (-not (Test-BootstrapSsh)) {
  Write-Error "Cannot SSH to root@${HostIP} with bootstrap key."
}

Write-Host "Bootstrap SSH OK. Copying script..."
& scp @sshBase $Bootstrap "root@${HostIP}:/root/bootstrap-foundation.sh"
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "Running foundation bootstrap (10-15 min)..."
& ssh @sshBase "root@${HostIP}" "chmod +x /root/bootstrap-foundation.sh && /root/bootstrap-foundation.sh"
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "Verification:"
& scp @sshBase $Verify "root@${HostIP}:/root/verify-foundation.sh"
& ssh @sshBase "root@${HostIP}" "bash /root/verify-foundation.sh"

Write-Host "Done. Prefer: ssh deploy@${HostIP}"
