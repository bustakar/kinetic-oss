export const analyticsEvents = [
  'exercise_created',
  'exercise_updated',
  'exercise_deleted',
] as const

export type AnalyticsEvent = (typeof analyticsEvents)[number]
export type Deployment = 'preview' | 'production'
export type AnalyticsProperties<Surface extends string = string> = {
  surface: Surface
  deployment: Deployment
}

export type AnalyticsClient = {
  capture: (event: string, properties?: Record<string, unknown>) => unknown
  identify: (distinctId: string) => unknown
  reset: () => unknown
}

export type Analytics = {
  capture: (event: AnalyticsEvent) => void
  identify: (userId: string) => void
  reset: () => void
}

export function createAnalytics<const Surface extends string>({
  client,
  deployment,
  surface,
}: {
  client?: AnalyticsClient
  deployment: Deployment
  surface: Surface
}): Analytics {
  if (!client) return disabledAnalytics

  const commonProperties = analyticsProperties(surface, deployment)

  return {
    capture: (event) => {
      client.capture(event, commonProperties)
    },
    identify: (userId) => {
      if (userId) client.identify(userId)
    },
    reset: () => {
      client.reset()
    },
  }
}

export function analyticsProperties<const Surface extends string>(
  surface: Surface,
  deployment: Deployment,
): AnalyticsProperties<Surface> {
  return { surface, deployment }
}

const disabledAnalytics: Analytics = {
  capture: () => undefined,
  identify: () => undefined,
  reset: () => undefined,
}
