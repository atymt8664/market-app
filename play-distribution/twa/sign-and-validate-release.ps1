# P11 — Sign existing clean-release artifacts + full validation (no Play upload).
# Passwords: Read-Host -AsSecureString only; never printed or saved.
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

function Normalize-Sha256 {
  param([string]$Value)
  if (-not $Value) { return "" }
  return ($Value -replace '[^0-9A-Fa-f]', '').ToUpper()
}

function Format-Sha256Colon {
  param([string]$Normalized)
  if ($Normalized.Length -ne 64) { return $Normalized }
  $parts = for ($i = 0; $i -lt 64; $i += 2) { $Normalized.Substring($i, 2) }
  return ($parts -join ':')
}

function Clear-SigningEnv {
  Remove-Item Env:BUBBLEWRAP_KEYSTORE_PASSWORD -ErrorAction SilentlyContinue
  Remove-Item Env:BUBBLEWRAP_KEY_PASSWORD -ErrorAction SilentlyContinue
}

function Read-SigningPasswords {
  Write-Host "Enter keystore password (input hidden):"
  $ssKs = Read-Host -AsSecureString
  Write-Host "Enter key password (often same as keystore; input hidden):"
  $ssKey = Read-Host -AsSecureString
  $BSTR_KS = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($ssKs)
  $BSTR_KEY = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($ssKey)
  try {
    $env:BUBBLEWRAP_KEYSTORE_PASSWORD = [Runtime.InteropServices.Marshal]::PtrToStringAuto($BSTR_KS)
    $env:BUBBLEWRAP_KEY_PASSWORD = [Runtime.InteropServices.Marshal]::PtrToStringAuto($BSTR_KEY)
  } finally {
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($BSTR_KS)
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($BSTR_KEY)
  }
}

function Fail-Release {
  param([string]$Reason, [string[]]$Details = @())
  Clear-SigningEnv
  Write-Host ""
  Write-Host "========================================"
  Write-Host "NOT READY FOR CLOSED TESTING"
  Write-Host "Reason: $Reason"
  foreach ($d in $Details) { Write-Host "  - $d" }
  Write-Host "========================================"
  exit 1
}

function Pass-Release {
  param([hashtable]$Summary)
  Clear-SigningEnv
  Write-Host ""
  Write-Host "========================================"
  Write-Host "READY FOR CLOSED TESTING"
  Write-Host "========================================"
  Write-Host ("packageName: {0}" -f $Summary.packageName)
  Write-Host ("versionCode: {0}" -f $Summary.versionCode)
  Write-Host ("versionName: {0}" -f $Summary.versionName)
  Write-Host ("signedApk: {0}" -f $Summary.signedApk)
  Write-Host ("signedAab: {0}" -f $Summary.signedAab)
  Write-Host ("signedApkFingerprint: {0}" -f $Summary.signedApkFingerprint)
  Write-Host ("uploadKeyExpected: {0}" -f $Summary.uploadKeyExpected)
  Write-Host ("appSigningKeyForTwa: {0}" -f $Summary.appSigningKeyForTwa)
  exit 0
}

function Invoke-External {
  param([string]$Label, [string]$Exe, [string[]]$CmdArgs)
  $output = & $Exe @CmdArgs 2>&1
  $code = $LASTEXITCODE
  $text = ($output | Out-String).Trim()
  if ($code -ne 0) {
    Fail-Release -Reason $Label -Details @(
      "exit_code=$code",
      "command=$Exe $($CmdArgs -join ' ')",
      $(if ($text) { "output=$text" } else { "output=(empty)" })
    )
  }
  return $text
}

# --- Resolve paths ---
$RepoRoot = Find-RepoRoot -Starts @($PSScriptRoot, (Get-Location).Path)
$PlayDist = Join-Path $RepoRoot "play-distribution"
$ConfigPath = Join-Path $PlayDist "release-signing.config.json"
if (-not (Test-Path -LiteralPath $ConfigPath)) {
  Fail-Release -Reason "Missing release-signing.config.json" -Details @($ConfigPath)
}
$Config = Get-Content -LiteralPath $ConfigPath -Raw | ConvertFrom-Json

$TwaRoot = Join-Path $RepoRoot ($Config.keystore.path | Split-Path -Parent)
$Keystore = Join-Path $RepoRoot $Config.keystore.path
$ExpectedAlias = $Config.keystore.alias
$UploadKeyNorm = Normalize-Sha256 $Config.certificates.uploadKeySha256
$AppSigningNorm = Normalize-Sha256 $Config.certificates.appSigningKeySha256
$UploadKeyColon = Format-Sha256Colon $UploadKeyNorm
$AppSigningColon = Format-Sha256Colon $AppSigningNorm

$UnsignedApk = Join-Path $TwaRoot "app\build\outputs\apk\release\app-release-unsigned.apk"
$UnsignedAab = Join-Path $TwaRoot "app\build\outputs\bundle\release\app-release.aab"
$SignedApk = Join-Path $TwaRoot "app-release-signed.apk"
$SignedAab = Join-Path $TwaRoot "app-release-bundle.aab"
$ValidateScript = Join-Path $PlayDist "scripts\validate-p11-release-artifacts.mjs"
$SplashVerifyScript = Join-Path $PlayDist "scripts\verify-twa-native-splash-in-artifacts.mjs"

Write-Host "=== P11 Sign and Validate Release ==="
Write-Host "RepoRoot: $RepoRoot"
Write-Host "Config:   $ConfigPath"
Write-Host ""
Write-Host "Signing SSOT (non-secret):"
Write-Host "  Upload key (local APK/AAB before Play): $UploadKeyColon"
Write-Host "  App signing key (Play-delivered / TWA assetlinks): $AppSigningColon"

# --- Toolchain ---
if (-not $env:ANDROID_HOME) { $env:ANDROID_HOME = Join-Path $env:LOCALAPPDATA "Android\Sdk" }
if (-not $env:JAVA_HOME) {
  $j = Get-Command java -ErrorAction SilentlyContinue
  if ($j) { $env:JAVA_HOME = (Split-Path (Split-Path $j.Source -Parent) -Parent) }
}
if (-not (Test-Path -LiteralPath $env:ANDROID_HOME)) {
  Fail-Release -Reason "ANDROID_HOME not found" -Details @($env:ANDROID_HOME)
}
if (-not $env:JAVA_HOME -or -not (Test-Path -LiteralPath $env:JAVA_HOME)) {
  Fail-Release -Reason "JAVA_HOME not found" -Details @("Set JAVA_HOME to JDK 17+")
}

$BuildToolsDir = Get-ChildItem (Join-Path $env:ANDROID_HOME "build-tools") |
  Sort-Object Name -Descending | Select-Object -First 1
if (-not $BuildToolsDir) {
  Fail-Release -Reason "Android build-tools not found" -Details @($env:ANDROID_HOME)
}

$Apksigner = Join-Path $BuildToolsDir.FullName "apksigner.bat"
$Aapt2 = Join-Path $BuildToolsDir.FullName "aapt2.exe"
$Keytool = Join-Path $env:JAVA_HOME "bin\keytool.exe"
$Jarsigner = Join-Path $env:JAVA_HOME "bin\jarsigner.exe"
foreach ($tool in @($Apksigner, $Aapt2, $Keytool, $Jarsigner)) {
  if (-not (Test-Path -LiteralPath $tool)) {
    Fail-Release -Reason "Missing signing tool" -Details @($tool)
  }
}

foreach ($p in @($Keystore, $UnsignedApk, $UnsignedAab, $ValidateScript, $SplashVerifyScript)) {
  if (-not (Test-Path -LiteralPath $p)) {
    Fail-Release -Reason "Missing required file" -Details @(
      $p,
      "Run: release-android.ps1 (includes clean rebuild when unsigned artifacts are missing)"
    )
  }
}

Write-Host ""
Write-Host "Preflight OK:"
Get-Item $UnsignedApk, $UnsignedAab, $Keystore | ForEach-Object {
  Write-Host ("  {0} | {1} bytes | {2}" -f $_.Name, $_.Length, $_.LastWriteTime.ToString("yyyy-MM-dd HH:mm:ss"))
}

Read-SigningPasswords

try {
  $aliasCheck = & $Keytool -list -keystore $Keystore -alias $ExpectedAlias `
    -storepass:env BUBBLEWRAP_KEYSTORE_PASSWORD 2>&1
  if ($LASTEXITCODE -ne 0) {
    $msg = ($aliasCheck | Out-String).Trim()
    if ($msg -match "password was incorrect|keystore password was incorrect") {
      Fail-Release -Reason "Keystore password incorrect" -Details @("keytool rejected store password")
    }
    if ($msg -match "Alias .* does not exist") {
      Fail-Release -Reason "Keystore alias wrong" -Details @("Expected alias: $ExpectedAlias", $msg)
    }
    Fail-Release -Reason "Keystore preflight failed" -Details @($msg)
  }
} catch {
  Fail-Release -Reason "Keystore preflight failed" -Details @($_.Exception.Message)
}
Write-Host "Keystore preflight OK (alias: $ExpectedAlias)"

$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
foreach ($old in @($SignedApk, $SignedAab, "$SignedApk.idsig")) {
  if (Test-Path -LiteralPath $old) {
    $bak = "$old.pre-sign-$stamp.bak"
    Move-Item -LiteralPath $old -Destination $bak -Force
    Write-Host "Archived previous: $bak"
  }
}

Write-Host "Signing APK (upload key)..."
try {
  $apkSignOut = & $Apksigner sign --min-sdk-version 21 `
    --ks $Keystore --ks-key-alias $ExpectedAlias `
    --ks-pass env:BUBBLEWRAP_KEYSTORE_PASSWORD `
    --key-pass env:BUBBLEWRAP_KEY_PASSWORD `
    --out $SignedApk $UnsignedApk 2>&1
  if ($LASTEXITCODE -ne 0) {
    $msg = ($apkSignOut | Out-String).Trim()
    if ($msg -match "password") {
      Fail-Release -Reason "APK signing failed - password issue" -Details @($msg)
    }
    Fail-Release -Reason "APK signing failed (apksigner sign)" -Details @($msg)
  }
} catch {
  Fail-Release -Reason "APK signing failed (apksigner sign)" -Details @($_.Exception.Message)
}
if (-not (Test-Path -LiteralPath $SignedApk)) {
  Fail-Release -Reason "Signed APK not created" -Details @($SignedApk)
}

Write-Host "Verifying signed APK (apksigner verify)..."
$apkVerifyOut = Invoke-External -Label "APK apksigner verify failed" -Exe $Apksigner -CmdArgs @(
  "verify", "--print-certs", $SignedApk
)
$certMatch = [regex]::Match($apkVerifyOut, "Signer #1 certificate SHA-256 digest:\s*([0-9A-Fa-f:]+)", "IgnoreCase")
if (-not $certMatch.Success) {
  Fail-Release -Reason "APK signing verify failed - no certificate digest" -Details @($apkVerifyOut)
}
$apkCertNorm = Normalize-Sha256 $certMatch.Groups[1].Value
$apkCertColon = Format-Sha256Colon $apkCertNorm

Write-Host "  Signed APK fingerprint: $apkCertColon"
Write-Host "  Expected upload key:    $UploadKeyColon"
Write-Host "  App signing key (TWA):  $AppSigningColon"

if ($apkCertNorm -eq $AppSigningNorm -and $apkCertNorm -ne $UploadKeyNorm) {
  Fail-Release -Reason "Wrong key type for local release signing" -Details @(
    "APK is signed with Play app signing key, not upload key.",
    "Use android.keystore upload key (alias $ExpectedAlias) for Closed Testing upload."
  )
}
if ($apkCertNorm -ne $UploadKeyNorm) {
  Fail-Release -Reason "APK certificate fingerprint mismatch (real mismatch)" -Details @(
    "signed=$apkCertColon",
    "expected_upload_key=$UploadKeyColon",
    "This is NOT a format bug; keystore/cert does not match release-signing.config.json"
  )
}
Write-Host "APK signing OK (matches upload key in release-signing.config.json)"

Write-Host "Signing AAB (upload key)..."
Copy-Item -LiteralPath $UnsignedAab -Destination $SignedAab -Force
try {
  $aabSignOut = & $Jarsigner -sigalg SHA256withRSA -digestalg SHA-256 `
    -keystore $Keystore -storepass:env BUBBLEWRAP_KEYSTORE_PASSWORD `
    -keypass:env BUBBLEWRAP_KEY_PASSWORD `
    $SignedAab $ExpectedAlias 2>&1
  if ($LASTEXITCODE -ne 0) {
    $msg = ($aabSignOut | Out-String).Trim()
    Remove-Item -LiteralPath $SignedAab -Force -ErrorAction SilentlyContinue
    Fail-Release -Reason "AAB signing failed (jarsigner sign)" -Details @($msg)
  }
} catch {
  Remove-Item -LiteralPath $SignedAab -Force -ErrorAction SilentlyContinue
  Fail-Release -Reason "AAB signing failed (jarsigner sign)" -Details @($_.Exception.Message)
}

Write-Host "Verifying signed AAB (jarsigner verify)..."
[void](Invoke-External -Label "AAB jarsigner verify failed" -Exe $Jarsigner -CmdArgs @(
  "-verify", "-verbose", $SignedAab
))

Write-Host "Reading APK badging..."
$badging = Invoke-External -Label "aapt2 badging failed" -Exe $Aapt2 -CmdArgs @(
  "dump", "badging", $SignedApk
)
$pkgMatch = [regex]::Match($badging, "package: name='([^']+)' versionCode='(\d+)' versionName='([^']+)'")
if (-not $pkgMatch.Success) {
  Fail-Release -Reason "Could not parse APK badging" -Details @($badging)
}
$packageName = $pkgMatch.Groups[1].Value
$versionCode = $pkgMatch.Groups[2].Value
$versionName = $pkgMatch.Groups[3].Value
Write-Host "Badging: package=$packageName versionCode=$versionCode versionName=$versionName"

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  Fail-Release -Reason "node not found in PATH" -Details @("Install Node.js to run validation scripts")
}

Push-Location $PlayDist
try {
  Write-Host "Running verify-twa-native-splash-in-artifacts.mjs..."
  $splashJson = & node $SplashVerifyScript 2>&1 | Out-String
  Write-Host $splashJson.Trim()
  if ($LASTEXITCODE -ne 0) {
    Fail-Release -Reason "Splash verification failed" -Details @($splashJson.Trim())
  }

  Write-Host "Running validate-p11-release-artifacts.mjs..."
  $validateJson = & node $ValidateScript 2>&1 | Out-String
  Write-Host $validateJson.Trim()
  if ($LASTEXITCODE -ne 0) {
    try {
      $parsed = $validateJson | ConvertFrom-Json
      Fail-Release -Reason (($parsed.errors -join ", ")) -Details @("See validate JSON above")
    } catch {
      Fail-Release -Reason "Validation script failed" -Details @($validateJson.Trim())
    }
  }
  $result = $validateJson | ConvertFrom-Json
  if (-not $result.ok) {
    Fail-Release -Reason (($result.errors -join ", ")) -Details @("validate ok=false")
  }
} finally {
  Pop-Location
}

Pass-Release -Summary @{
  packageName          = $packageName
  versionCode          = $versionCode
  versionName          = $versionName
  signedApk            = $SignedApk
  signedAab            = $SignedAab
  signedApkFingerprint = $apkCertColon
  uploadKeyExpected    = $UploadKeyColon
  appSigningKeyForTwa  = $AppSigningColon
}
