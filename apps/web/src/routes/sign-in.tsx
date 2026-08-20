import { Button } from '@kinetic/ui/components/button'
import { createFileRoute, redirect } from '@tanstack/react-router'
import { getAuth } from '@workos/authkit-tanstack-react-start'

import {
  safeReturnPath,
  signInEndpoint,
  validateAuthEnvironment,
} from '@/lib/auth'

type SignInSearch = {
  error?: string
  returnPathname?: string
}

export const Route = createFileRoute('/sign-in')({
  validateSearch: (search): SignInSearch => ({
    error: typeof search.error === 'string' ? search.error : undefined,
    returnPathname:
      typeof search.returnPathname === 'string'
        ? safeReturnPath(search.returnPathname)
        : undefined,
  }),
  loaderDeps: ({ search }) => search,
  loader: async ({ deps }) => {
    validateAuthEnvironment(process.env)
    const { user } = await getAuth()
    if (user) throw redirect({ href: safeReturnPath(deps.returnPathname) })
    if (!deps.error) throw redirect({ href: signInEndpoint(deps.returnPathname) })
  },
  component: SignInPage,
})

function SignInPage() {
  const search = Route.useSearch()

  return (
    <main className="grid min-h-svh place-items-center p-6">
      <div className="flex w-full max-w-sm flex-col items-center gap-5 text-center">
        <img src="/kinetic-icon.svg" alt="" className="size-12 rounded-xl" />
        <div className="space-y-2">
          <h1 className="text-xl font-semibold">Sign in to Kinetic</h1>
          <p role="alert" className="text-sm text-muted-foreground">
            Sign-in could not be completed. Please try again.
          </p>
        </div>
        <Button asChild className="w-full">
          <a href={signInEndpoint(search.returnPathname)}>Continue with AuthKit</a>
        </Button>
      </div>
    </main>
  )
}
