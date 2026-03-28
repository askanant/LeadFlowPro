# PowerShell script for Task Scheduler
# Purpose: Run dependency audit with proper environment
# Usage: Called by Windows Task Scheduler on 1st Friday of each month

$ErrorActionPreference = "Continue"

# Change to project directory
$projectPath = "C:\Users\Anant Shukla\OneDrive\LeadFlowPro"
Set-Location $projectPath

# Create log directory if needed
$logDir = Join-Path $projectPath "scripts\audit_logs"
if (-not (Test-Path $logDir)) {
    New-Item -ItemType Directory -Path $logDir -Force | Out-Null
}

# Create timestamped log file
$timestamp = Get-Date -Format "yyyy-MM-dd"
$logFile = Join-Path $logDir "audit_$timestamp.log"

# Start logging
"========================================"  | Tee-Object -FilePath $logFile -Append
"Dependency Audit - $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" | Tee-Object -FilePath $logFile -Append
"========================================"  | Tee-Object -FilePath $logFile -Append
""  | Tee-Object -FilePath $logFile -Append

# Run the audit
Try {
    npm run audit:dependencies 2>&1 | Tee-Object -FilePath $logFile -Append
    $exitCode = 0
} Catch {
    $_.Exception.Message | Tee-Object -FilePath $logFile -Append
    $exitCode = 1
}

# Log completion
""  | Tee-Object -FilePath $logFile -Append
"Completed: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"  | Tee-Object -FilePath $logFile -Append
if ($exitCode -eq 0) {
    "Status: SUCCESS"  | Tee-Object -FilePath $logFile -Append
} else {
    "Status: FAILED (exit code: $exitCode)"  | Tee-Object -FilePath $logFile -Append
}
"========================================"  | Tee-Object -FilePath $logFile -Append
""  | Tee-Object -FilePath $logFile -Append

exit $exitCode
