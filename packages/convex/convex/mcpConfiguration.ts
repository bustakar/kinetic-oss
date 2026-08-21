export type McpEnvironment = Record<string, string | undefined>

export type McpConfiguration = {
  resource: string
  authorizationServer: string
}

export function readMcpConfiguration(
  environment: McpEnvironment,
): McpConfiguration | undefined {
  const resource = environment.MCP_RESOURCE_URL?.trim()
  const authorizationServer = environment.WORKOS_AUTHKIT_DOMAIN?.trim()

  if (!resource && !authorizationServer) return undefined
  if (!resource || !authorizationServer) {
    throw new Error(
      'MCP_RESOURCE_URL and WORKOS_AUTHKIT_DOMAIN must be configured together',
    )
  }

  return {
    resource: validateResource(resource),
    authorizationServer: validateAuthorizationServer(authorizationServer),
  }
}

function validateResource(value: string): string {
  const url = new URL(value)
  if (
    !secureOrLoopback(url) ||
    url.username ||
    url.password ||
    url.pathname !== '/mcp' ||
    url.search ||
    url.hash
  ) {
    throw new Error('MCP_RESOURCE_URL must be an HTTPS URL ending in /mcp')
  }
  return url.href.replace(/\/$/, '')
}

function validateAuthorizationServer(value: string): string {
  const url = new URL(value)
  if (
    !secureOrLoopback(url) ||
    url.username ||
    url.password ||
    (url.pathname !== '/' && url.pathname !== '') ||
    url.search ||
    url.hash
  ) {
    throw new Error('WORKOS_AUTHKIT_DOMAIN must be an HTTPS origin')
  }
  return url.origin
}

function secureOrLoopback(url: URL): boolean {
  if (url.protocol === 'https:') return true
  return (
    url.protocol === 'http:' &&
    ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)
  )
}
