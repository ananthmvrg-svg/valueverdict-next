<#  Registers the Value Verdict jobs in Windows Task Scheduler (run once, in PowerShell, from the repo folder):
      powershell -ExecutionPolicy Bypass -File .\pc\install-tasks.ps1
    Times are this PC's clock (India time). If the PC is off or asleep at that time, the job runs as soon as it's
    back on ("run as soon as possible after a missed start"). Remove them: .\pc\install-tasks.ps1 -Remove  #>
param([switch]$Remove)
$script = Join-Path $PSScriptRoot "run-job.ps1"
$jobs = @(
  @{ Name = "ValueVerdict Reels";    Arg = "reels";    Trigger = New-ScheduledTaskTrigger -Daily -At "08:00" },
  @{ Name = "ValueVerdict Music";    Arg = "music";    Trigger = New-ScheduledTaskTrigger -Weekly -DaysOfWeek Sunday -At "07:00" },
  @{ Name = "ValueVerdict Research"; Arg = "research"; Trigger = New-ScheduledTaskTrigger -Weekly -DaysOfWeek Sunday -At "04:00" },
  @{ Name = "ValueVerdict Report";   Arg = "report";   Trigger = New-ScheduledTaskTrigger -Weekly -DaysOfWeek Monday -At "05:00" }
)
foreach ($j in $jobs) {
  Unregister-ScheduledTask -TaskName $j.Name -Confirm:$false -ErrorAction SilentlyContinue
  if ($Remove) { Write-Host "removed $($j.Name)"; continue }
  $action = New-ScheduledTaskAction -Execute "powershell.exe" `
    -Argument "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$script`" $($j.Arg)"
  $settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -WakeToRun -ExecutionTimeLimit (New-TimeSpan -Hours 2) `
    -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries
  Register-ScheduledTask -TaskName $j.Name -Action $action -Trigger $j.Trigger -Settings $settings `
    -Description "Value Verdict: pc\run-job.ps1 $($j.Arg)" | Out-Null
  Write-Host "scheduled $($j.Name)"
}
