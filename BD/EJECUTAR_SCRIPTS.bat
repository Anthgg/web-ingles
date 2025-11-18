@echo off
echo ========================================
echo  Ejecutando Scripts SQL - GoEnglish Chat
echo ========================================
echo.

cd /d "C:\Program Files\MySQL\MySQL Server 8.0\bin"

echo Ingresa la contraseña de MySQL root cuando se solicite...
echo.

mysql -u root -p instenglish_chat < "c:\Users\anthg\OneDrive\Escritorio\goenglish\BD\ejecutar_todo.sql"

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ========================================
    echo  ✅ Scripts ejecutados correctamente
    echo ========================================
) else (
    echo.
    echo ========================================
    echo  ❌ Error al ejecutar scripts
    echo ========================================
)

echo.
pause
