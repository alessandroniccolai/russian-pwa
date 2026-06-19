@echo off
cd /d "%~dp0"

set "PYTHON_EXE=E:\anaconda3\python.exe"
set "PORT=8000"

echo Cartella corrente:
cd
echo.

echo Python usato:
echo "%PYTHON_EXE%"
echo.

if not exist "%PYTHON_EXE%" (
    echo ERRORE: python.exe non trovato.
    pause
    exit /b
)

if not exist "index.html" (
    echo ERRORE: index.html non trovato in questa cartella.
    echo Metti questo file .bat nella cartella principale del progetto.
    pause
    exit /b
)

if not exist "tools\dev_server.py" (
    echo ERRORE: tools\dev_server.py non trovato.
    echo Crea prima il file tools\dev_server.py.
    pause
    exit /b
)

echo Avvio server locale senza cache...
echo Apri manualmente nel browser:
echo http://localhost:%PORT%
echo.

"%PYTHON_EXE%" "tools\dev_server.py"

pause