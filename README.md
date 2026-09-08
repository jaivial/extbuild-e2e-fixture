# SAGE Dashboard v2 — React SPA

A full **Vite + React + TypeScript + React Router v7 + Tailwind v4** re-implementation
of the dark-themed Hermes/SAGE v2 dashboard. The Python backend (FastAPI on `:8401`)
still owns data, auth and live telemetry; this project is a pure client that consumes
its REST + WebSocket APIs.

## Stack
- Vite 8, React 19, TypeScript
- React Router v7 (`createBrowserRouter` data router)
- Tailwind CSS v4 (`@tailwindcss/vite`) with the ported dark design tokens
- lucide-react icons

## Structure
```
src/
  main.tsx            RouterProvider entry
  router.tsx          route table (RR v7)
  index.css           Tailwind + dark theme tokens/components
  lib/
    api.ts            fetch client (credentials: include)
    hooks.ts          useApi (polling) + useControlCenterSocket (WS)
    types.ts          shared API types
  components/
    Layout.tsx        dark shell: navbar + auth guard (/api/me) + <Outlet/>
    ui.tsx            Card, StatCard, Badge, PageHeader, Loading, …
  pages/
    Overview · TheTeam · Projects · Chats · ControlCenter · Users · Settings · Account
```

## Routes
`/` · `/the-team` · `/projects` · `/chats` · `/admin/control-center` ·
`/users` · `/admin/settings` · `/account`

## Dev
```
npm install
npm run dev      # http://localhost:5177  (proxies /api,/static,/login → SAGE_BACKEND)
```
Set `SAGE_BACKEND` to point at the FastAPI backend (default `http://127.0.0.1:8401`).

## Deploy
Served in production behind nginx at **https://hermesv3.menustudioai.com** — nginx
routes `/api`, `/ws`, `/static`, `/login`, `/logout`, `/oauth` to the backend `:8401`
and everything else to this Vite server (`sage-dashboard-v2.service`). Same-origin so
the session cookie and the Control Center WebSocket work without CORS shims.
```
npm run build    # type-check + production bundle in dist/
```
