# Kinetic Web

Copy `.env.example` to `.env` and use credentials from the existing Kinetic
WorkOS project.

For local development, configure these WorkOS redirects:

- Redirect URI: `http://localhost:3000/api/auth/callback`
- Sign-in URL: `http://localhost:3000/api/auth/sign-in`
- Sign-out redirect: `http://localhost:3000/`

`WORKOS_API_KEY` and `WORKOS_COOKIE_PASSWORD` are server-only. Never expose
them through `VITE_*` variables.
