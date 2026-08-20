import { Outlet, createFileRoute, redirect } from '@tanstack/react-router'
import { Separator } from '@kinetic/ui/components/separator'
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from '@kinetic/ui/components/sidebar'

import { AppSidebar } from '@/components/app-sidebar'
import { signInEndpoint, validateAuthEnvironment } from '@/lib/auth'
import { getAuth } from '@workos/authkit-tanstack-react-start'

export const Route = createFileRoute('/_app')({
  loader: async ({ location }) => {
    validateAuthEnvironment(process.env)
    const { user } = await getAuth()
    if (!user) {
      throw redirect({
        href: signInEndpoint(`${location.pathname}${location.searchStr}`),
      })
    }
    return { user }
  },
  component: AppLayout,
})

function AppLayout() {
  const { user } = Route.useLoaderData()

  return (
    <SidebarProvider>
      <AppSidebar user={user} />
      <SidebarInset>
        <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <span className="text-sm font-medium">Kinetic</span>
        </header>
        <Outlet />
      </SidebarInset>
    </SidebarProvider>
  )
}
