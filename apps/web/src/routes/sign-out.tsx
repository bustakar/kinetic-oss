import { createFileRoute } from '@tanstack/react-router'
import { signOut } from '@workos/authkit-tanstack-react-start'

import { validateAuthEnvironment } from '@/lib/auth'

export const Route = createFileRoute('/sign-out')({
  loader: async () => {
    validateAuthEnvironment(process.env)
    await signOut()
  },
  pendingComponent: () => (
    <main className="grid min-h-svh place-items-center p-6 text-sm text-muted-foreground">
      Signing out…
    </main>
  ),
})
