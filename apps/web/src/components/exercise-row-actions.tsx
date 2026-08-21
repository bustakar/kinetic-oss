import { api } from '@kinetic/convex/api'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@kinetic/ui/components/alert-dialog'
import { Button } from '@kinetic/ui/components/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@kinetic/ui/components/dropdown-menu'
import { useMutation } from 'convex/react'
import { MoreHorizontalIcon, PencilIcon, Trash2Icon } from 'lucide-react'
import { useRef, useState } from 'react'
import type { MouseEvent } from 'react'

import type { CustomExercise } from '@/components/exercise-dialog'

export function ExerciseRowActions({
  exercise,
  onEdit,
}: {
  exercise: CustomExercise
  onEdit: (exercise: CustomExercise) => void
}) {
  const removeExercise = useMutation(api.exercises.remove)
  const pending = useRef(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string>()

  function changeConfirmOpen(open: boolean) {
    if (deleting) return
    setConfirmOpen(open)
    if (open) setError(undefined)
  }

  async function remove(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault()
    if (pending.current) return

    pending.current = true
    setDeleting(true)
    setError(undefined)
    try {
      await removeExercise({ exerciseId: exercise.source.exerciseId })
      setConfirmOpen(false)
    } catch {
      setError('Exercise could not be deleted. Try again.')
    } finally {
      pending.current = false
      setDeleting(false)
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={`Actions for ${exercise.name}`}
          >
            <MoreHorizontalIcon />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={() => onEdit(exercise)}>
            <PencilIcon />
            Edit
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="text-destructive focus:text-destructive"
            onSelect={() => changeConfirmOpen(true)}
          >
            <Trash2Icon className="text-destructive" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={confirmOpen} onOpenChange={changeConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {exercise.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes the custom exercise from your library. This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {error ? (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          ) : null}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={deleting}
              onClick={remove}
            >
              {deleting ? 'Deleting…' : 'Delete exercise'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
