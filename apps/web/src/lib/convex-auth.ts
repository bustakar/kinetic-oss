type TokenSource = {
  getAccessToken: () => Promise<string | null | undefined>
  refresh: () => Promise<string | null | undefined>
}

export function createAccessTokenFetcher(
  userPresent: boolean,
  source: TokenSource,
) {
  return async (
    { forceRefreshToken = false }: { forceRefreshToken?: boolean } = {},
  ) => {
    if (!userPresent) return null

    return (
      (await (forceRefreshToken
        ? source.refresh()
        : source.getAccessToken())) ?? null
    )
  }
}

export function validateConvexUrl(value: unknown): string {
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error('VITE_CONVEX_URL is required')
  }

  const url = new URL(value)
  const loopback =
    url.hostname === 'localhost' ||
    url.hostname === '127.0.0.1' ||
    url.hostname === '[::1]'

  if (url.protocol !== 'https:' && !(url.protocol === 'http:' && loopback)) {
    throw new Error('VITE_CONVEX_URL must use HTTPS outside loopback')
  }

  return url.origin
}
