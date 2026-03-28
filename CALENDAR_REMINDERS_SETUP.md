# 🗓️ Calendar Reminders - Quick Setup (2 minutes)

**Choose ONE option below to set up automatic reminders.**

---

## Option A: Calendar Import (Easiest - 1 minute)

### For Outlook:
1. Open Outlook
2. File → Open → Open Calendar
3. Select: `LeadFlowPro-Dependency-Reminders.ics`
4. ✅ Done - events added to your calendar

### For Google Calendar:
1. Go to https://calendar.google.com
2. Left sidebar → "+ Other calendars" → "Import & subscribe"
3. Upload: `LeadFlowPro-Dependency-Reminders.ics`
4. ✅ Done - events synced

### For Apple Calendar:
1. Double-click: `LeadFlowPro-Dependency-Reminders.ics`
2. Select which calendar to add to
3. ✅ Done

---

## Option B: Windows Task Scheduler (Automated Audits - 2 minutes)

### Quick Setup (PowerShell):

**Right-click PowerShell → "Run as Administrator"**

Then paste this:

```powershell
$taskName = "LeadFlowPro Monthly Dependency Audit"
$scriptPath = "C:\Users\Anant Shukla\OneDrive\LeadFlowPro\scripts\schedule-audit.ps1"
$workDir = "C:\Users\Anant Shukla\OneDrive\LeadFlowPro"

# Create trigger: 1st Friday of month at 9:45 AM
$trigger = New-ScheduledTaskTrigger -Monthly -DaysOfWeek Friday -WeeksInterval 1 -At 09:45AM

# Create action
$action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$scriptPath`"" -WorkingDirectory $workDir

# Create principal
$principal = New-ScheduledTaskPrincipal -UserId "$env:USERDOMAIN\$env:USERNAME" -LogonType Interactive

# Register task
Register-ScheduledTask -TaskName $taskName -Trigger $trigger -Action $action -Principal $principal -Description "Runs npm audit:dependencies monthly" -Force

Write-Host "✓ Task scheduled: $taskName"
```

**Verify it worked:**
```powershell
Get-ScheduledTask -TaskName "LeadFlowPro Monthly Dependency Audit" | Select-Object TaskName, State
```

✅ Done - audits will run automatically 1st Friday of each month at 9:45 AM

Results logged to: `scripts/audit_logs/audit_YYYY-MM-DD.log`

---

## 📋 What Gets Scheduled

### Monthly (1st Friday @ 9:45 AM)
- Automatic: `npm run audit:dependencies`
- Checks for security vulnerabilities, version mismatches
- Results logged to `scripts/audit_logs/`

### Quarterly (3rd Monday March/June/Sep/Dec @ 10:00 AM)
- **Manual reminder only** (calendar event)
- Review Tier 2 & 3 package updates
- 48-hour staging test window

### Annual (3rd Tuesday January @ 10:00 AM)
- **Manual reminder only** (calendar event)
- Plan major version strategies (React, Express, Prisma)
- Update 12-month roadmap

---

## ✅ Verification Checklist

After setup, verify reminders are active:

- [ ] **Calendar option**: Check calendar app for 6 events (start with "LeadFlowPro")
- [ ] **Task Scheduler option**: Check logs directory populates after first run
- [ ] **Both options**: Set a phone alert for monthly audit day to double-check

---

## Need Help?

See detailed instructions: [scripts/SCHEDULER_SETUP.md](scripts/SCHEDULER_SETUP.md)

Need to troubleshoot? Common issues in that file.

---

**Pick one, run it, you're done! ✅**
