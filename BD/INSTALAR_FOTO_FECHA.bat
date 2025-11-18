@echo off
echo ============================================
echo Instalando campos de foto y fecha de inscripcion
echo ============================================
echo.

REM Solicitar credenciales de MySQL
set /p MYSQL_USER="Ingrese usuario de MySQL (default: root): "
if "%MYSQL_USER%"=="" set MYSQL_USER=root

set /p MYSQL_PASSWORD="Ingrese password de MySQL: "

echo.
echo Ejecutando script SQL...
echo.

mysql -u %MYSQL_USER% -p%MYSQL_PASSWORD% < agregar_foto_fecha_inscripcion.sql

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ============================================
    echo INSTALACION COMPLETADA EXITOSAMENTE
    echo ============================================
    echo.
    echo Se agregaron los siguientes campos:
    echo - foto_perfil_imagen: Para almacenar imagenes
    echo - foto_perfil_tipo: Tipo MIME de la imagen
    echo - fecha_inscripcion: Fecha de registro del usuario
    echo.
    echo Usuarios existentes fueron actualizados con su fecha de creacion
    echo.
) else (
    echo.
    echo ============================================
    echo ERROR EN LA INSTALACION
    echo ============================================
    echo.
    echo Verifique:
    echo - Las credenciales de MySQL
    echo - Que el servicio MySQL este corriendo
    echo - Que la base de datos instenglish_auth exista
    echo.
)

echo.
echo Presione cualquier tecla para continuar...
pause > nul
