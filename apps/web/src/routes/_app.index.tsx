import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_app/')({ component: HomePage })

function HomePage() {
  return <main className="flex-1" />
}
