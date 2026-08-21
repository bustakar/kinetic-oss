# Kinetic Web

Copy `.env.example` to `.env` and use credentials from the existing Kinetic
WorkOS project. Set `VITE_CONVEX_URL` to this repository's Convex deployment;
do not point it at the existing Kinetic backend.

For local development, configure these WorkOS redirects:

- Redirect URI: `http://localhost:3000/api/auth/callback`
- Sign-in URL: `http://localhost:3000/api/auth/sign-in`
- Sign-out redirect: `http://localhost:3000/`

`WORKOS_API_KEY` and `WORKOS_COOKIE_PASSWORD` are server-only. Never expose
them through `VITE_*` variables.

Set `WORKOS_CLIENT_ID` on each new Convex deployment, then run `pnpm dev` from
`packages/convex` to sync the authentication configuration. Reusing the client
ID only lets the new deployment validate the same WorkOS access tokens; it does
not modify the existing Convex deployment or WorkOS project.
