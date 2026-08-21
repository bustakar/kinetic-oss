import {
  OAuthError,
  OAuthErrorCode,
  type AuthInfo,
  type OAuthTokenVerifier,
} from '@modelcontextprotocol/server'
import type { McpConfiguration } from '@kinetic/convex/mcp-configuration'
import { createRemoteJWKSet, jwtVerify, type JWTPayload } from 'jose'

export function createWorkosTokenVerifier(
  configuration: McpConfiguration,
): OAuthTokenVerifier {
  const jwks = createRemoteJWKSet(
    new URL(`${configuration.authorizationServer}/oauth2/jwks`),
  )

  return {
    async verifyAccessToken(token) {
      try {
        const { payload } = await jwtVerify(token, jwks, {
          issuer: configuration.authorizationServer,
          audience: configuration.resource,
        })
        return authInfo(token, payload, configuration.resource)
      } catch {
        throw new OAuthError(
          OAuthErrorCode.InvalidToken,
          'The access token is invalid or expired.',
        )
      }
    },
  }
}

let cachedVerifier:
  | { key: string; verifier: OAuthTokenVerifier }
  | undefined

export function workosTokenVerifier(
  configuration: McpConfiguration,
): OAuthTokenVerifier {
  const key = `${configuration.authorizationServer}\n${configuration.resource}`
  if (cachedVerifier?.key === key) return cachedVerifier.verifier

  const verifier = createWorkosTokenVerifier(configuration)
  cachedVerifier = { key, verifier }
  return verifier
}

export function authInfo(
  token: string,
  payload: JWTPayload,
  resource: string,
): AuthInfo {
  if (!payload.sub || !payload.exp) {
    throw new OAuthError(
      OAuthErrorCode.InvalidToken,
      'The access token is missing required claims.',
    )
  }

  return {
    token,
    clientId:
      stringClaim(payload.client_id) ?? stringClaim(payload.azp) ?? 'unknown',
    scopes: scopes(payload),
    expiresAt: payload.exp,
    resource: new URL(resource),
    extra: { subject: payload.sub },
  }
}

function scopes(payload: JWTPayload): string[] {
  if (typeof payload.scope === 'string') {
    return payload.scope.split(' ').filter(Boolean)
  }
  return Array.isArray(payload.scp)
    ? payload.scp.filter((scope): scope is string => typeof scope === 'string')
    : []
}

function stringClaim(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined
}
