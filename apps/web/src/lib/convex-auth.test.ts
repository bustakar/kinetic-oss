import assert from 'node:assert/strict'
import test from 'node:test'

import {
  createAccessTokenFetcher,
  validateConvexUrl,
} from './convex-auth.ts'

test('uses WorkOS access tokens and refreshes when Convex requests it', async () => {
  let accessTokenRequests = 0
  let refreshRequests = 0
  const fetchToken = createAccessTokenFetcher(true, {
    getAccessToken: async () => {
      accessTokenRequests += 1
      return 'current-token'
    },
    refresh: async () => {
      refreshRequests += 1
      return 'fresh-token'
    },
  })

  assert.equal(await fetchToken(), 'current-token')
  assert.equal(await fetchToken({ forceRefreshToken: true }), 'fresh-token')
  assert.equal(accessTokenRequests, 1)
  assert.equal(refreshRequests, 1)
})

test('does not request a token without a WorkOS user', async () => {
  let tokenRequested = false
  const fetchToken = createAccessTokenFetcher(false, {
    getAccessToken: async () => {
      tokenRequested = true
      return 'token'
    },
    refresh: async () => {
      tokenRequested = true
      return 'token'
    },
  })

  assert.equal(await fetchToken(), null)
  assert.equal(tokenRequested, false)
})

test('allows loopback HTTP without weakening hosted Convex URLs', () => {
  assert.equal(
    validateConvexUrl('https://example.convex.cloud/'),
    'https://example.convex.cloud',
  )
  assert.equal(
    validateConvexUrl('http://127.0.0.1:44101/'),
    'http://127.0.0.1:44101',
  )
  assert.throws(
    () => validateConvexUrl('http://example.convex.cloud'),
    /HTTPS/,
  )
})
