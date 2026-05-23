# SSH only: upload and run fix-deploy-ssh.sh on VPS. No app/infrastructure changes.
$ErrorActionPreference = "Stop"
$HostIP = "178.105.206.173"
$Root = $PSScriptRoot
$Script = Join-Path $Root "fix-deploy-ssh.sh"
$Log = Join-Path $Root "fix-deploy-ssh-run.log"

function Log($m) {
  $line = "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] $m"
  Add-Content -Path $Log -Value $line
  Write-Host $line
}

"" | Set-Content $Log
$keys = @(
  "$env:USERPROFILE\.ssh\id_ed25519",
  "C:\ssh-souq\id_ed25519",
  (Join-Path $Root ".ssh-bootstrap\hetzner-bootstrap-ed25519")
) | Where-Object { Test-Path $_ }

$users = @("root", "deploy")
$connected = $false
$sshUser = $null
$userArgs = @()

foreach ($u in $users) {
  foreach ($k in $keys) {
    Log "Try $u with key $(Split-Path $k -Leaf)"
    $prev = $ErrorActionPreference
    $ErrorActionPreference = "SilentlyContinue"
    & ssh -o BatchMode=yes -o ConnectTimeout=15 -o StrictHostKeyChecking=accept-new `
      -i $k -o IdentitiesOnly=yes -o IdentityAgent=none "${u}@${HostIP}" "echo OK" 2>$null | Out-Null
    $ErrorActionPreference = $prev
    if ($LASTEXITCODE -eq 0) {
      $connected = $true
      $sshUser = $u
      $userArgs = @("-i", $k, "-o", "IdentitiesOnly=yes", "-o", "IdentityAgent=none")
      break
    }
  }
  if ($connected) { break }
}

if (-not $connected) {
  Log "SSH failed from this environment. Run fix-deploy-ssh.sh as root on the server (Hetzner Console)."
  exit 2
}

Log "Connected as $sshUser"
& scp -o BatchMode=yes -o StrictHostKeyChecking=accept-new @userArgs `
  $Script "${sshUser}@${HostIP}:/tmp/fix-deploy-ssh.sh"
if ($LASTEXITCODE -ne 0) { Log "SCP failed"; exit 3 }

$output = & ssh -o BatchMode=yes -o StrictHostKeyChecking=accept-new @userArgs `
  "${sshUser}@${HostIP}" "sudo bash /tmp/fix-deploy-ssh.sh" 2>&1
$output | ForEach-Object { Log $_ }

Log "Test deploy login..."
$deployTest = & ssh -o BatchMode=yes -o ConnectTimeout=15 -o StrictHostKeyChecking=accept-new `
  -i "$env:USERPROFILE\.ssh\id_ed25519" -o IdentitiesOnly=yes -o IdentityAgent=none `
  "deploy@${HostIP}" "whoami; hostname" 2>&1
$deployTest | ForEach-Object { Log $_ }
exit $LASTEXITCODE
