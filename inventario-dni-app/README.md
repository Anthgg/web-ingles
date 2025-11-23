# Inventario + DNI

Aplicación completa con autenticación JWT, roles, gestión de inventario y consultas a DNI.

## Estructura
- frontend/: HTML, CSS y JS responsive.
- backend/: API Node.js con Express, SQLite y JWT.
- database/db.sql: esquema listo para MySQL si se requiere migrar.

## Puesta en marcha
1. Copia `.env.example` a `.env` dentro de `backend/` y define `JWT_SECRET`, `PORT`, `API_DNI_*`.
   - Variables opcionales para credencial inicial del administrador: `ADMIN_EMAIL`, `ADMIN_USUARIO`, `ADMIN_PASSWORD`.
2. Desde la raíz del proyecto `inventario-dni-app` ejecuta:
   ```bash
   npm install
   npm start
   ```
3. Abre `http://localhost:4000` en el navegador.

Se crea automáticamente un usuario administrador demo (`admin@local` / `admin123`) o con las credenciales definidas en `.env`.
