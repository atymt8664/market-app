# Polls until bootstrap SSH key works, then runs foundation + verify. No secrets.
$ErrorActionPreference = "Stop"
$HostIP = "178.105.206.173"
$Root = $PSScriptRoot
$Key = Join-Path $Root ".ssh-bootstrap\hetzner-bootstrap-ed25519"
$Log = Join-Path $Root "bootstrap-run.log"

function Write-Log($msg) {
  $line = "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] $msg"
  Add-Content -Path $Log -Value $line
  Write-Host $line
}

"" | Set-Content $Log
Write-Log "Waiting for SSH (bootstrap key)..."

$connected = $false
for ($i = 1; $i -le 120; $i++) {
  $prev = $ErrorActionPreference
  $ErrorActionPreference = "SilentlyContinue"
  & ssh -i $Key -o BatchMode=yes -o ConnectTimeout=8 -o StrictHostKeyChecking=accept-new `
    "root@${HostIP}" "echo READY" 2>$null | Out-Null
  $ErrorActionPreference = $prev
  if ($LASTEXITCODE -eq 0) { $connected = $true; Write-Log "SSH ready on attempt $i"; break }
  if ($i % 4 -eq 0) { Write-Log "Still waiting... attempt $i/120" }
  Start-Sleep -Seconds 15
}

if (-not $connected) {
  Write-Log "FAILED: SSH not available with bootstrap key."
  exit 2
}

Write-Log "Copying bootstrap-foundation.sh..."
& scp -i $Key -o BatchMode=yes -o StrictHostKeyChecking=accept-new `
  (Join-Path $Root "bootstrap-foundation.sh") "root@${HostIP}:/root/bootstrap-foundation.sh"
if ($LASTEXITCODE -ne 0) { Write-Log "SCP failed"; exit 3 }

Write-Log "Running bootstrap (10-15 min)..."
& ssh -i $Key -o StrictHostKeyChecking=accept-new "root@${HostIP}" `
  "chmod +x /root/bootstrap-foundation.sh && /root/bootstrap-foundation.sh" 2>&1 | Tee-Object -FilePath $Log -Append
if ($LASTEXITCODE -ne 0) { Write-Log "Bootstrap failed exit $LASTEXITCODE"; exit 4 }

Write-Log "Running verify-foundation.sh..."
& scp -i $Key -o BatchMode=yes -o StrictHostKeyChecking=accept-new `
  (Join-Path $Root "verify-foundation.sh") "root@${HostIP}:/root/verify-foundation.sh"
& ssh -i $Key -o StrictHostKeyChecking=accept-new "root@${HostIP}" "bash /root/verify-foundation.sh" 2>&1 | Tee-Object -FilePath $Log -Append

Write-Log "COMPLETE"
exit 0
