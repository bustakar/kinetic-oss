import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@kinetic/ui/components/sidebar'
import { Link } from '@tanstack/react-router'

export function AppSidebar() {
  return (
    <Sidebar variant="inset">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link to="/">
                <img
                  src="/kinetic-icon.svg"
                  alt=""
                  className="size-8 rounded-lg"
                />
                <span className="truncate text-sm font-medium">Kinetic</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent />
    </Sidebar>
  )
}
