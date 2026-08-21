import { api } from '@kinetic/convex/api'
import { Skeleton } from '@kinetic/ui/components/skeleton'
import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from 'convex/react'

import { ExerciseCreateDialog } from '@/components/exercise-create-dialog'

export const Route = createFileRoute('/_app/exercises')({
  head: () => ({ meta: [{ title: 'Exercises · Kinetic' }] }),
  component: ExercisesPage,
})

const columnNames = {
  reps: 'Reps',
  time: 'Time',
  weight: 'Weight',
}

function ExercisesPage() {
  const exercises = useQuery(api.exercises.list)

  return (
    <main className="min-w-0">
      <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <header className="mb-6 flex items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Exercises</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Your exercise library.
            </p>
          </div>
          <div className="flex items-center gap-3">
            {exercises === undefined ? (
              <Skeleton className="h-5 w-20" />
            ) : (
              <p className="text-sm tabular-nums text-muted-foreground">
                {exercises.length}{' '}
                {exercises.length === 1 ? 'exercise' : 'exercises'}
              </p>
            )}
            <ExerciseCreateDialog />
          </div>
        </header>

        {exercises === undefined ? (
          <ExerciseListSkeleton />
        ) : exercises.length === 0 ? (
          <div className="rounded-xl border border-dashed px-6 py-16 text-center">
            <p className="font-medium">No exercises yet</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Publish the catalog or create a custom exercise to get started.
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border bg-card">
            <div className="grid grid-cols-[minmax(0,1fr)_8rem] gap-4 border-b bg-muted/40 px-4 py-2.5 text-xs font-medium text-muted-foreground sm:grid-cols-[minmax(0,1fr)_12rem] sm:px-5">
              <span>Exercise</span>
              <span>Tracks</span>
            </div>
            <ul className="divide-y">
              {exercises.map((exercise) => (
                <li
                  key={exerciseKey(exercise)}
                  className="grid grid-cols-[minmax(0,1fr)_8rem] items-center gap-4 px-4 py-3 sm:grid-cols-[minmax(0,1fr)_12rem] sm:px-5"
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <span className="truncate text-sm font-medium">
                      {exercise.name}
                    </span>
                    {exercise.source.kind === 'custom' ? (
                      <span className="shrink-0 text-xs text-muted-foreground">
                        Custom
                      </span>
                    ) : null}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {exercise.defaultColumns
                      .map((column) => columnNames[column])
                      .join(' · ')}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </main>
  )
}

function exerciseKey(
  exercise:
    | { source: { kind: 'catalog'; slug: string } }
    | { source: { kind: 'custom'; exerciseId: string } },
) {
  return exercise.source.kind === 'catalog'
    ? `catalog:${exercise.source.slug}`
    : `custom:${exercise.source.exerciseId}`
}

function ExerciseListSkeleton() {
  return (
    <div className="overflow-hidden rounded-xl border">
      <div className="h-10 border-b bg-muted/40" />
      {Array.from({ length: 8 }, (_, index) => (
        <div
          key={index}
          className="grid grid-cols-[minmax(0,1fr)_8rem] gap-4 border-b px-4 py-3 last:border-b-0 sm:grid-cols-[minmax(0,1fr)_12rem] sm:px-5"
        >
          <Skeleton className="h-5 w-48 max-w-full" />
          <Skeleton className="h-5 w-20" />
        </div>
      ))}
    </div>
  )
}
