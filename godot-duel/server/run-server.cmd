@echo off
setlocal
cd /d "%~dp0"
if not defined GODOT_EXE set "GODOT_EXE=%~dp0runtime\Godot_v4.6.3-stable_win64_console.exe"
if not exist "%GODOT_EXE%" (
 echo Missing approved portable Godot 4.6.3 x64 runtime at %GODOT_EXE%
 exit /b 1
)
"%GODOT_EXE%" --headless --path "%~dp0" --script scripts/server.gd -- --bind=127.0.0.1 --port=8910
