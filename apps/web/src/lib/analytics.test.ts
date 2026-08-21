import assert from 'node:assert/strict'
import test from 'node:test'

import {
  createWebAnalytics,
  postHogOptions,
  readAnalyticsConfig,
} from './analytics.ts'

const config = {
  VITE_POSTHOG_KEY: 'phc_example',
  VITE_POSTHOG_HOST: 'https://us.i.posthog.com/',
  VITE_DEPLOYMENT: 'preview',
}

test('enables analytics only with complete valid public configuration', () => {
  assert.deepEqual(readAnalyticsConfig(config), {
    key: 'phc_example',
    host: 'https://us.i.posthog.com',
    deployment: 'preview',
  })
  assert.equal(readAnalyticsConfig({}), undefined)
  assert.equal(
    readAnalyticsConfig({ ...config, VITE_POSTHOG_KEY: undefined }),
    undefined,
  )
  assert.equal(
    readAnalyticsConfig({ ...config, VITE_DEPLOYMENT: 'development' }),
    undefined,
  )
})

test('stays a safe no-op without configuration', () => {
  let calls = 0
  const analytics = createWebAnalytics(undefined, {
    capture: () => (calls += 1),
    identify: () => (calls += 1),
    reset: () => (calls += 1),
  })

  analytics.capture('exercise_created')
  analytics.capturePageView('https://kinetic.rocks/exercises')
  analytics.identify('user_123')
  analytics.reset()

  assert.equal(calls, 0)
})

test('disables passive collection while preserving campaign attribution', () => {
  const analyticsConfig = readAnalyticsConfig(config)
  assert.ok(analyticsConfig)

  assert.deepEqual(
    {
      autocapture: postHogOptions(analyticsConfig).autocapture,
      capturePageView: postHogOptions(analyticsConfig).capture_pageview,
      capturePageLeave: postHogOptions(analyticsConfig).capture_pageleave,
      capturePerformance: postHogOptions(analyticsConfig).capture_performance,
      captureExceptions: postHogOptions(analyticsConfig).capture_exceptions,
      sessionReplay: postHogOptions(analyticsConfig).disable_session_recording,
      featureFlags: postHogOptions(analyticsConfig).advanced_disable_feature_flags,
      campaignParams: postHogOptions(analyticsConfig).save_campaign_params,
    },
    {
      autocapture: false,
      capturePageView: false,
      capturePageLeave: false,
      capturePerformance: false,
      captureExceptions: false,
      sessionReplay: true,
      featureFlags: true,
      campaignParams: true,
    },
  )
})

test('sanitizes page-view URLs and identifies with only the WorkOS ID', () => {
  const captures: Array<{
    event: string
    properties?: Record<string, unknown>
  }> = []
  const identified: string[] = []
  const analytics = createWebAnalytics(readAnalyticsConfig(config), {
    capture: (event, properties) => captures.push({ event, properties }),
    identify: (distinctId) => identified.push(distinctId),
    reset: () => undefined,
  })

  analytics.capturePageView('https://kinetic.rocks/exercises?note=private#edit')
  analytics.identify('user_123')

  assert.deepEqual(captures, [
    {
      event: '$pageview',
      properties: {
        surface: 'web',
        deployment: 'preview',
        $current_url: 'https://kinetic.rocks/exercises',
      },
    },
  ])
  assert.deepEqual(identified, ['user_123'])
})
