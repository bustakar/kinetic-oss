import type { AuthConfig } from 'convex/server'

export function configuredAuth(
  environment: Record<string, string | undefined> = process.env,
): AuthConfig {
  const clientId = environment.WORKOS_CLIENT_ID?.trim()
  if (!clientId) {
    throw new Error('WORKOS_CLIENT_ID must be configured for this deployment')
  }

  const jwks = `https://api.workos.com/sso/jwks/${clientId}`
  return {
    providers: [
      {
        type: 'customJwt',
        issuer: 'https://api.workos.com/',
        algorithm: 'RS256',
        jwks,
        applicationID: clientId,
      },
      {
        type: 'customJwt',
        issuer: `https://api.workos.com/user_management/${clientId}`,
        algorithm: 'RS256',
        jwks,
      },
    ],
  }
}
