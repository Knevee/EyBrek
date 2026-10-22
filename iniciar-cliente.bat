@echo off
REM =====================================================================
REM  EyBrek - Inicia el cliente de escritorio
REM  Doble clic en este archivo para abrir la aplicacion.
REM =====================================================================
title EyBrek - Cliente

cd /d "%~dp0client"

if not exist "node_modules" (
  echo.
  echo  Primera ejecucion: instalando dependencias. Puede tardar un momento...
  echo.
  call npm install
  if errorlevel 1 (
    echo.
    echo  No se pudieron instalar las dependencias.
    echo  Revisa tu conexion a internet y vuelve a intentarlo.
    pause
    exit /b 1
  )
)

echo.
echo  Iniciando EyBrek...
echo.

call npm start

if errorlevel 1 (
  echo.
  echo  EyBrek se cerro con un error.
  pause
)
