# Run on YOUR PC where: ssh root@178.105.206.173  works (your Hetzner key).
# Adds the Cursor bootstrap public key so the agent can connect next.
$ErrorActionPreference = "Stop"
$HostIP = "178.105.206.173"
$PubFile = Join-Path $PSScriptRoot ".ssh-bootstrap\hetzner-bootstrap-ed25519.pub"
if (-not (Test-Path $PubFile)) { throw "Missing $PubFile" }
$pub = (Get-Content $PubFile -Raw).Trim()
$cmd = @"
mkdir -p /root/.ssh && chmod 700 /root/.ssh
grep -qF '$pub' /root/.ssh/authorized_keys 2>/dev/null || echo '$pub' >> /root/.ssh/authorized_keys
chmod 600 /root/.ssh/authorized_keys
echo bootstrap_key_installed
"@
ssh -o StrictHostKeyChecking=accept-new "root@${HostIP}" $cmd
Write-Host "Done. Cursor agent can now use the bootstrap private key."
