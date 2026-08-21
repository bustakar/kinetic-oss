import { createFileRoute } from '@tanstack/react-router'

import { authorizationServerMetadata } from '@/server/mcp-metadata'

export const Route = createFileRoute('/.well-known/oauth-authorization-server')({
  server: { handlers: { GET: authorizationServerMetadata } },
})
