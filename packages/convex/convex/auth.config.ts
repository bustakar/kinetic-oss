import type { AuthConfig } from 'convex/server'

import { readMcpConfiguration } from './mcpConfiguration'

const clientId = process.env.WORKOS_CLIENT_ID

if (!clientId) {
  throw new Error('WORKOS_CLIENT_ID must be configured for this Convex deployment')
}

const jwks = `https://api.workos.com/sso/jwks/${clientId}`
const mcp = readMcpConfiguration(process.env)
const mcpProviders: AuthConfig['providers'] = mcp
  ? [
      {
        type: 'customJwt',
        issuer: mcp.authorizationServer,
        algorithm: 'RS256',
        jwks: `${mcp.authorizationServer}/oauth2/jwks`,
        applicationID: mcp.resource,
      },
    ]
  : []

export default {
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
    ...mcpProviders,
  ],
} satisfies AuthConfig
