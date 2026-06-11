# Wake/sleep helpers for the sender (mirrors RobloxModelsProject pipeline.py).
#   power.ps1 woke   -> prints YES if this PC resumed from sleep within 180s
#                       (i.e. the scheduled task just woke it), else NO
#   power.ps1 sleep  -> returns the PC to sleep, unless the user has touched
#                       keyboard/mouse within the last 300s
param([Parameter(Mandatory = $true)][string]$Mode,
      [int]$WindowSec = 180,
      [int]$IdleSec = 300)

if ($Mode -eq 'woke') {
    # Windows logs Power-Troubleshooter event Id 1 on every wake from sleep.
    # Read-only, no admin needed. On any uncertainty answer NO, so we never
    # sleep a PC we didn't wake.
    try {
        $e = Get-WinEvent -FilterHashtable @{ LogName = 'System';
            ProviderName = 'Microsoft-Windows-Power-Troubleshooter'; Id = 1 } `
            -MaxEvents 1 -ErrorAction Stop
        if ($e -and ((Get-Date) - $e.TimeCreated).TotalSeconds -le $WindowSec) {
            Write-Output 'YES'
        } else {
            Write-Output 'NO'
        }
    } catch { Write-Output 'NO' }
    exit 0
}

if ($Mode -eq 'sleep') {
    Add-Type @'
using System;
using System.Runtime.InteropServices;
public static class PowerNative {
    [StructLayout(LayoutKind.Sequential)]
    public struct LASTINPUTINFO { public uint cbSize; public uint dwTime; }
    [DllImport("user32.dll")] public static extern bool GetLastInputInfo(ref LASTINPUTINFO plii);
    [DllImport("kernel32.dll")] public static extern uint GetTickCount();
    [DllImport("powrprof.dll", SetLastError = true)]
    public static extern bool SetSuspendState(bool hibernate, bool force, bool wakeupEventsDisabled);
}
'@
    # Final guard: never sleep on an active user who wandered over mid-run.
    $lii = New-Object PowerNative+LASTINPUTINFO
    $lii.cbSize = [System.Runtime.InteropServices.Marshal]::SizeOf($lii)
    $idle = [double]$IdleSec  # if the query fails, assume idle -> allow sleep
    if ([PowerNative]::GetLastInputInfo([ref]$lii)) {
        $idle = (([PowerNative]::GetTickCount() - $lii.dwTime) -band 0xFFFFFFFF) / 1000.0
    }
    if ($idle -lt $IdleSec) {
        Write-Output "user active ($([int]$idle)s since last input < ${IdleSec}s) - not sleeping"
        exit 0
    }
    Write-Output 'returning PC to sleep'
    # SetSuspendState(hibernate=false -> sleep/S3, force=true, wakeupEventsDisabled=false)
    [void][PowerNative]::SetSuspendState($false, $true, $false)
    exit 0
}

Write-Error "Unknown mode: $Mode (use 'woke' or 'sleep')"
exit 1
