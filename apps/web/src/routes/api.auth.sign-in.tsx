import { createFileRoute } from '@tanstack/react-router'
import { getSignInUrl } from '@workos/authkit-tanstack-react-start'

import { safeReturnPath, validateAuthEnvironment } from '@/lib/auth'

export const Route = createFileRoute('/api/auth/sign-in')({
  server: {
    handlers: {
      GET: async ({ request }: { request: Request }) => {
        validateAuthEnvironment(process.env)
        const requestedPath = new URL(request.url).searchParams.get('returnPathname')
        const url = await getSignInUrl({
          data: { returnPathname: safeReturnPath(requestedPath) },
        })
        return new Response(null, {
          status: 307,
          headers: { Location: url },
        })
      },
    },
  },
})
