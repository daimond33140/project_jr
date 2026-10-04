@echo off
title HexSyncTH Auto Sync Engine
chcp 65001 > nul
cls
echo =========================================================
echo    HexSyncTH Auto Sync - Next-Gen Deployment Engine
echo =========================================================
echo.
if exist "HexSyncTH_AutoSync.exe" (
    echo  [*] Starting Standalone Executable (HexSyncTH_AutoSync.exe)...
    HexSyncTH_AutoSync.exe
) else (
    echo  [*] Starting Python Engine (hexsync_app.py)...
    python hexsync_app.py
)
pause
