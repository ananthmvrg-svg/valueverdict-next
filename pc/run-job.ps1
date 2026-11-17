<#  Value Verdict jobs that run on this PC instead of GitHub Actions (Windows Task Scheduler starts them;
    install-tasks.ps1 sets that up). Secrets come from the repo's .env.local file, never from GitHub.

    .\pc\run-job.ps1 reels      daily: music removals from Telegram, then the reel kit (video ZIP to Telegram)
    .\pc\run-job.ps1 music      weekly: 5 new Lyria background tracks (add -Kind starter for a library of 30)
    .\pc\run-job.ps1 research   weekly market research (Sunday)
    .\pc\run-job.ps1 report     weekly report (Monday)
    Add -Youtube to "reels" to also upload the best Shorts as private (off by default, as before).
    Logs: pc\logs\<job>_<date>.log  #>
param(
  [Parameter(Mandatory = $true)][ValidateSet("reels", "music", "research", "report")][string]$Job,
  [ValidateSet("weekly", "starter")][string]$Kind = "weekly",
  [switch]$Youtube
)
$ErrorActionPreference = "Stop"
$repo = Split-Path -Parent $PSScriptRoot
$env:Path = [Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [Environment]::GetEnvironmentVariable("Path", "User")
New-Item -ItemType Directory -Force -Path "$PSScriptRoot\logs" | Out-Null
$log = "$PSScriptRoot\logs\${Job}_$(Get-Date -Format yyyy-MM-dd_HHmm).log"
Start-Transcript -Path $log | Out-Null
$envFile = Join-Path $repo ".env.local"
if (-not (Test-Path $envFile)) { throw "Missing $envFile (see pc\README.md for the keys it needs)" }
$nodeEnv = "--env-file=$envFile"
$quiet = "--disable-warning=MODULE_TYPELESS_PACKAGE_JSON"

function Save-Audio([string]$message) {
  git -C $repo add -A reels/audio
  git -C $repo diff --cached --quiet
  if ($LASTEXITCODE -ne 0) { git -C $repo commit -m $message; git -C $repo push }
}

try {
  Set-Location $repo
  git pull --rebase --autostash
  switch ($Job) {
    "reels" {
      Set-Location "$repo\reels"
      if (-not (Test-Path node_modules)) { npm install --no-audit --no-fund; npx playwright install chromium }
      node $nodeEnv $quiet music-inbox.mjs
      Save-Audio "Reel music: tracks removed from Telegram"
      node $nodeEnv $quiet generate.mjs
      if ($Youtube) { node $nodeEnv $quiet youtube.mjs }
    }
    "music" {
      Set-Location "$repo\reels"
      node $nodeEnv $quiet music.mjs "--$Kind"
      Save-Audio "Reel music: new Lyria tracks ($(Get-Date -Format yyyy-MM-dd))"
    }
    "research" { if (-not (Test-Path node_modules)) { npm ci --no-audit --no-fund }; npm run research:local }
    "report"   { if (-not (Test-Path node_modules)) { npm ci --no-audit --no-fund }; npm run report:local }
  }
  if ($LASTEXITCODE -ne 0) { throw "$Job exited with code $LASTEXITCODE" }
} finally {
  Stop-Transcript | Out-Null
}
