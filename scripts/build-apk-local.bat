@echo off
echo ========================================
echo   衣搭衣 Local APK Build
echo ========================================
echo.

set JAVA_HOME=C:\Program Files\Android\Android Studio\jbr
set ANDROID_HOME=C:\Users\Administrator\AppData\Local\Android\Sdk

echo JAVA_HOME=%JAVA_HOME%
echo ANDROID_HOME=%ANDROID_HOME%
echo.

cd /d C:\Users\Administrator\Desktop\develop\yidayi\android

echo Running Gradle assembleRelease...
echo.
call gradlew.bat assembleRelease

echo.
echo ========================================
if %ERRORLEVEL% EQU 0 (
    echo   BUILD SUCCESS! APK located at:
    echo   android\app\build\outputs\apk\release\app-release.apk
) else (
    echo   BUILD FAILED with exit code %ERRORLEVEL%
)
echo ========================================
pause
