import { readMcpConfiguration } from '@kinetic/convex/mcp-configuration'

export function protectedResourceMetadata(): Response {
  const configuration = requiredConfiguration()
  return Response.json(
    {
      resource: configuration.resource,
      authorization_servers: [configuration.authorizationServer],
      bearer_methods_supported: ['header'],
      scopes_supported: ['openid', 'profile', 'email', 'offline_access'],
    },
    { headers: { 'Cache-Control': 'public, max-age=300' } },
  )
}

export async function authorizationServerMetadata(): Promise<Response> {
  const { authorizationServer } = requiredConfiguration()
  const upstream = await fetch(
    `${authorizationServer}/.well-known/oauth-authorization-server`,
  )
  return new Response(upstream.body, {
    status: upstream.status,
    headers: {
      'Cache-Control': 'public, max-age=300',
      'Content-Type':
        upstream.headers.get('Content-Type') ?? 'application/json',
    },
  })
}

function requiredConfiguration() {
  const configuration = readMcpConfiguration(process.env)
  if (!configuration) throw new Error('MCP authentication is not configured')
  return configuration
}
