import {
  AuthKitProvider,
  useAccessToken,
  useAuth,
  type AuthKitProviderProps,
} from '@workos/authkit-tanstack-react-start/client'
import { ConvexProviderWithAuth, ConvexReactClient } from 'convex/react'
import { useCallback, useMemo, type ReactNode } from 'react'

import {
  createAccessTokenFetcher,
  validateConvexUrl,
} from '@/lib/convex-auth'

let browserClient: ConvexReactClient | undefined

function useAuthFromAuthKit() {
  const { loading, user } = useAuth()
  const { getAccessToken, refresh } = useAccessToken()
  const fetchAccessToken = useCallback(
    createAccessTokenFetcher(Boolean(user), { getAccessToken, refresh }),
    [getAccessToken, refresh, user],
  )

  return useMemo(
    () => ({
      isLoading: loading,
      isAuthenticated: Boolean(user),
      fetchAccessToken,
    }),
    [fetchAccessToken, loading, user],
  )
}

function createConvexClient() {
  const url = validateConvexUrl(import.meta.env.VITE_CONVEX_URL)

  if (typeof window === 'undefined') return new ConvexReactClient(url)

  browserClient ??= new ConvexReactClient(url)
  return browserClient
}

export function AuthenticatedConvexProvider({
  children,
  initialAuth,
}: {
  children: ReactNode
  initialAuth: AuthKitProviderProps['initialAuth']
}) {
  const client = useMemo(createConvexClient, [])

  return (
    <AuthKitProvider initialAuth={initialAuth}>
      <ConvexProviderWithAuth client={client} useAuth={useAuthFromAuthKit}>
        {children}
      </ConvexProviderWithAuth>
    </AuthKitProvider>
  )
}
