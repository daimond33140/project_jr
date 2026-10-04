@echo off
title HexSyncTH Auto Sync Engine
chcp 65001 > nul
cls
echo =========================================================
echo    HexSyncTH Auto Sync - Next-Gen Deployment Engine
echo =========================================================
echo.
echo  [*] Starting Cyberpunk UI and Background Git Watcher...
echo.
python hexsync_app.py
pause
