@echo off
echo Khoi dong Veo Automation (Ban A - Sieu Sach)...
setlocal
set "APP_DIR=%~dp0veo-automation"
for %%I in ("%~dp0..") do set "ROOT_DIR=%%~fI"
set "ELECTRON_EXE=%APP_DIR%\node_modules\electron\dist\electron.exe"
set "ELECTRON_CLI=%APP_DIR%\node_modules\electron\cli.js"
set "PORTABLE_NODE=%ROOT_DIR%\.runtime\node\node.exe"

if exist "%ELECTRON_EXE%" (
  start "" "%ELECTRON_EXE%" "%APP_DIR%"
  exit /b 0
)

if not exist "%ELECTRON_CLI%" (
  echo Khong tim thay Electron CLI: %ELECTRON_CLI%
  exit /b 1
)

set "NODE_EXE="
if exist "%PORTABLE_NODE%" set "NODE_EXE=%PORTABLE_NODE%"
if not defined NODE_EXE for /f "delims=" %%N in ('where node 2^>nul') do if not defined NODE_EXE set "NODE_EXE=%%N"
if not defined NODE_EXE (
  echo Khong tim thay node portable hoac node trong PATH.
  exit /b 1
)

start "" "%NODE_EXE%" "%ELECTRON_CLI%" "%APP_DIR%"
