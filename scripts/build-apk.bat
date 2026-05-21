@echo off
echo ========================================
echo   衣搭衣 APK Build Script
echo ========================================
echo.

REM Check if eas CLI is installed
where eas >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] EAS CLI not found. Installing...
    call npm install -g eas-cli
)

REM Check if logged in
echo [1/3] Checking Expo login status...
eas whoami >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo Please log in to your Expo account:
    eas login
)

echo [2/3] Setting up build environment...
echo.

REM Load .env file if exists
if exist .env (
    for /f "tokens=1,2 delims==" %%a in (.env) do (
        set %%a=%%b
    )
)

echo [3/3] Starting Android APK build...
echo.
echo Building preview APK (installable .apk file)...
echo This will take 10-30 minutes. You will receive a URL when done.
echo.

eas build --platform android --profile preview

echo.
echo ========================================
echo   Build complete! Download the APK from
echo   the URL above and install on your device.
echo ========================================
pause
