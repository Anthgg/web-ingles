@echo off
chcp 65001 >nul
echo ========================================
echo INSTALACIÓN: Descripción y Foto de Grupos
echo ========================================
echo.

REM Configuración de la base de datos
set DB_HOST=localhost
set DB_USER=root
set DB_NAME=instenglish_chat

REM Solicitar contraseña
set /p DB_PASSWORD="Ingresa la contraseña de MySQL: "

echo.
echo Ejecutando script de actualización...
echo.

mysql -h %DB_HOST% -u %DB_USER% -p%DB_PASSWORD% %DB_NAME% < agregar_grupos_descripcion_foto.sql

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ========================================
    echo ✓ Instalación completada exitosamente
    echo ========================================
    echo.
    echo Las siguientes columnas fueron agregadas a la tabla chat_rooms:
    echo   - description: Descripción del grupo
    echo   - group_photo: URL de la foto del grupo
    echo   - created_at: Fecha de creación
    echo   - updated_at: Fecha de última actualización
    echo.
) else (
    echo.
    echo ========================================
    echo ✗ Error durante la instalación
    echo ========================================
    echo.
    echo Por favor verifica:
    echo   1. Que MySQL esté ejecutándose
    echo   2. Que las credenciales sean correctas
    echo   3. Que la base de datos 'instenglish_chat' exista
    echo.
)

pause
