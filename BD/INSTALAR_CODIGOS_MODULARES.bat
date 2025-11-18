@echo off
echo ========================================
echo Instalacion de Codigos Modulares
echo GoEnglish - Sistema de Gestion Educativa
echo ========================================
echo.

REM Configuracion de MySQL
set MYSQL_USER=root
set MYSQL_PASSWORD=
set MYSQL_HOST=localhost
set MYSQL_PORT=3306
set SQL_FILE=agregar_codigos_modulares.sql

echo Ejecutando script SQL...
echo.

REM Ejecutar el script SQL
mysql -u%MYSQL_USER% -h%MYSQL_HOST% -P%MYSQL_PORT% < %SQL_FILE%

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ========================================
    echo INSTALACION COMPLETADA EXITOSAMENTE
    echo ========================================
    echo.
    echo Los codigos modulares han sido agregados a la base de datos.
    echo - Estudiantes: EST-XXXX
    echo - Docentes: DOC-XXXX
    echo - Administradores: ADM-XXXX
    echo.
) else (
    echo.
    echo ========================================
    echo ERROR EN LA INSTALACION
    echo ========================================
    echo.
    echo Por favor verifica:
    echo 1. MySQL esta ejecutandose
    echo 2. Las credenciales son correctas
    echo 3. La base de datos existe
    echo.
)

pause
