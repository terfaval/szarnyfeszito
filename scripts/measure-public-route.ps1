param(
  [Parameter(Mandatory = $true)]
  [string]$Url,

  [int]$Runs = 5,

  [int]$SleepSeconds = 2
)

$ErrorActionPreference = "Stop"

function Measure-Once {
  param([string]$Target)

  $format = "code:%{http_code} TTFB:%{time_starttransfer} Total:%{time_total} Size:%{size_download}`n"
  $args = @(
    "-sS",
    "-o", "NUL",
    "-L",
    "-w", $format,
    $Target
  )

  & curl.exe @args
  if ($LASTEXITCODE -ne 0) { throw "curl.exe failed with exit code $LASTEXITCODE" }

  & curl.exe -sS -I -L $Target | Select-String -Pattern "^(x-nextjs-cache|x-vercel-cache|cache-control|age|etag|last-modified):" -CaseSensitive:$false
}

Write-Host "URL: $Url"
Write-Host "Runs: $Runs"
Write-Host "Sleep: $SleepSeconds s"
Write-Host ""

for ($i = 1; $i -le $Runs; $i += 1) {
  Write-Host "== Run $i ==" -ForegroundColor Cyan
  Measure-Once -Target $Url
  Write-Host ""
  if ($i -lt $Runs -and $SleepSeconds -gt 0) {
    Start-Sleep -Seconds $SleepSeconds
  }
}

