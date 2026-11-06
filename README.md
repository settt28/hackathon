# Sistema Preventivo El Niño

Monorepo fullstack: API en .NET 9 + SPA en React (Vite + TypeScript + Tailwind CSS).

## Estructura

```
backend/                      Solución ElNino.sln (Clean Architecture)
  src/ElNino.API              Controladores, Program.cs (depende de Core e Infrastructure)
  src/ElNino.Core             Entidades e interfaces (sin dependencias)
  src/ElNino.Infrastructure   Implementaciones (repositorios) + registro DI
frontend/
  src/components              UI reutilizable (NetworkMeter, PatyChatbot, SummaryCard…)
  src/layouts                 MainLayout (Sidebar desktop / Bottom Bar móvil)
  src/pages                   Home, Salud, Agro, Infraestructura
  src/hooks                   useNetworkStatus
  src/assets                  Imágenes e íconos
```

## Ejecutar

```bash
# Backend  → http://localhost:5xxx  (ver puerto en la consola)
cd backend && dotnet run --project src/ElNino.API

# Frontend → http://localhost:5173
cd frontend && npm install && npm run dev
```

Endpoints iniciales: `GET /api/salud/alertas`, `GET /api/agricultura/alertas`, `GET /api/infraestructura/alertas`.
OpenAPI en desarrollo: `/openapi/v1.json`.
