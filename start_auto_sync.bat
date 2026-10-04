@echo off
title Thailand Tourism Dashboard - Auto Sync to GitHub
chcp 65001 > nul
cls
echo ===================================================
echo   Thailand Tourism Intelligence Auto-Sync Service
echo ===================================================
echo.
python auto_sync.py
pause
