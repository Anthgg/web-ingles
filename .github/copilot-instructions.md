# Copilot Instructions for goenglish Codebase

## Architecture Overview
- **Monorepo structure**: Contains `frontend` (React app) and `backend` (Node.js microservices) folders.
- **Backend services**: Each service (auth, user, attendance, grades, classes, asignation) is a standalone Node.js Express app in its own folder under `backend/`, with its own `app.js` and `package.json`.
- **Service orchestration**: The script `backend/run/app.js` launches all backend services as child processes, auto-restarting on failure. Each service runs on a dedicated port (see `run/app.js`).
- **Frontend**: Located in `frontend/`, built with Create React App. Main entry: `src/App.jsx`.
- **Database**: SQL files in `BD/` folder define schemas for each service (e.g., `instenglish_auth.sql`).

## Developer Workflows
- **Start all backend services**: Run `node backend/run/app.js` from the project root or `backend/run/`.
- **Start frontend**: Run `npm start` in `frontend/`.
- **Build frontend**: Run `npm run build` in `frontend/`.
- **No automated backend tests**: Each backend service has a placeholder test script.
- **Environment variables**: Backend services use environment variables for DB credentials and secrets. Set via `.env` or process environment.

## Conventions & Patterns
- **Express + MySQL**: All backend services use Express and MySQL2. Auth service adds JWT, bcryptjs, speakeasy, qrcode for authentication and 2FA.
- **Service boundaries**: No shared code between services; communicate via HTTP APIs (not via direct imports).
- **Error handling**: Each service logs errors to stderr; orchestrator auto-restarts failed services.
- **Frontend structure**: Components organized by role (`admin/`, `alumno/`, `docente/`, `components/`).
- **Spanish naming**: Many files, variables, and comments use Spanish (e.g., `AsignacionEstudiantes`, `ClasesList`).

## Integration Points
- **Frontend-backend communication**: Frontend calls backend services via HTTP (fetch/axios), using service ports defined in `run/app.js`.
- **Database**: Each service connects to its own database (see SQL files in `BD/`).
- **Authentication**: Auth service provides JWT and optional 2FA endpoints.

## Examples
- To add a new backend service, create a new folder under `backend/`, add `app.js` and `package.json`, then update `backend/run/app.js` to include it in orchestration.
- To debug a backend service, run its `app.js` directly (e.g., `node backend/auth-service/app.js`).
- To change DB schema, edit the relevant SQL file in `BD/` and update service code accordingly.

---
If any section is unclear or missing details, please provide feedback to improve these instructions.