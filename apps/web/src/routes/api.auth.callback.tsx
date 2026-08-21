import { createFileRoute } from '@tanstack/react-router'
import { handleCallbackRoute } from '@workos/authkit-tanstack-react-start'

import { validateAuthEnvironment } from '@/lib/auth'

const callbackHandler = handleCallbackRoute({
  errorRedirectUrl: '/sign-in?error=auth_failed',
})

export const Route = createFileRoute('/api/auth/callback')({
  server: {
    handlers: {
      GET: (context) => {
        validateAuthEnvironment(process.env)
        return callbackHandler(context)
      },
    },
  },
})
