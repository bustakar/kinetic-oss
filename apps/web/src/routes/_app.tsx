import { Outlet, createFileRoute } from '@tanstack/react-router'
import { Separator } from '@kinetic/ui/components/separator'
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from '@kinetic/ui/components/sidebar'

import { AppSidebar } from '@/components/app-sidebar'

export const Route = createFileRoute('/_app')({ component: AppLayout })

function AppLayout() {
  return (
    <SidebarProvider>
      <AppSidebar />
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
