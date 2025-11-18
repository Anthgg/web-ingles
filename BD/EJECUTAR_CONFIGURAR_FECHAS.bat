@echo off
echo ========================================
echo CONFIGURAR FECHAS DE CURSOS
echo ========================================
echo.
echo Este script configurará las fechas de inicio y fin
echo para todos los cursos (Oct 1 - Dic 31, 2025)
echo.
pause

"C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe" -u root -p -e "USE instenglish_classes; UPDATE cursos SET fecha_inicio = '2025-10-01', fecha_fin = '2025-12-31' WHERE fecha_inicio IS NULL OR fecha_fin IS NULL; SELECT id, nombre, fecha_inicio, fecha_fin FROM cursos;"

echo.
echo ========================================
echo PROCESO COMPLETADO
echo ========================================
pause
