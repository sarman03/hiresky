@echo off
echo === Building HireSky Windows (.NET 8 WPF Release) ===
cd /d "%~dp0"
dotnet publish -c Release -r win-x64 --self-contained -p:PublishSingleFile=true -p:IncludeNativeLibrariesForSelfContained=true
if %ERRORLEVEL% EQU 0 (
    echo.
    echo ==================================================
    echo SUCCESS! HireSky.exe generated at:
    echo %~dp0bin\Release\net8.0-windows\win-x64\publish\HireSkyOverlay.exe
    echo ==================================================
) else (
    echo.
    echo BUILD FAILED! Make sure .NET 8 SDK is installed.
)
pause
