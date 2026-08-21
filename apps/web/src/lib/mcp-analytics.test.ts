import assert from 'node:assert/strict'
import test from 'node:test'

import { PostHogMCPAnalyticsProperty } from '@posthog/mcp'

import {
  readMcpAnalyticsConfig,
  sanitizeMcpAnalyticsEvent,
} from '../server/mcp-analytics.ts'

test('reads dedicated MCP analytics configuration', () => {
  assert.deepEqual(
    readMcpAnalyticsConfig({
      POSTHOG_HOST: 'https://us.i.posthog.com/',
      POSTHOG_PROJECT_TOKEN: 'phc_server',
      VITE_DEPLOYMENT: 'production',
      VITE_POSTHOG_HOST: 'https://fallback.example',
      VITE_POSTHOG_KEY: 'phc_fallback',
    }),
    {
      deployment: 'production',
      host: 'https://us.i.posthog.com',
      token: 'phc_server',
    },
  )
})

test('falls back to the existing public PostHog configuration', () => {
  assert.deepEqual(
    readMcpAnalyticsConfig({
      VITE_DEPLOYMENT: 'preview',
      VITE_POSTHOG_HOST: 'https://eu.i.posthog.com',
      VITE_POSTHOG_KEY: 'phc_public',
    }),
    {
      deployment: 'preview',
      host: 'https://eu.i.posthog.com',
      token: 'phc_public',
    },
  )
})

test('removes MCP request and response details from events', async () => {
  const sanitized = await sanitizeMcpAnalyticsEvent({
    distinct_id: 'user_123',
    event: '$mcp_tool_call',
    properties: {
      [PostHogMCPAnalyticsProperty.Parameters]: { query: 'private' },
      [PostHogMCPAnalyticsProperty.Response]: { exercise: 'private' },
      [PostHogMCPAnalyticsProperty.ErrorMessage]: 'private',
      [PostHogMCPAnalyticsProperty.ClientUserAgent]: 'private',
      [PostHogMCPAnalyticsProperty.VendorClient]: 'private',
      [PostHogMCPAnalyticsProperty.ToolName]: 'list_exercises',
    },
    timestamp: new Date(0).toISOString(),
    type: 'capture',
  })

  assert.deepEqual(sanitized?.properties, {
    [PostHogMCPAnalyticsProperty.ToolName]: 'list_exercises',
  })
})
