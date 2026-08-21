import { Outlet, createFileRoute, redirect } from '@tanstack/react-router'
import { Separator } from '@kinetic/ui/components/separator'
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from '@kinetic/ui/components/sidebar'
import { getAuth } from '@workos/authkit-tanstack-react-start'

import { AppSidebar } from '@/components/app-sidebar'
import { AuthenticatedConvexProvider } from '@/components/authenticated-convex-provider'
import { signInEndpoint } from '@/lib/auth'

export const Route = createFileRoute('/_app')({
  loader: async ({ location }) => {
    const auth = await getAuth()
    if (!auth.user) {
      throw redirect({
        href: signInEndpoint(`${location.pathname}${location.searchStr}`),
      })
    }
    return {
      initialAuth: {
        user: auth.user,
        sessionId: auth.sessionId,
        organizationId: auth.organizationId,
        role: auth.role,
        roles: auth.roles,
        permissions: auth.permissions,
        entitlements: auth.entitlements,
        featureFlags: auth.featureFlags,
        impersonator: auth.impersonator,
      },
    }
  },
  component: AppLayout,
})

function AppLayout() {
  const { initialAuth } = Route.useLoaderData()

  return (
    <AuthenticatedConvexProvider initialAuth={initialAuth}>
      <SidebarProvider>
        <AppSidebar user={initialAuth.user} />
        <SidebarInset>
          <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <span className="text-sm font-medium">Kinetic</span>
          </header>
          <Outlet />
        </SidebarInset>
      </SidebarProvider>
    </AuthenticatedConvexProvider>
  )
}
