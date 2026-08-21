import assert from 'node:assert/strict'
import test from 'node:test'

import {
  safeReturnPath,
  signInEndpoint,
  validateAuthEnvironment,
} from './auth.ts'

const validEnvironment = {
  WORKOS_API_KEY: 'sk_test_example',
  WORKOS_CLIENT_ID: 'client_example',
  WORKOS_REDIRECT_URI: 'https://kinetic.example/api/auth/callback',
  WORKOS_COOKIE_PASSWORD: 'a-secure-cookie-password-with-32-characters',
}

test('accepts complete WorkOS configuration', () => {
  assert.doesNotThrow(() => validateAuthEnvironment(validEnvironment))
})

test('rejects weak secrets and insecure production redirects', () => {
  assert.throws(
    () =>
      validateAuthEnvironment({
        ...validEnvironment,
        WORKOS_COOKIE_PASSWORD: 'short',
      }),
    /32 characters/,
  )
  assert.throws(
    () =>
      validateAuthEnvironment({
        ...validEnvironment,
        WORKOS_REDIRECT_URI: 'http://kinetic.example/api/auth/callback',
      }),
    /HTTPS/,
  )
})

test('keeps local return paths and rejects external redirects', () => {
  assert.equal(safeReturnPath('/routines/abc?tab=sets'), '/routines/abc?tab=sets')
  assert.equal(safeReturnPath('https://example.com'), '/')
  assert.equal(safeReturnPath('//example.com'), '/')
  assert.equal(signInEndpoint('/programs'), '/api/auth/sign-in?returnPathname=%2Fprograms')
})
