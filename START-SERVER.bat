@echo off
title SKH Solutions - local server
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo  Node.js is not installed.
  echo  Download the LTS version from https://nodejs.org , install it, then run this file again.
  echo.
  start https://nodejs.org
  pause
  exit /b
)
start "" http://localhost:3000
node server.js
pause
