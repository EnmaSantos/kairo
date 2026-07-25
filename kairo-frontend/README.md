# Kairo frontend

The Kairo client is a React 19 application built with strict TypeScript and Vite.

## Requirements

- Node.js 20.19 or newer
- npm
- The Kairo FastAPI server running on `http://127.0.0.1:8000`

## Environment

Copy `.env.example` to `.env` and configure the client:

```env
VITE_API_URL=http://127.0.0.1:8000
VITE_GOOGLE_CLIENT_ID=placeholder-client-id
```

`VITE_API_URL` is optional and defaults to the local FastAPI address.

## Commands

```bash
npm ci
npm run dev
```

The development server runs at [http://localhost:3000](http://localhost:3000).

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the Vite development server |
| `npm run typecheck` | Check the strict TypeScript project |
| `npm test` | Run the Vitest test suite once |
| `npm run test:watch` | Run tests in watch mode |
| `npm run build` | Type-check and create a production build |
| `npm run preview` | Preview the production build |
| `npm run screenshots` | Capture the product gallery with Playwright |

## Stack

- React 19 + TypeScript
- Vite
- Vitest + Testing Library
- Axios
- Anime.js
- Leaflet / React Leaflet
- React Calendar
