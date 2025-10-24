# Backend de Servicios

Este directorio contiene el backend de GoEnglish, compuesto por microservicios Node.js independientes que se orquestan localmente mediante `backend/run/app.js`.

## Catálogo de servicios

| Servicio | Carpeta | Puerto por defecto | Descripción |
| --- | --- | --- | --- |
| Auth | `auth-service/` | 3001 | Autenticación, emisión de JWT y soporte opcional de 2FA. |
| Users | `user-service/` | 3002 | CRUD y datos de perfil de usuarios. |
| Attendance | `attendance-service/` | 3003 | Gestión y reporte de asistencias con WebSockets. |
| Grades | `grades-service/` | 3004 | Registro y consulta de calificaciones con WebSockets. |
| Classes | `classes-service/` | 3005 | Administración de clases y horarios. |
| Asignation (Estudiantes) | `asignation-service/` | 3007 | Asignación de estudiantes a cursos. |
| Asignation (Docentes) | `asignation-prof-service/` | 3008 | Asignación de docentes a cursos, con soporte de eventos. |
| Asignation Curso | `asignation-curso-service/` | 3009 | Gestión de asignaciones por curso y generación de matrículas. |
| Registry | `registry-service/` | 3011 | Formularios ministeriales y fichas internas de estudiantes con validación por DNI. |

Cada servicio expone su propio Express (`app.js`) y apunta al esquema de base de datos correspondiente. Los scripts SQL se encuentran en `BD/`.

## Configuración

Todos los servicios consumen configuración mediante `backend/config/index.js`, que combina variables compartidas con overrides específicos. Coloca un `.env.local` en cada carpeta de servicio; la prueba de humo fallará si falta o es inválido algún valor requerido.

### `.env.local` mínimo

```ini
NODE_ENV=development
SERVICE_NAME=<nombre-del-servicio>
SERVICE_PREFIX=<PREFIJO>
PORT=<puerto-del-servicio>
DB_HOST=localhost
DB_PORT=3306
DB_USER=<usuario-db>
DB_PASSWORD=<password-db>
DB_NAME=<nombre-esquema>
JWT_SECRET=<secreto-largo-aleatorio>
CORS_ORIGIN=http://localhost:3000
```

Agrega variables específicas según el servicio (por ejemplo, `AUTH_DB_NAME`, `TWO_FACTOR_LOGIN_ENABLED`, `ASSIGNATION_DB_*`, etc.).

## Comandos

Desde la raíz del repositorio:

| Comando | Propósito |
| --- | --- |
| `npm run bootstrap:services` | Instala dependencias de todos los servicios y ejecuta la prueba de humo de configuración. |
| `npm run bootstrap:services:test-only` | Ejecuta únicamente la prueba de humo (sin reinstalar dependencias). |
| `npm run bootstrap:services:install-only` | Instala dependencias sin correr pruebas. |
| `npm run services:start` | Levanta y supervisa todos los servicios con reinicio automático ante fallos; ya incluye `asignation-curso-service`. |

Para trabajar en un servicio aislado puedes entrar a su carpeta y ejecutar `node app.js` o definir un script dedicado (`npm run dev`).

## Paquete común de middlewares

Los servicios Express comparten utilidades a través de `backend/base-middleware` (publicable como `@campus/base-middleware`). Este paquete expone:

- `httpLogger` + `createLogger` (Pino con trazas JSON y `requestId`).
- `errorHandler` para respuestas homogéneas (`status`, `message`, `requestId`, `trace`).
- `validator` basado en Zod para validar `body`, `params`, `query`, etc.
- `rbac` para control de acceso por roles con soporte JWT.

### Cómo usarlo en un servicio

```javascript
const {
	createLogger,
	httpLogger,
	errorHandler,
	validator,
	rbac,
	z,
} = require('@campus/base-middleware');

const logger = createLogger({ name: 'user-service' });
app.use(httpLogger({ logger }));
app.use(errorHandler(logger));

const ensureAdmin = rbac(['administrativo'], { jwtSecret: env.JWT_SECRET });
const createSchema = z.object({ nombre: z.string(), email: z.string().email() });

app.post('/api/users', ensureAdmin, validator(createSchema), handler);
```

Cuando se trabaje localmente, instala la dependencia vía ruta relativa (`"@campus/base-middleware": "file:../base-middleware"`).

## Base de datos

Cada microservicio es dueño de su esquema. Los SQL bajo `BD/` son la referencia oficial; impórtalos en MySQL antes de levantar el servicio correspondiente en local.

## Resolución de problemas

- **Puerto en uso**: El orquestador verifica colisiones y registrará un error si el puerto está ocupado.
- **Errores de configuración**: Ejecuta `npm run bootstrap:services:test-only` para identificar variables faltantes o mal configuradas.
- **Conectividad a la base de datos**: Revisa credenciales y que MySQL esté accesible en el host definido en tus `.env.local`.

## Guía de migración al nuevo cliente de base de datos

Todos los microservicios deben pasar de usar `mysql2` con conexiones individuales a consumir el módulo compartido `@campus/base-middleware/db`. Sigue estos pasos en cada servicio:

1. **Instala y expone el módulo**
	- Asegúrate de depender de `@campus/base-middleware` actualizado (ya incluye `mysql2`).
	- Sustituye cualquier importación directa de `mysql2` por `const { db } = require('@campus/base-middleware');`.

2. **Configura el pool una sola vez**
	- En el arranque del servicio (normalmente en `app.js`), llama a:

	  ```js
	  db.configure({
		 host: env.DB_HOST,
		 user: env.DB_USER,
		 password: env.DB_PASSWORD,
		 database: env.DB_NAME,
		 port: env.DB_PORT,
		 connectionLimit: env.DB_POOL_SIZE,
		 logger,
	  });
	  ```

	- No intentes crear múltiples pools; el módulo reutiliza automáticamente la instancia global.

3. **Reemplaza consultas puntuales**
	- Sustituye `pool.execute/query` por `await db.query(sql, params, { tag: 'servicio.recurso.accion' });`.
	- Mantén todas las consultas parametrizadas (`?`) para prevenir SQL injection.

4. **Actualiza transacciones**
	- Envuelve bloques que usaban `beginTransaction/commit` en `await db.transaction(async (tx) => { await tx.query(...); });`.
	- El cliente de transacción ya maneja reintentos y rollback seguro.

5. **Manejo de errores**
	- Deja de comprobar `error.code` directamente. Usa `error.details?.code` y compara con `db.ERROR_CODES` (`DB_DEADLOCK`, `DB_TIMEOUT`, `DB_CONN_FAIL`, `DB_DUP_ENTRY`, etc.).
	- Nunca loguees SQL crudo; utiliza las etiquetas `tag` para trazabilidad.

6. **Salud y apagado**
	- Expone `GET /healthz` en cada servicio y delega en `db.healthCheck()` para reportar 200/503.
	- No necesitas manualmente cerrar el pool: el módulo registra manejadores de señal (`SIGINT`, `SIGTERM`, `SIGQUIT`, `beforeExit`).

### Ejemplo antes/después (repositorio)

```js
// Antes
async function getUserById(id) {
  const [rows] = await pool.execute('SELECT id, nombre FROM usuarios WHERE id = ?', [id]);
  return rows[0] || null;
}

// Después
async function getUserById(id) {
  const [user] = await db.query(
	 'SELECT id, nombre FROM usuarios WHERE id = ?',
	 [id],
	 { tag: 'user.repo.getById' },
  );
  return user ?? null;
}
```

Con esta migración obtienes un pool único por servicio, reintentos con backoff, sanitización de errores y métricas homogéneas para observabilidad.
  