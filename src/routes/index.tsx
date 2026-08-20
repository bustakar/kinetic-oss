import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/')({ component: Home })

function Home() {
  return (
    <main className="grid min-h-svh place-items-center p-8">
      <div className="max-w-xl space-y-4">
        <p className="text-sm font-medium text-muted-foreground">Kinetic OSS</p>
        <h1 className="text-4xl font-semibold tracking-tight">
          Build training your way.
        </h1>
        <p className="text-lg text-muted-foreground">
          Exercises, Routines, Workouts, and Programs as simple composable
          building blocks.
        </p>
      </div>
    </main>
  )
}
