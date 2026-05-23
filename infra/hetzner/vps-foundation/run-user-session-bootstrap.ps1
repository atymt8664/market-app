# Runs in interactive user session: fix authorized_keys on VPS via default SSH, then foundation bootstrap.
$ErrorActionPreference = "Stop"
$Root = $PSScriptRoot
$HostIP = "178.105.206.173"
$PubFile = Join-Path $Root ".ssh-bootstrap\hetzner-bootstrap-ed25519.pub"
$Log = Join-Path $Root "user-session-bootstrap.log"

function Log($m) {
  $line = "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] $m"
  Add-Content -Path $Log -Value $line
}

"" | Set-Content $Log
Log "Starting user-session bootstrap helper"

$pub = (Get-Content $PubFile -Raw).Trim()
$fixCmd = @"
set -e
mkdir -p /root/.ssh && chmod 700 /root/.ssh
printf '%s\n' '$pub' > /root/.ssh/authorized_keys
chmod 600 /root/.ssh/authorized_keys
sed -i 's/\r$//' /root/.ssh/authorized_keys
echo fixed_authorized_keys
"@

Log "SSH fix authorized_keys (default identity)"
ssh -o BatchMode=yes -o ConnectTimeout=15 -o StrictHostKeyChecking=accept-new "root@${HostIP}" $fixCmd 2>&1 | ForEach-Object { Log $_ }
if ($LASTEXITCODE -ne 0) {
  Log "Default SSH failed exit $LASTEXITCODE"
  exit 10
}

Log "Default SSH OK - running invoke-vps-bootstrap.ps1"
& (Join-Path $Root "invoke-vps-bootstrap.ps1") 2>&1 | ForEach-Object { Log "$_" }
exit $LASTEXITCODE
