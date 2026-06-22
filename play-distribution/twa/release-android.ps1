# P11 — One-command Android release pipeline: clean rebuild (if needed) + sign + validate.
# No Play upload. Passwords requested only inside sign-and-validate-release.ps1.
param(
  [switch]$Rebuild
)

$ErrorActionPreference = "Stop"

function Find-RepoRoot {
  param([string[]]$Starts)
  foreach ($start in $Starts) {
    if (-not $start) { continue }
    $dir = (Resolve-Path -LiteralPath $start).Path
    while ($dir) {
      $marker = Join-Path $dir "docs\PROJECT_CONSTITUTION.md"
      if (Test-Path -LiteralPath $marker) { return $dir }
      $parent = Split-Path $dir -Parent
      if (-not $parent -or $parent -eq $dir) { break }
      $dir = $parent
    }
  }
  throw "Could not locate repo root (docs/PROJECT_CONSTITUTION.md)."
}

function Fail-Release {
  param([string]$Reason, [string[]]$Details = @())
  Write-Host ""
  Write-Host "========================================"
  Write-Host "NOT READY FOR CLOSED TESTING"
  Write-Host "Reason: $Reason"
  foreach ($d in $Details) { Write-Host "  - $d" }
  Write-Host "========================================"
  exit 1
}

$RepoRoot = Find-RepoRoot -Starts @($PSScriptRoot, (Get-Location).Path)
$PlayDist = Join-Path $RepoRoot "play-distribution"
$TwaRoot = Join-Path $PlayDist "twa\souq-twa-android"
$UnsignedApk = Join-Path $TwaRoot "app\build\outputs\apk\release\app-release-unsigned.apk"
$UnsignedAab = Join-Path $TwaRoot "app\build\outputs\bundle\release\app-release.aab"
$CleanScript = Join-Path $PlayDist "twa\p11-clean-release-rebuild.ps1"
$SignScript = Join-Path $PlayDist "twa\sign-and-validate-release.ps1"

Write-Host "=== P11 Android Release Pipeline ==="
Write-Host "RepoRoot: $RepoRoot"

$needsBuild = $Rebuild -or -not (Test-Path -LiteralPath $UnsignedApk) -or -not (Test-Path -LiteralPath $UnsignedAab)

if ($needsBuild) {
  if (-not (Test-Path -LiteralPath $CleanScript)) {
    Fail-Release -Reason "Missing clean rebuild script" -Details @($CleanScript)
  }
  Write-Host "Running clean rebuild (unsigned APK/AAB)..."
  Write-Host "NOTE: rebuild step skips signing; passwords are requested next."
  & powershell -NoProfile -ExecutionPolicy Bypass -File $CleanScript -BuildOnly
  if ($LASTEXITCODE -ne 0) {
    Fail-Release -Reason "Clean rebuild failed" -Details @("See output above")
  }
  if (-not (Test-Path -LiteralPath $UnsignedApk) -or -not (Test-Path -LiteralPath $UnsignedAab)) {
    Fail-Release -Reason "Clean rebuild did not produce unsigned artifacts" -Details @($UnsignedApk, $UnsignedAab)
  }
} else {
  Write-Host "Reusing existing unsigned artifacts (use -Rebuild to force clean rebuild):"
  Get-Item $UnsignedApk, $UnsignedAab | ForEach-Object {
    Write-Host ("  {0} | {1} bytes | {2}" -f $_.Name, $_.Length, $_.LastWriteTime.ToString("yyyy-MM-dd HH:mm:ss"))
  }
}

Write-Host ""
Write-Host "Running sign + validate..."
& powershell -NoProfile -ExecutionPolicy Bypass -File $SignScript
exit $LASTEXITCODE
