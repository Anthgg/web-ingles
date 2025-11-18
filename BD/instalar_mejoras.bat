@echo off
echo ========================================
echo  Instalador de Mejoras de Asistencias
echo  Sistema de Cursos y Horarios
echo ========================================
echo.
echo Este script instalará:
echo - Tabla horarios_curso
echo - Columnas curso_id y curso_nombre en asistencias
echo - Vistas de estadísticas
echo - Funciones y stored procedures
echo.
echo Presiona cualquier tecla para continuar...
pause >nul

cd /d "%~dp0"

echo.
echo Ejecutando script SQL...
echo Por favor ingresa tu contraseña de MySQL cuando se solicite.
echo.

"C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe" -u root -p < mejoras_cursos_horarios.sql

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ========================================
    echo  ✓ INSTALACIÓN COMPLETADA CON ÉXITO
    echo ========================================
    echo.
    echo Ahora puedes:
    echo 1. Configurar horarios de cursos con sp_agregar_horario_curso
    echo 2. Reiniciar el backend: cd ..\backend\run ^&^& node app.js
    echo 3. Probar en el navegador
    echo.
    echo Consulta README_MEJORAS_CURSOS_HORARIOS.md para más detalles.
    echo.
) else (
    echo.
    echo ========================================
    echo  ✗ ERROR EN LA INSTALACIÓN
    echo ========================================
    echo.
    echo Verifica:
    echo - Contraseña de MySQL correcta
    echo - MySQL Server está corriendo
    echo - Tienes permisos de administrador
    echo.
)

echo Presiona cualquier tecla para salir...
pause >nul
