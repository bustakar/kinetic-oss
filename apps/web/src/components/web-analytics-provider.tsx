import type { AnalyticsClient } from '@kinetic/analytics'
import { useRouter } from '@tanstack/react-router'
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

import {
  createWebAnalytics,
  postHogOptions,
  readAnalyticsConfig,
  type AnalyticsConfig,
  type WebAnalytics,
} from '@/lib/analytics'

const config = readAnalyticsConfig(import.meta.env)
const disabledAnalytics = createWebAnalytics(undefined)
const AnalyticsContext = createContext<WebAnalytics>(disabledAnalytics)

export function WebAnalyticsProvider({ children }: { children: ReactNode }) {
  if (!config) return children

  return <EnabledProvider config={config}>{children}</EnabledProvider>
}

export function useWebAnalytics(): WebAnalytics {
  return useContext(AnalyticsContext)
}

function EnabledProvider({
  children,
  config,
}: {
  children: ReactNode
  config: AnalyticsConfig
}) {
  const [client, setClient] = useState<AnalyticsClient>()

  useEffect(() => {
    let active = true

    void import('posthog-js/dist/module.slim').then(({ default: posthog }) => {
      if (!active) return
      posthog.init(config.key, {
        ...postHogOptions(config),
        loaded: (loadedClient) => {
          if (active) setClient(loadedClient)
        },
      })
    })

    return () => {
      active = false
    }
  }, [config])

  return (
    <AnalyticsRuntime client={client} config={config}>
      {children}
    </AnalyticsRuntime>
  )
}

function AnalyticsRuntime({
  children,
  client,
  config,
}: {
  children: ReactNode
  client: AnalyticsClient | undefined
  config: AnalyticsConfig
}) {
  const router = useRouter()
  const analytics = useMemo(
    () => createWebAnalytics(config, client),
    [client, config],
  )

  useEffect(() => {
    if (!client) return

    let lastPath = router.state.location.pathname
    capturePageView(lastPath)

    return router.subscribe('onResolved', ({ toLocation }) => {
      if (toLocation.pathname === lastPath) return
      lastPath = toLocation.pathname
      capturePageView(lastPath)
    })

    function capturePageView(pathname: string) {
      analytics.capturePageView(new URL(pathname, window.location.origin).href)
    }
  }, [analytics, client, router])

  return (
    <AnalyticsContext.Provider value={analytics}>
      {children}
    </AnalyticsContext.Provider>
  )
}
