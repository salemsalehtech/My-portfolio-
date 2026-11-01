# render.ps1 — turns every template in templates.html into a PNG at its exact size, in Arabic and
# English, into ..\exports\. Needs Microsoft Edge. Run:  powershell -ExecutionPolicy Bypass -File render.ps1
# One template with your own text:  render.ps1 -Only yt-thumb -Query "title=...&tag=..." -Lang ar
param([string]$Only = "", [string]$Query = "", [string]$Lang = "")
$E = "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
$Here = $PSScriptRoot; $Out = Join-Path (Split-Path $Here) "exports"; New-Item -ItemType Directory -Force $Out | Out-Null
$Profile = Join-Path $env:TEMP "edge-brand-profile"
$Sizes = [ordered]@{
  "yt-banner" = "2560,1440"; "fb-cover" = "1640,624"; "li-banner" = "1584,396"; "x-header" = "1500,500";
  "yt-thumb" = "1280,720"; "vertical-cover" = "1080,1920"; "video-title" = "1920,1080"; "video-end" = "1920,1080";
  "lower-third" = "1920,1080"; "post-tip" = "1080,1350"; "post-code" = "1080,1350"; "post-launch" = "1080,1350"
}
$Langs = if ($Lang) { @($Lang) } else { @("ar", "en") }
$Url = "file:///" + ($Here -replace "\\", "/") + "/templates.html"
foreach ($t in $Sizes.Keys) {
  if ($Only -and $t -ne $Only) { continue }
  foreach ($l in $Langs) {
    $file = Join-Path $Out "$t-$l.png"
    $q = "t=$t&lang=$l"; if ($Query) { $q += "&" + $Query }
    $args = @("--headless=new", "--disable-gpu", "--hide-scrollbars", "--user-data-dir=`"$Profile`"", "--window-size=$($Sizes[$t])",
              "--default-background-color=00000000", "--virtual-time-budget=8000", "--screenshot=`"$file`"", "`"$Url`?$q`"")
    Start-Process -FilePath $E -ArgumentList $args -Wait -WindowStyle Hidden
    Write-Output "$t-$l.png"
  }
}
