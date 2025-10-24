# Plataforma GoEnglish

Monorepo de la plataforma GoEnglish con un frontend en React y un conjunto de microservicios Node.js que gestionan autenticación, usuarios, asistencias, calificaciones, clases y asignaciones.

## Requisitos previos

- Node.js 18+
- npm 9+
- MySQL 8 (un esquema por servicio; revisa los archivos SQL en `BD/`)

## Puesta en marcha del workspace

1. Clona el repositorio e instala las dependencias raíz:
   ```powershell
   npm install
   ```
2. Ejecuta el bootstrap de los microservicios (instala paquetes y valida la configuración mínima de cada servicio):
   ```powershell
   npm run bootstrap:services
   ```
3. Crea un archivo `.env.local` dentro de **cada** carpeta de servicio y completa las variables descritas en `backend/README.md`.

> ⚠️ Los archivos de entorno **no** se versionan. Intercambia credenciales y secretos por un canal seguro.

## Ejecución del stack

- **Levantar todos los servicios backend a la vez**
  ```powershell
  npm run services:start
  ```
  El orquestador ubicado en `backend/run/app.js` inicia cada microservicio, enruta sus logs a la consola y reinicia automáticamente cualquier servicio que falle. Incluye el servicio adicional `asignation-curso-service` (puerto 3009).

- **Levantar el frontend**
  ```powershell
  cd frontend
  npm install
  npm start
  ```

## Scripts útiles

| Comando | Descripción |
| --- | --- |
| `npm run bootstrap:services` | Instala dependencias de cada microservicio y ejecuta la prueba de humo de configuración. |
| `npm run bootstrap:services:test-only` | Vuelve a correr solo la prueba de humo (sin reinstalar dependencias). |
| `npm run bootstrap:services:install-only` | Instala dependencias sin ejecutar pruebas. |
| `npm run services:start` | Arranca todos los microservicios con el orquestador y mantiene reinicios automáticos. |

## Estructura principal del repositorio

```
backend/      # Microservicios Node.js y scripts de orquestación
frontend/     # Aplicación React (Create React App)
BD/           # Scripts SQL con los esquemas de cada servicio
```

Consulta `backend/README.md` y `frontend/README.md` para detalles específicos de cada capa.

## Repository Setup & Clean Builds

Para mantener el historial limpio y evitar despliegues inconsistentes, los artefactos generados no deben versionarse. Plataformas de CI/CD y hosting (Vercel, Netlify, Render, etc.) ejecutan sus propios builds a partir del código fuente, por lo que incluir directorios generados provoca diffs ruidosos y binarios obsoletos.

### Cambios clave en `.gitignore`

| Antes | Después |
| --- | --- |
| (sin reglas para artefactos) | ```
frontend/build/
backend/**/dist/
*.log
.env*
.DS_Store
Thumbs.db
``` |

### Pasos de limpieza (ejecutar desde la raíz)

```powershell
git rm -r --cached frontend/build
git rm -r --cached backend/**/dist
git rm --cached *.log
git rm --cached .env*
git commit -m "chore: remove build artifacts and update gitignore"
```

> ℹ️ Ajusta los comandos `git rm` según los artefactos que ya existan en tu copia local. Una vez eliminados del índice, los directorios seguirán existiendo, pero Git dejará de rastrear su contenido.

### Después de sincronizar

1. Actualiza dependencias si es necesario.
2. Genera los builds localmente cuando los necesites:
  ```powershell
  cd frontend
  npm run build
  ```
  ```powershell
  cd ../backend/<servicio>
  npm run build # o el script equivalente del servicio
  ```
3. Evita cometer los directorios `build/` o `dist/`; la pipeline los reconstruirá automáticamente al desplegar.
