@echo off
rem Task Scheduler entry point: runs the sender and appends all output to
rem task-log.txt so failed runs are diagnosable.
cd /d "%~dp0"
echo. >> task-log.txt
echo ===== %date% %time% ===== >> task-log.txt
"C:\Users\igdau\AppData\Local\Programs\nodejs\node.exe" send.js >> task-log.txt 2>&1
echo exit code: %errorlevel% >> task-log.txt
