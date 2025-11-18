# Instalación de Códigos Modulares

## 📋 Descripción
Este script agrega códigos modulares únicos a todos los usuarios del sistema GoEnglish.

## 🎯 Códigos Generados
- **EST-XXXX**: Códigos para estudiantes
- **DOC-XXXX**: Códigos para docentes/profesores
- **ADM-XXXX**: Códigos para administradores

## 🚀 Instalación

### Opción 1: Usando el archivo batch (Windows)
1. Abre el archivo `INSTALAR_CODIGOS_MODULARES.bat`
2. Si tienes contraseña en MySQL, edita el archivo y cambia la línea:
   ```batch
   set MYSQL_PASSWORD=tu_password
   ```
3. Ejecuta el archivo batch haciendo doble clic

### Opción 2: Manualmente con MySQL Workbench
1. Abre MySQL Workbench
2. Conecta a tu base de datos
3. Abre el archivo `agregar_codigos_modulares.sql`
4. Ejecuta el script completo (Ctrl + Shift + Enter)

### Opción 3: Desde línea de comandos
```bash
# Windows (CMD)
cd BD
mysql -uroot -p < agregar_codigos_modulares.sql

# Windows (PowerShell)
cd BD
Get-Content agregar_codigos_modulares.sql | mysql -uroot -p

# Linux/Mac
cd BD
mysql -uroot -p < agregar_codigos_modulares.sql
```

## ✅ Verificación

Después de ejecutar el script, puedes verificar que los códigos se generaron correctamente:

```sql
USE instenglish_auth;

-- Ver todos los usuarios con sus códigos
SELECT 
    id,
    nombre,
    rol,
    codigo_estudiante,
    codigo_docente,
    codigo_admin
FROM usuarios
ORDER BY rol, id;
```

## 📊 Funcionalidades

### Columnas Agregadas
- `codigo_estudiante`: VARCHAR(20) UNIQUE
- `codigo_docente`: VARCHAR(20) UNIQUE
- `codigo_admin`: VARCHAR(20) UNIQUE

### Funciones Creadas
- `generar_codigo_unico(prefijo, ultimo_numero)`: Genera códigos con formato PREFIX-XXXX

### Procedimientos
- `asignar_codigos_usuarios()`: Asigna códigos a todos los usuarios existentes

### Triggers
- `before_insert_usuario_codigo`: Asigna automáticamente códigos a nuevos usuarios

## 🔧 Características Técnicas

1. **Auto-incremental**: Los códigos se generan automáticamente según el último número usado
2. **Únicos**: Cada código es único en la base de datos
3. **Automático**: Los nuevos usuarios reciben su código al momento de crearse
4. **Retroactivo**: Los usuarios existentes reciben sus códigos al ejecutar el script

## 📝 Notas Importantes

- El script es **idempotente**: puede ejecutarse múltiples veces sin problemas
- Los códigos existentes **NO** se modifican
- Solo se asignan códigos a usuarios que no los tienen
- Los índices mejoran el rendimiento de las búsquedas

## 🆘 Solución de Problemas

### Error: "Table 'usuarios' doesn't exist"
- Verifica que estés conectado a la base de datos correcta (`instenglish_auth`)

### Error: "Access denied"
- Verifica tus credenciales de MySQL
- Asegúrate de tener permisos de administrador

### Los códigos no se generan
- Ejecuta el procedimiento manualmente:
  ```sql
  CALL asignar_codigos_usuarios();
  ```

## 📱 Integración con el Frontend

El nuevo módulo "Control de Datos" en el dashboard de administrador muestra:
- Lista completa de usuarios con sus códigos
- Estado de completitud de datos personales
- Campos faltantes por usuario
- Filtros por rol y búsqueda

Para acceder:
1. Inicia sesión como administrador
2. Ve al menú lateral → Sistema → Control de Datos

## 🎨 Cambios en el Sistema

### Frontend
- ✅ Eliminado: MinistryForm (Form. Ministerio)
- ✅ Agregado: UsuariosIncompletos (Control de Datos)
- ✅ Actualizado: Dashboard con nuevo módulo

### Backend
- ✅ Nuevo endpoint: `/usuarios/incompletos`
- ✅ Actualizado: `/usuarios` incluye códigos modulares
- ✅ Query optimizado con LEFT JOIN para datos personales

### Base de Datos
- ✅ 3 nuevas columnas en tabla usuarios
- ✅ 3 nuevos índices para búsquedas rápidas
- ✅ 1 función, 1 procedimiento y 1 trigger

## 📞 Soporte

Si encuentras algún problema, verifica:
1. ✅ MySQL está corriendo
2. ✅ La base de datos `instenglish_auth` existe
3. ✅ Tienes permisos de administrador
4. ✅ El backend está actualizado y corriendo
5. ✅ El frontend está actualizado y compilado

---
**GoEnglish** - Sistema de Gestión Educativa
