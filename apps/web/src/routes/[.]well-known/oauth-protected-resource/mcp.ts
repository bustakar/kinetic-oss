import { createFileRoute } from '@tanstack/react-router'

import { protectedResourceMetadata } from '@/server/mcp-metadata'

export const Route = createFileRoute(
  '/.well-known/oauth-protected-resource/mcp',
)({ server: { handlers: { GET: protectedResourceMetadata } } })
