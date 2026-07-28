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
VITE_GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
```

`VITE_API_URL` is optional and defaults to the local FastAPI address.

For Google sign-in, use a Google OAuth **Web application** client and add both
`http://localhost:3000` and `http://127.0.0.1:3000` as authorized JavaScript
origins. Its client ID must exactly match `GOOGLE_CLIENT_ID` in the project-root
`.env`. Client IDs are public identifiers, so the project can commit the same
value in both `.env.example` files for local clones; never commit a client
secret.

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
