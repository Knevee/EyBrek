@echo off
REM =====================================================================
REM  EyBrek - Inicia el servidor
REM  Doble clic en este archivo para levantar el servidor de EyBrek.
REM  La base de datos se crea sola en el primer arranque.
REM =====================================================================
title EyBrek - Servidor

cd /d "%~dp0server"

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
echo  Iniciando el servidor de EyBrek en el puerto 3000...
echo  Para detenerlo, cierra esta ventana o presiona Ctrl+C.
echo.

call npm start

echo.
echo  El servidor se detuvo.
pause
