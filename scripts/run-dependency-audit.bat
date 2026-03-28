@echo off
REM Dependency Audit Script for Windows Task Scheduler
REM Purpose: Auto-run dependency audits and log results
REM Usage: Called by Windows Task Scheduler (1st Friday monthly)

setlocal enabledelayedexpansion

REM Change to project directory
cd /d "C:\Users\Anant Shukla\OneDrive\LeadFlowPro"

REM Create log directory if needed
if not exist scripts\audit_logs mkdir scripts\audit_logs

REM Set timestamp variables
for /f "tokens=2-4 delims=/ " %%a in ('date /t') do (set mydate=%%c-%%a-%%b)
for /f "tokens=1-2 delims=/:" %%a in ('time /t') do (set mytime=%%a-%%b)

REM Create log file
set logfile=scripts\audit_logs\audit_%mydate%.log

echo. >> "%logfile%"
echo ======================================== >> "%logfile%"
echo Dependency Audit - %mydate% %mytime% >> "%logfile%"
echo ======================================== >> "%logfile%"

REM Run npm audit
npm run audit:dependencies >> "%logfile%" 2>&1

REM Capture exit code
set exitcode=%ERRORLEVEL%

REM Log completion
echo. >> "%logfile%"
echo Completed: %mydate% %mytime% >> "%logfile%"
if %exitcode% equ 0 (
    echo Status: SUCCESS >> "%logfile%"
) else (
    echo Status: FAILED ^(exit code: %exitcode%^) >> "%logfile%"
)
echo ======================================== >> "%logfile%"
echo. >> "%logfile%"

REM Exit with same code
exit /b %exitcode%
