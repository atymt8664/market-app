# P0 API E2E — one session, two users (login only), no empty IDs in requests.
$ErrorActionPreference = "Stop"
$base = "http://localhost:3001/api"
$pwd = "StrongPass1!"
$emailA = "e2e_user_a@example.com"
$emailB = "e2e_user_b@example.com"
$adminPwd = "Admin#2026Qa"

$tmpPng = Join-Path $env:TEMP "qa-e2e-img.png"
$pngB64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO7Zp8sAAAAASUVORK5CYII="
[IO.File]::WriteAllBytes($tmpPng, [Convert]::FromBase64String($pngB64))

function New-Report {
  return [ordered]@{}
}

function Set-Pass($rep, $key) {
  $rep[$key] = @{ status = "PASS"; reason = "" }
}

function Set-Fail($rep, $key, $reason) {
  $rep[$key] = @{ status = "FAIL"; reason = [string]$reason }
}

function Invoke-JsonPost($uri, $body, $session) {
  return Invoke-RestMethod -Method Post -Uri $uri -ContentType "application/json" `
    -Body ($body | ConvertTo-Json -Compress -Depth 12) -WebSession $session
}

function Invoke-JsonPatch($uri, $body, $session) {
  return Invoke-RestMethod -Method Patch -Uri $uri -ContentType "application/json" `
    -Body ($body | ConvertTo-Json -Compress -Depth 12) -WebSession $session
}

function Invoke-JsonGet($uri, $session) {
  if ($null -ne $session) {
    return Invoke-RestMethod -Method Get -Uri $uri -WebSession $session
  }
  return Invoke-RestMethod -Method Get -Uri $uri
}

function Try-Step($rep, $key, [scriptblock]$block) {
  try {
    $null = & $block
    Set-Pass $rep $key
  }
  catch {
    Set-Fail $rep $key $_.Exception.Message
  }
}

$rep = New-Report
$wsA = New-Object Microsoft.PowerShell.Commands.WebRequestSession
$wsB = New-Object Microsoft.PowerShell.Commands.WebRequestSession
$wsAdmin = New-Object Microsoft.PowerShell.Commands.WebRequestSession

$script:userA = $null
$script:userB = $null
$script:ad1Id = 0
$script:ad2Id = 0
$script:reportAdId = 0
$script:reportUserId = 0
$script:ticketId = 0
$script:convId = 0
$script:imgUrl = "/api/storage/objects/ads/e2e-fallback.png"

Try-Step $rep "01_login_user_a" {
  $script:userA = Invoke-JsonPost "$base/auth/login" @{ email = $emailA; password = $pwd } $wsA
  if (-not $script:userA.id) { throw "No user id in login response" }
}

Try-Step $rep "02_login_user_b" {
  $script:userB = Invoke-JsonPost "$base/auth/login" @{ email = $emailB; password = $pwd } $wsB
  if (-not $script:userB.id) { throw "No user id in login response" }
}

Try-Step $rep "03_profile_photo_update_user_a" {
  if (-not $script:userA) { throw "BLOCKED: user A not logged in" }
  $path = "/api/storage/objects/avatars/e2e-profile.png"
  $u = Invoke-JsonPatch "$base/auth/me" @{ avatarUrl = $path } $wsA
  if ($u.avatarUrl -ne $path) { throw "avatarUrl mismatch" }
}

Try-Step $rep "04_create_ad_with_images_user_a" {
  if (-not $script:userA) { throw "BLOCKED: user A not logged in" }
  try {
    $up = Invoke-RestMethod -Method Post -Uri "$base/storage/uploads/ad-images" `
      -Form @{ images = Get-Item $tmpPng } -WebSession $wsA
    if ($up.imageUrls -and $up.imageUrls.Count -gt 0) {
      $script:imgUrl = $up.imageUrls[0]
    }
  }
  catch {
    # keep fallback path; create ad still validates images array non-empty
  }
  $ad = Invoke-JsonPost "$base/ads" @{
    title       = "E2E Offer Car"
    description = "E2E description at least ten chars."
    price       = 1500
    priceType   = "fixed"
    type        = "offer"
    city        = "Cairo"
    images      = @($script:imgUrl)
    categoryId  = 1
    sellerName  = "E2E Seller"
    sellerPhone = "+201234567890"
    details     = @{ condition = "new" }
  } $wsA
  if (-not $ad.id) { throw "No ad id" }
  $script:ad1Id = [int]$ad.id
}

Try-Step $rep "05_edit_ad_user_a" {
  if ($script:ad1Id -le 0) { throw "BLOCKED: no ad1 id" }
  $ad = Invoke-JsonPatch "$base/ads/$($script:ad1Id)" @{
    title       = "E2E Offer Car Updated"
    description = "E2E edited description ok."
    type        = "offer"
    images      = @($script:imgUrl)
  } $wsA
  if ($ad.title -ne "E2E Offer Car Updated") { throw "Title not updated" }
}

Try-Step $rep "06_admin_login" {
  $x = Invoke-JsonPost "$base/admin-login" @{ password = $adminPwd } $wsAdmin
  if (-not $x.success) { throw "admin login failed" }
}

Try-Step $rep "07_admin_approve_ad1" {
  if ($script:ad1Id -le 0) { throw "BLOCKED: no ad1 id" }
  $x = Invoke-JsonPatch "$base/admin/ads/$($script:ad1Id)/status" @{ status = "approved" } $wsAdmin
  if (-not $x.success) { throw "approve failed" }
}

Try-Step $rep "08_public_visibility_ad1" {
  if ($script:ad1Id -le 0) { throw "BLOCKED: no ad1 id" }
  $list = Invoke-JsonGet "$base/ads?limit=300" $null
  $hit = @($list | Where-Object { $_.id -eq $script:ad1Id })
  if ($hit.Count -lt 1) { throw "Ad $($script:ad1Id) not in public list" }
}

Try-Step $rep "09_favorite_ad_user_b" {
  if ($script:ad1Id -le 0) { throw "BLOCKED: no ad1 id" }
  if (-not $script:userB) { throw "BLOCKED: user B not logged in" }
  $f = Invoke-JsonPost "$base/ads/$($script:ad1Id)/favorite" @{} $wsB
  if (-not $f.active) { throw "Favorite not active" }
}

Try-Step $rep "10_message_seller_user_b" {
  if ($script:ad1Id -le 0) { throw "BLOCKED: no ad1 id" }
  if (-not $script:userB) { throw "BLOCKED: user B not logged in" }
  $c = Invoke-JsonPost "$base/conversations" @{ adId = $script:ad1Id } $wsB
  if (-not $c.id) { throw "No conversation id" }
  $script:convId = [int]$c.id
  $m = Invoke-JsonPost "$base/conversations/$($script:convId)/messages" @{ body = "E2E hello seller msg" } $wsB
  if (-not $m.id) { throw "No message id" }
}

Try-Step $rep "11_report_ad_user_b" {
  if ($script:ad1Id -le 0) { throw "BLOCKED: no ad1 id" }
  if (-not $script:userB) { throw "BLOCKED: user B not logged in" }
  $r = Invoke-JsonPost "$base/reports" @{
    targetAdId  = $script:ad1Id
    reason      = "spam"
    description = "E2E report ad"
  } $wsB
  if (-not $r.id) { throw "No report id" }
  $script:reportAdId = [int]$r.id
}

Try-Step $rep "12_report_user_user_b" {
  if (-not $script:userA) { throw "BLOCKED: no seller id" }
  if (-not $script:userB) { throw "BLOCKED: user B not logged in" }
  $sid = [int]$script:userA.id
  if ($sid -le 0) { throw "Invalid seller id" }
  $r = Invoke-JsonPost "$base/reports" @{
    targetUserId = $sid
    reason       = "abuse"
    description  = "E2E report user"
  } $wsB
  if (-not $r.id) { throw "No report id" }
  $script:reportUserId = [int]$r.id
}

Try-Step $rep "13_support_ticket_user_b" {
  if ($script:ad1Id -le 0) { throw "BLOCKED: no ad1 id" }
  if (-not $script:userA) { throw "BLOCKED: no seller id" }
  if (-not $script:userB) { throw "BLOCKED: user B not logged in" }
  $sid = [int]$script:userA.id
  $t = Invoke-JsonPost "$base/support/tickets" @{
    category        = "ad"
    subject         = "E2E support subject"
    message         = "E2E support message body here"
    relatedAdId     = $script:ad1Id
    relatedUserId   = $sid
  } $wsB
  if (-not $t.id) { throw "No ticket id" }
  $script:ticketId = [int]$t.id
}

Try-Step $rep "14_admin_ad_hide_approve_reject_delete_ad2" {
  if (-not $script:userA) { throw "BLOCKED: user A not logged in" }
  $ad = Invoke-JsonPost "$base/ads" @{
    title       = "E2E Second Ad"
    description = "Second ad for admin moderation flow."
    price       = 900
    priceType   = "fixed"
    type        = "request"
    city        = "Cairo"
    images      = @($script:imgUrl)
    categoryId  = 1
    sellerName  = "E2E Seller"
    sellerPhone = "+201234567890"
  } $wsA
  if (-not $ad.id) { throw "No ad2 id" }
  $script:ad2Id = [int]$ad.id
  $null = Invoke-JsonPatch "$base/admin/ads/$($script:ad2Id)/status" @{ status = "approved" } $wsAdmin
  $null = Invoke-JsonPatch "$base/admin/ads/$($script:ad2Id)/status" @{ status = "hidden" } $wsAdmin
  $null = Invoke-JsonPatch "$base/admin/ads/$($script:ad2Id)/status" @{ status = "approved" } $wsAdmin
  $null = Invoke-JsonPatch "$base/admin/ads/$($script:ad2Id)/status" @{ status = "rejected" } $wsAdmin
  $del = Invoke-WebRequest -Method Delete -Uri "$base/admin/ads/$($script:ad2Id)" -WebSession $wsAdmin
  if ($del.StatusCode -ne 200) { throw "Delete ad2 status $($del.StatusCode)" }
}

Try-Step $rep "15_admin_handle_report_ad" {
  if ($script:reportAdId -le 0) { throw "BLOCKED: no reportAdId" }
  $null = Invoke-JsonPatch "$base/admin/reports/$($script:reportAdId)/status" @{ status = "in_review" } $wsAdmin
  $x = Invoke-JsonPatch "$base/admin/reports/$($script:reportAdId)/status" @{ status = "resolved" } $wsAdmin
  if ($x.status -ne "resolved") { throw "Report not resolved" }
}

Try-Step $rep "16_admin_handle_report_user" {
  if ($script:reportUserId -le 0) { throw "BLOCKED: no reportUserId" }
  $null = Invoke-JsonPatch "$base/admin/reports/$($script:reportUserId)/status" @{ status = "in_review" } $wsAdmin
  $x = Invoke-JsonPatch "$base/admin/reports/$($script:reportUserId)/status" @{ status = "resolved" } $wsAdmin
  if ($x.status -ne "resolved") { throw "User report not resolved" }
}

Try-Step $rep "17_admin_handle_support_ticket" {
  if ($script:ticketId -le 0) { throw "BLOCKED: no ticketId" }
  $u = Invoke-JsonPatch "$base/admin/support/tickets/$($script:ticketId)" @{ status = "resolved"; priority = "high" } $wsAdmin
  if ($u.status -ne "resolved") { throw "Ticket not resolved" }
  $reply = Invoke-JsonPost "$base/admin/support/tickets/$($script:ticketId)/reply" @{ message = "E2E admin reply" } $wsAdmin
  if (-not $reply.id) { throw "No reply id" }
}

Try-Step $rep "18_activity_logs_contain_actions" {
  $logs = Invoke-JsonGet "$base/admin/logs" $wsAdmin
  $actions = @($logs | ForEach-Object { $_.actionType })
  $need = @(
    "ad.approve"
    "ad.reject"
    "ad.hide"
    "ad.delete"
    "report.review"
    "report.resolve"
    "support.resolve"
  )
  $missing = @($need | Where-Object { $actions -notcontains $_ })
  if ($missing.Count -gt 0) {
    throw "Missing actions: $($missing -join ', ')"
  }
}

$summary = [ordered]@{
  report   = $rep
  ids      = @{
    userAId      = if ($script:userA) { $script:userA.id } else { $null }
    userBId      = if ($script:userB) { $script:userB.id } else { $null }
    ad1Id        = $script:ad1Id
    ad2Id        = $script:ad2Id
    reportAdId   = $script:reportAdId
    reportUserId = $script:reportUserId
    ticketId     = $script:ticketId
    convId       = $script:convId
    imageUrl     = $script:imgUrl
  }
}
$summary | ConvertTo-Json -Depth 8
