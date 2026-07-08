@echo off
chcp 65001 >nul
title 24H Work Dashboard
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo   Node.js is not installed. Opening the download page...
  echo   Install the LTS version, then run start.bat again.
  start https://nodejs.org
  pause
  exit /b 1
)

if not exist node_modules (
  echo.
  echo   First run: installing dependencies ^(one time, ~1 minute^)...
  call npm install --no-audit --no-fund
  if errorlevel 1 ( echo Installation failed. & pause & exit /b 1 )
)

if not exist .next (
  echo.
  echo   Building the app ^(one time^)...
  call npm run build
  if errorlevel 1 ( echo Build failed. & pause & exit /b 1 )
)

echo.
echo   Starting 24H Work Dashboard at http://localhost:3001
echo   Keep this window open. Close it to stop the app.
echo.
start "" http://localhost:3001
npx next start -p 3001
pause