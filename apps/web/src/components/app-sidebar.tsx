import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@kinetic/ui/components/sidebar'
import { Link } from '@tanstack/react-router'

import { NavUser } from '@/components/nav-user'
import { userDisplayName } from '@/lib/auth'

type SidebarUser = {
  email: string
  firstName?: string | null
  lastName?: string | null
  profilePictureUrl?: string | null
}

export function AppSidebar({ user }: { user: SidebarUser }) {
  const name = userDisplayName(user)

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
      <SidebarFooter>
        <NavUser
          user={{
            name,
            email: user.email,
            avatar: user.profilePictureUrl ?? '',
          }}
        />
      </SidebarFooter>
    </Sidebar>
  )
}
