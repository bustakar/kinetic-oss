import assert from 'node:assert/strict'
import test from 'node:test'

import { analyticsEvents, createAnalytics } from './index.ts'

test('stays a safe no-op without a client', () => {
  const analytics = createAnalytics({
    deployment: 'preview',
    surface: 'web',
  })

  assert.doesNotThrow(() => {
    analytics.capture('exercise_created')
    analytics.identify('user_123')
    analytics.reset()
  })
})

test('adds common dimensions to every typed event', () => {
  const captures: Array<{
    event: string
    properties?: Record<string, unknown>
  }> = []
  const analytics = createAnalytics({
    client: {
      capture: (event, properties) => captures.push({ event, properties }),
      identify: () => undefined,
      reset: () => undefined,
    },
    deployment: 'production',
    surface: 'web',
  })

  for (const event of analyticsEvents) analytics.capture(event)

  assert.deepEqual(
    captures,
    analyticsEvents.map((event) => ({
      event,
      properties: { surface: 'web', deployment: 'production' },
    })),
  )
})

test('forwards only the stable identity and resets the client', () => {
  const identified: string[] = []
  let reset = false
  const analytics = createAnalytics({
    client: {
      capture: () => undefined,
      identify: (userId) => identified.push(userId),
      reset: () => {
        reset = true
      },
    },
    deployment: 'preview',
    surface: 'web',
  })

  analytics.identify('user_123')
  analytics.reset()

  assert.deepEqual(identified, ['user_123'])
  assert.equal(reset, true)
})
