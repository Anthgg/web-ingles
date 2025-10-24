# @campus/base-middleware

Conjunto reutilizable de middlewares para los microservicios Express de GoEnglish. Incluye logging estructurado con Pino, manejo estándar de errores, validación con Zod y control de acceso basado en roles (RBAC).

## Instalación

```powershell
cd backend/base-middleware
npm install
```

Para usarlo dentro de otro servicio del monorepo puedes referenciarlo por ruta relativa:

```javascript
const baseMiddleware = require('../base-middleware');
```

Cuando lo publiques en tu registro privado, importa el paquete con su nombre `@campus/base-middleware`.

## Middlewares disponibles

- `createLogger(options)` y `httpLogger(options)` — logger estructurado JSON y middleware para peticiones HTTP.
- `errorHandler(logger)` — middleware global para respuestas de error homogéneas.
- `validator(schema, options)` — validación con Zod para `req.body`, `req.query`, etc.
- `rbac(roles, options)` — control de acceso por roles basado en payload JWT.

Consulta el `user-service` para ver un ejemplo de integración completa.
