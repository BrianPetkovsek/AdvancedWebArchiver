@echo off
for /f "tokens=1 delims={" %%a in ('TYPE arguments.txt') do (cmd /c node . %%a %*)
