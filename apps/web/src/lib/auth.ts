export type AuthEnvironment = Record<string, string | undefined>

const requiredVariables = [
  'WORKOS_API_KEY',
  'WORKOS_CLIENT_ID',
  'WORKOS_REDIRECT_URI',
  'WORKOS_COOKIE_PASSWORD',
] as const

export function validateAuthEnvironment(environment: AuthEnvironment): void {
  const missing = requiredVariables.filter(
    (variable) => !environment[variable]?.trim(),
  )
  if (missing.length > 0) {
    throw new Error(`Missing WorkOS environment: ${missing.join(', ')}`)
  }

  if (!environment.WORKOS_API_KEY?.startsWith('sk_')) {
    throw new Error('WORKOS_API_KEY must start with sk_')
  }
  if (!environment.WORKOS_CLIENT_ID?.startsWith('client_')) {
    throw new Error('WORKOS_CLIENT_ID must start with client_')
  }
  if ((environment.WORKOS_COOKIE_PASSWORD?.length ?? 0) < 32) {
    throw new Error('WORKOS_COOKIE_PASSWORD must contain at least 32 characters')
  }

  const redirectUri = new URL(environment.WORKOS_REDIRECT_URI!)
  if (redirectUri.pathname !== '/api/auth/callback') {
    throw new Error('WORKOS_REDIRECT_URI must end at /api/auth/callback')
  }
  if (redirectUri.protocol !== 'https:' && redirectUri.hostname !== 'localhost') {
    throw new Error('WORKOS_REDIRECT_URI must use HTTPS outside localhost')
  }
}

export function safeReturnPath(value: unknown): string {
  if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//')) {
    return '/'
  }

  try {
    const url = new URL(value, 'https://kinetic.invalid')
    return url.origin === 'https://kinetic.invalid'
      ? `${url.pathname}${url.search}${url.hash}`
      : '/'
  } catch {
    return '/'
  }
}

export function signInEndpoint(returnPath: unknown): string {
  return `/api/auth/sign-in?returnPathname=${encodeURIComponent(safeReturnPath(returnPath))}`
}

export function userDisplayName(user: {
  firstName?: string | null
  lastName?: string | null
  email: string
}): string {
  return (
    [user.firstName, user.lastName].filter(Boolean).join(' ').trim() ||
    user.email.split('@')[0] ||
    'Kinetic member'
  )
}
