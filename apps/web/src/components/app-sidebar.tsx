import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@kinetic/ui/components/sidebar'
import { Link, useRouterState } from '@tanstack/react-router'
import { Dumbbell } from 'lucide-react'

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
  const exercisesActive = useRouterState({
    select: (state) => state.location.pathname.startsWith('/exercises'),
  })

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
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={exercisesActive}
                  tooltip="Exercises"
                >
                  <Link to="/exercises">
                    <Dumbbell />
                    <span>Exercises</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
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
