# Windows Task Scheduler Setup for Dependency Audits

**This guide sets up automatic reminders via Windows Task Scheduler.**

## Option 1: Monthly Dependency Audit (Automated Check)

### Step 1: Create the Batch File

Create file: `C:\Users\Anant Shukla\OneDrive\LeadFlowPro\scripts\run-dependency-audit.bat`

```batch
@echo off
REM Dependency Audit Script for Windows Task Scheduler
REM Runs npm audit:dependencies and logs results

cd /d "C:\Users\Anant Shukla\OneDrive\LeadFlowPro"
echo Dependency Audit - %date% %time% >> scripts\audit_logs.txt
echo ======================================== >> scripts\audit_logs.txt

REM Run the audit
npm run audit:dependencies >> scripts\audit_logs.txt 2>&1

REM Add timestamp
echo Completed: %date% %time% >> scripts\audit_logs.txt
echo. >> scripts\audit_logs.txt
```

### Step 2: Create the Batch Wrapper (to run PowerShell)

Create file: `C:\Users\Anant Shukla\OneDrive\LeadFlowPro\scripts\schedule-audit.ps1`

```powershell
# PowerShell script for Task Scheduler
Set-Location "C:\Users\Anant Shukla\OneDrive\LeadFlowPro"
npm run audit:dependencies
```

### Step 3: Register Task in Windows Task Scheduler

**Via GUI:**
1. Open Task Scheduler (press `Win+R`, type `taskschd.msc`)
2. Click "Create Basic Task..." in right sidebar
3. Fill in:
   - **Name**: `LeadFlowPro Monthly Dependency Audit`
   - **Description**: `Runs npm audit:dependencies on 1st Friday of each month at 9:45 AM`
   - **Trigger**: Click "New..." → "Monthly" → Select "First Friday" 
   - **Time**: 09:45 AM
4. **Action**: 
   - Program: `C:\Windows\System32\cmd.exe`
   - Arguments: `/c "C:\Users\Anant Shukla\OneDrive\LeadFlowPro\scripts\run-dependency-audit.bat"`
   - Start in: `C:\Users\Anant Shukla\OneDrive\LeadFlowPro`
5. Click "Finish"

**Via PowerShell (Admin):**

```powershell
# Run as Administrator
$taskName = "LeadFlowPro Monthly Dependency Audit"
$scriptPath = "C:\Users\Anant Shukla\OneDrive\LeadFlowPro\scripts\schedule-audit.ps1"
$workDir = "C:\Users\Anant Shukla\OneDrive\LeadFlowPro"

# Create trigger for 1st Friday of each month at 9:45 AM
$trigger = New-ScheduledTaskTrigger -Monthly -DaysOfWeek Friday -WeeksInterval 1 -At 09:45AM

# Create action
$action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$scriptPath`"" -WorkingDirectory $workDir

# Create principal
$principal = New-ScheduledTaskPrincipal -UserId "$env:USERDOMAIN\$env:USERNAME" -LogonType Interactive

# Register task
Register-ScheduledTask -TaskName $taskName -Trigger $trigger -Action $action -Principal $principal -Description "Runs npm audit:dependencies monthly" -Force

Write-Host "✓ Task scheduled: $taskName"
```

### Step 4: Verify Task

```powershell
# List the scheduled task
Get-ScheduledTaskInfo -TaskName "LeadFlowPro Monthly Dependency Audit"

# Manually trigger it to test
Start-ScheduledTask -TaskName "LeadFlowPro Monthly Dependency Audit"

# View logs
Get-Content "C:\Users\Anant Shukla\OneDrive\LeadFlowPro\scripts\audit_logs.txt" -Tail 20
```

---

## Option 2: Import Calendar File (Outlook/Google Calendar)

A calendar file has been created: **LeadFlowPro-Dependency-Reminders.ics**

### For Outlook (Windows):
1. Open Outlook
2. File → Open → Open Calendar
3. Select `LeadFlowPro-Dependency-Reminders.ics`
4. Events appear in your calendar with reminders

### For Google Calendar:
1. Go to https://calendar.google.com
2. On the left, click "+" next to "Other calendars"
3. Select "Import & subscribe"
4. Upload `LeadFlowPro-Dependency-Reminders.ics`
5. Select calendar to import into
6. Events sync automatically

### For Apple Calendar:
1. Double-click `LeadFlowPro-Dependency-Reminders.ics`
2. System asks which calendar to add to
3. Click "Add"
4. Events appear with notifications

---

## Manual Reminders (If You Prefer)

Add these to your project management tool (Jira, Asana, etc.):

### Monthly
- **Every 1st Friday @ 9:45 AM**: Run `npm run audit:dependencies`
  - 15 min time estimate
  - Update DEPENDENCY_UPDATES.md with findings

### Quarterly (3rd Monday @ 10:00 AM)
- **March 18, June 16, September 21, December 16**
- Review Tier 2 & 3 minor version updates
- Test in staging (48 hours)
- 2 hours time estimate

### Annual (3rd Tuesday of January @ 10:00 AM)
- **January 21, 2027**
- Tier 1 major version strategy discussion
- Create 12-month upgrade roadmap
- 4 hours time estimate

---

## Verify Your Reminders Are Set

Run this to check current setup:

```powershell
# List all scheduled tasks with "LeadFlowPro" in name
Get-ScheduledTask | Where-Object {$_.TaskName -like "*LeadFlowPro*"} | Select TaskName, Triggers, NextRunTime
```

Expected output:
```
TaskName                                  Triggers                           NextRunTime
--------                                  --------                           -----------
LeadFlowPro Monthly Dependency Audit      Monthly, First Friday at 09:45 AM  [next 1st Friday]
```

---

## Troubleshooting

### Task not running?
1. Open Task Scheduler
2. Right-click task → Properties
3. Check "Run whether user is logged in or not" is enabled
4. Verify user account has permissions

### PowerShell script execution blocked?
```powershell
# Allow script execution for current user
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### Can't find npm command in scheduled task?
Add full npm path in task:
```
C:\Program Files\nodejs\npm.cmd run audit:dependencies
```

---

## Next Steps

1. **Choose Option 1 or 2** (or do both):
   - Option 1: Auto-run audits via Task Scheduler
   - Option 2: Calendar reminders in Outlook/Google Calendar

2. **For Option 1**: Run the PowerShell commands above (admin required)

3. **For Option 2**: Import the `.ics` file to your calendar app

4. **Verify**: Check that reminders appear on your calendar / task runs on schedule

---

**Questions?** See [DEPENDENCY_MANAGEMENT_GUIDE.md](../DEPENDENCY_MANAGEMENT_GUIDE.md)
