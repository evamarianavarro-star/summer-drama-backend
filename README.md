# Summer Drama Academy — Backend

Servidor que guarda el progreso de la app en una base de datos PostgreSQL,
para poder consultarlo desde el panel de control.

## Variables de entorno necesarias en Render:
- DATABASE_URL (la genera Render automáticamente al conectar la base de datos)
- ADMIN_PASSWORD (la contraseña que tú elijas para entrar al panel)

## Endpoints:
- POST /api/session — guarda una sesión completada
- GET /api/state — estado general
- POST /api/admin/login — login del panel
- GET /api/admin/sessions?password=XXX — histórico completo
