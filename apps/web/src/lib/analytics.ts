export type Deployment = 'preview' | 'production'
export type ExerciseEvent =
  | 'exercise_created'
  | 'exercise_updated'
  | 'exercise_deleted'

export type AnalyticsConfig = {
  key: string
  host: string
  deployment: Deployment
}

type PublicEnvironment = {
  VITE_POSTHOG_KEY?: string
  VITE_POSTHOG_HOST?: string
  VITE_DEPLOYMENT?: string
}

export type AnalyticsClient = {
  capture: (event: string, properties?: Record<string, unknown>) => unknown
  identify: (distinctId: string) => unknown
  reset: () => unknown
}

export type WebAnalytics = {
  captureExerciseEvent: (event: ExerciseEvent) => void
  capturePageView: (currentUrl: string) => void
  identify: (workosUserId: string) => void
  reset: () => void
}

export function postHogOptions(config: AnalyticsConfig) {
  return {
    api_host: config.host,
    autocapture: false,
    capture_pageview: false,
    capture_pageleave: false,
    capture_performance: false,
    capture_exceptions: false,
    disable_session_recording: true,
    advanced_disable_feature_flags: true,
    person_profiles: 'identified_only' as const,
    save_referrer: false,
    save_campaign_params: false,
    property_denylist: ['$referrer', '$initial_referrer'],
    before_send: sanitizePostHogEvent,
  }
}

export function readAnalyticsConfig(
  environment: PublicEnvironment,
): AnalyticsConfig | undefined {
  const key = environment.VITE_POSTHOG_KEY?.trim()
  const host = environment.VITE_POSTHOG_HOST?.trim()
  const deployment = environment.VITE_DEPLOYMENT?.trim()

  if (
    !key ||
    !host ||
    (deployment !== 'preview' && deployment !== 'production') ||
    !isHttpUrl(host)
  ) {
    return undefined
  }

  return { key, host: host.replace(/\/$/, ''), deployment }
}

export function createWebAnalytics(
  config: AnalyticsConfig | undefined,
  client?: AnalyticsClient,
): WebAnalytics {
  if (!config || !client) return disabledAnalytics

  const commonProperties = {
    surface: 'web' as const,
    deployment: config.deployment,
  }

  return {
    captureExerciseEvent: (event) => {
      client.capture(event, commonProperties)
    },
    capturePageView: (currentUrl) => {
      client.capture('$pageview', {
        ...commonProperties,
        $current_url: stripUrlDetails(currentUrl),
      })
    },
    identify: (workosUserId) => {
      if (workosUserId) client.identify(workosUserId)
    },
    reset: () => {
      client.reset()
    },
  }
}

export function stripUrlDetails(value: string): string {
  try {
    const url = new URL(value)
    return `${url.origin}${url.pathname}`
  } catch {
    return value.split(/[?#]/, 1)[0] ?? value
  }
}

function sanitizePostHogEvent<
  Event extends { properties?: Record<string, unknown> },
>(event: Event | null): Event | null {
  if (!event) return null

  const currentUrl = event.properties?.$current_url
  if (typeof currentUrl !== 'string') return event

  return {
    ...event,
    properties: {
      ...event.properties,
      $current_url: stripUrlDetails(currentUrl),
    },
  }
}

const disabledAnalytics: WebAnalytics = {
  captureExerciseEvent: () => undefined,
  capturePageView: () => undefined,
  identify: () => undefined,
  reset: () => undefined,
}

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value)
    return url.protocol === 'https:' || url.protocol === 'http:'
  } catch {
    return false
  }
}
