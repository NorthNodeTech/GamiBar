# GamiBar frontend

GamiBar is a conventional client-rendered React application built with Vite. It does not use
TanStack Start, server-side rendering, or hydration.

## Structure

- `index.html` is the browser entry document.
- `src/main.tsx` mounts React with `createRoot`.
- `src/App.tsx` owns the React Router route table and application providers.
- `src/pages` contains route-level screens with descriptive filenames.
- `src/components` contains reusable UI.
- `src/lib` contains browser-only API, auth, state, and Realtime clients.
- `../shared/game` contains pure game-domain code shared with the Express API.

All database writes and ordinary database reads go through the Express backend. The browser
Supabase client is limited to Auth and Realtime subscriptions.

## Local development

```powershell
npm.cmd install
npm.cmd run dev
```

The Vite server starts on `http://localhost:8080` and proxies `/api` to the Express server on
`http://localhost:8787` by default.

## Verification

```powershell
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run build
```
