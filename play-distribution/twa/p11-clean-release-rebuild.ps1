# P11 — Clean release rebuild (no bubblewrap build; gradlew clean + resource sync + sign if env set).
param(
  [switch]$BuildOnly
)
$ErrorActionPreference = "Stop"
$playDist = Split-Path $PSScriptRoot -Parent
$twa = Join-Path $PSScriptRoot "souq-twa-android"

if (-not (Test-Path $twa)) { throw "Expected TWA folder: $twa" }

if (-not $env:ANDROID_HOME) {
  $env:ANDROID_HOME = Join-Path $env:LOCALAPPDATA "Android\Sdk"
}
if (-not $env:JAVA_HOME) {
  $j = Get-Command java -ErrorAction SilentlyContinue
  if ($j) { $env:JAVA_HOME = (Split-Path (Split-Path $j.Source -Parent) -Parent) }
}

Write-Host "=== P11 Clean Release Rebuild ==="

$signedApkOut = Join-Path $twa "app-release-signed.apk"
$signedAabOut = Join-Path $twa "app-release-bundle.aab"
$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
foreach ($old in @($signedApkOut, $signedAabOut, "$signedApkOut.idsig")) {
  if (Test-Path $old) {
    $bak = "$old.pre-clean-$stamp.bak"
    Move-Item $old $bak -Force
    Write-Host "Archived stale artifact: $bak"
  }
}

Write-Host "1/6 Sync embedded manifest from production SSOT..."
Set-Location $playDist
node scripts/sync-twa-embedded-manifest.mjs
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "2/6 Render approved Girl native splash drawables..."
node scripts/render-twa-native-splash-drawables.mjs
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "3/6 Render unified SA circle launcher icons..."
node scripts/render-sa-circle-icon-unified.mjs
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "4/6 Gradle clean + assembleRelease + bundleRelease..."
Set-Location $twa
.\gradlew.bat clean assembleRelease bundleRelease
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "5/6 Verify native splash in Gradle outputs..."
Set-Location $playDist
node scripts/verify-twa-native-splash-in-artifacts.mjs
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

if ($BuildOnly) {
  Write-Host "BuildOnly: unsigned APK/AAB ready; signing handled by release-android.ps1"
  exit 0
}

$ks = Join-Path $twa "android.keystore"
$unsignedApk = Join-Path $twa "app\build\outputs\apk\release\app-release-unsigned.apk"
$releaseAab = Join-Path $twa "app\build\outputs\bundle\release\app-release.aab"

if (-not (Test-Path $ks)) {
  Write-Host "WARN: android.keystore missing — unsigned artifacts only."
} elseif (-not $env:BUBBLEWRAP_KEYSTORE_PASSWORD -or -not $env:BUBBLEWRAP_KEY_PASSWORD) {
  Write-Host "WARN: BUBBLEWRAP_KEYSTORE_PASSWORD / BUBBLEWRAP_KEY_PASSWORD not set — skipping sign step."
  Write-Host "      Set env vars and re-run signing from bubblewrap-build-secure.ps1 or sign manually."
} else {
  Write-Host "6/6 Signing release APK/AAB with upload keystore..."
  $buildToolsDir = Get-ChildItem (Join-Path $env:ANDROID_HOME "build-tools") |
    Sort-Object Name -Descending |
    Select-Object -First 1
  if (-not $buildToolsDir) { throw "Android build-tools not found under ANDROID_HOME" }
  $apksigner = Join-Path $buildToolsDir.FullName "apksigner.bat"
  $jarsigner = Join-Path $env:JAVA_HOME "bin\jarsigner.exe"

  & $apksigner sign --min-sdk-version 21 --ks $ks --ks-key-alias souqarab-upload `
    --ks-pass env:BUBBLEWRAP_KEYSTORE_PASSWORD --key-pass env:BUBBLEWRAP_KEY_PASSWORD `
    --out $signedApkOut $unsignedApk
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

  Copy-Item $releaseAab $signedAabOut -Force
  & $jarsigner -sigalg SHA256withRSA -digestalg SHA-256 `
    -keystore $ks -storepass:env BUBBLEWRAP_KEYSTORE_PASSWORD -keypass:env BUBBLEWRAP_KEY_PASSWORD `
    $signedAabOut souqarab-upload
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

  & $apksigner verify --print-certs $signedApkOut | Out-Host
  & $jarsigner -verify -verbose $signedAabOut | Select-Object -First 5 | Out-Host

  Remove-Item Env:BUBBLEWRAP_KEYSTORE_PASSWORD -ErrorAction SilentlyContinue
  Remove-Item Env:BUBBLEWRAP_KEY_PASSWORD -ErrorAction SilentlyContinue
}

Write-Host "Running full P11 release validation..."
Set-Location $playDist
node scripts/validate-p11-release-artifacts.mjs
exit $LASTEXITCODE
