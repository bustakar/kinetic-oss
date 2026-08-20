import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@kinetic/ui/components/sidebar'
import { Button } from '@kinetic/ui/components/button'
import { Link } from '@tanstack/react-router'
import { useAuth } from '@workos/authkit-tanstack-react-start/client'
import { userDisplayName } from '@/lib/auth'

type SidebarUser = {
  email: string
  firstName?: string | null
  lastName?: string | null
  profilePictureUrl?: string | null
}

export function AppSidebar({ user }: { user: SidebarUser }) {
  const { signOut } = useAuth()
  const name = userDisplayName(user)
  const initials = name
    .split(/\s+/)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

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
        <div className="flex items-center gap-2 px-2 py-1">
          {user.profilePictureUrl ? (
            <img
              src={user.profilePictureUrl}
              alt=""
              className="size-8 rounded-lg object-cover"
            />
          ) : (
            <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-sidebar-accent text-xs font-medium">
              {initials}
            </span>
          )}
          <div className="min-w-0 flex-1 leading-tight">
            <p className="truncate text-sm font-medium">{name}</p>
            <p className="truncate text-xs text-muted-foreground">{user.email}</p>
          </div>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="justify-start"
          onClick={() => void signOut()}
        >
          Sign out
        </Button>
      </SidebarFooter>
    </Sidebar>
  )
}
