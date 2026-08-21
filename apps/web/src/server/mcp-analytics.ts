import type { AnalyticsEvent, Deployment } from '@kinetic/analytics'
import type {
  AuthInfo,
  McpServer,
  ProtocolEra,
} from '@modelcontextprotocol/server'
import {
  instrument,
  PostHog,
  PostHogMCPAnalyticsProperty,
  type BeforeSendFn,
} from '@posthog/mcp'

type McpAnalyticsEnvironment = {
  POSTHOG_HOST?: string
  POSTHOG_PROJECT_TOKEN?: string
  VITE_DEPLOYMENT?: string
  VITE_POSTHOG_HOST?: string
  VITE_POSTHOG_KEY?: string
}

export type McpAnalyticsConfig = {
  deployment: Deployment
  host: string
  token: string
}

export type McpServerAnalytics = {
  capture: (event: AnalyticsEvent) => Promise<void>
}

const config = readMcpAnalyticsConfig(process.env)
const posthog = config
  ? new PostHog(config.token, {
      host: config.host,
      enableExceptionAutocapture: true,
      flushAt: 1,
      flushInterval: 0,
    })
  : undefined

export function instrumentMcpAnalytics(
  server: McpServer,
  authInfo: AuthInfo,
  era: ProtocolEra,
): McpServerAnalytics | undefined {
  if (!config || !posthog) return undefined

  const subject = authInfo.extra?.subject
  const analytics = instrument(server, posthog, {
    context: false,
    enableExceptionAutocapture: false,
    identify:
      typeof subject === 'string' && subject.length > 0
        ? { distinctId: subject }
        : null,
    eventProperties: () => ({
      deployment: config.deployment,
      oauth_client_id: authInfo.clientId,
      protocol_era: era,
      surface: 'mcp',
    }),
    beforeSend: sanitizeMcpAnalyticsEvent,
  })

  return {
    capture: (event) =>
      analytics.capture({
        event,
        properties: {
          deployment: config.deployment,
          surface: 'mcp',
        },
      }),
  }
}

export async function flushMcpAnalytics(): Promise<void> {
  try {
    await posthog?.flush()
  } catch {
    // Analytics must not affect MCP responses.
  }
}

export function readMcpAnalyticsConfig(
  environment: McpAnalyticsEnvironment,
): McpAnalyticsConfig | undefined {
  const token = (
    environment.POSTHOG_PROJECT_TOKEN ?? environment.VITE_POSTHOG_KEY
  )?.trim()
  const host = (
    environment.POSTHOG_HOST ?? environment.VITE_POSTHOG_HOST
  )?.trim()
  const deployment = environment.VITE_DEPLOYMENT?.trim()

  if (
    !token ||
    !host ||
    (deployment !== 'preview' && deployment !== 'production') ||
    !isHttpUrl(host)
  ) {
    return undefined
  }

  return {
    deployment,
    host: host.replace(/\/$/, ''),
    token,
  }
}

export const sanitizeMcpAnalyticsEvent: BeforeSendFn = (event) => {
  const properties = { ...event.properties }
  delete properties[PostHogMCPAnalyticsProperty.Parameters]
  delete properties[PostHogMCPAnalyticsProperty.Response]
  delete properties[PostHogMCPAnalyticsProperty.ErrorMessage]
  delete properties[PostHogMCPAnalyticsProperty.ClientUserAgent]
  delete properties[PostHogMCPAnalyticsProperty.VendorClient]

  return { ...event, properties }
}

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value)
    return url.protocol === 'https:' || url.protocol === 'http:'
  } catch {
    return false
  }
}
