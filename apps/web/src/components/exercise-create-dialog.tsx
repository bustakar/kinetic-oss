import { api } from '@kinetic/convex/api'
import { Button } from '@kinetic/ui/components/button'
import { Checkbox } from '@kinetic/ui/components/checkbox'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@kinetic/ui/components/dialog'
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@kinetic/ui/components/field'
import { Input } from '@kinetic/ui/components/input'
import { Textarea } from '@kinetic/ui/components/textarea'
import { useMutation } from 'convex/react'
import { PlusIcon } from 'lucide-react'
import { useRef, useState } from 'react'
import type { FormEvent } from 'react'

type ExerciseColumn = 'reps' | 'time' | 'weight'

const columnOptions: Array<{
  id: ExerciseColumn
  label: string
  description: string
}> = [
  { id: 'reps', label: 'Reps', description: 'Count completed repetitions.' },
  { id: 'time', label: 'Time', description: 'Record the duration of each set.' },
  { id: 'weight', label: 'Weight', description: 'Record the load used.' },
]

const initialDraft: { name: string; notes: string; columns: ExerciseColumn[] } = {
  name: '',
  notes: '',
  columns: [],
}

export function ExerciseCreateDialog() {
  const createExercise = useMutation(api.exercises.create)
  const pending = useRef(false)
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState(initialDraft)
  const [error, setError] = useState<string>()
  const [saving, setSaving] = useState(false)

  function changeOpen(next: boolean) {
    if (saving) return
    if (next) {
      setDraft(initialDraft)
      setError(undefined)
    }
    setOpen(next)
  }

  function toggleColumn(column: ExerciseColumn, checked: boolean) {
    setDraft((current) => ({
      ...current,
      columns: checked
        ? [...current.columns, column]
        : current.columns.filter((currentColumn) => currentColumn !== column),
    }))
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const name = draft.name.trim()
    if (pending.current || name.length === 0 || draft.columns.length === 0) {
      return
    }

    pending.current = true
    setSaving(true)
    setError(undefined)
    const defaultColumns = columnOptions
      .filter((column) => draft.columns.includes(column.id))
      .map((column) => column.id)

    try {
      await createExercise({
        name,
        notes: draft.notes.trim() || undefined,
        defaultColumns,
        muscles: [],
      })
      setOpen(false)
      setDraft(initialDraft)
    } catch {
      setError('Exercise could not be created. Try again.')
    } finally {
      pending.current = false
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={changeOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <PlusIcon />
          New exercise
        </Button>
      </DialogTrigger>
      <DialogContent
        className="max-h-[calc(100dvh-2rem)] overflow-hidden p-0"
        showCloseButton={!saving}
      >
        <form
          className="flex min-h-0 max-h-[calc(100dvh-2rem)] flex-col"
          onSubmit={submit}
        >
          <DialogHeader className="shrink-0 border-b px-6 py-5">
            <DialogTitle>New exercise</DialogTitle>
            <DialogDescription>
              Add a movement and choose what each set records.
            </DialogDescription>
          </DialogHeader>

          <FieldGroup className="min-h-0 overflow-y-auto px-6 py-6">
            <Field>
              <FieldLabel htmlFor="exercise-name">Name</FieldLabel>
              <Input
                id="exercise-name"
                value={draft.name}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    name: event.target.value,
                  }))
                }
                placeholder="e.g. Ring press"
                maxLength={120}
                disabled={saving}
                autoComplete="off"
                autoFocus
                required
              />
            </Field>

            <Field>
              <FieldLabel>Columns</FieldLabel>
              <FieldDescription>
                Select one or more values to record for each set.
              </FieldDescription>
              <FieldGroup className="gap-2 pt-1">
                {columnOptions.map((column) => (
                  <FieldLabel
                    key={column.id}
                    htmlFor={`exercise-column-${column.id}`}
                    className="w-full cursor-pointer rounded-lg border p-3 transition-colors hover:bg-muted/50 has-[[data-state=checked]]:border-foreground/20 has-[[data-state=checked]]:bg-muted/50"
                  >
                    <Field orientation="horizontal" className="gap-3">
                      <Checkbox
                        id={`exercise-column-${column.id}`}
                        className="mt-0.5"
                        checked={draft.columns.includes(column.id)}
                        onCheckedChange={(checked) =>
                          toggleColumn(column.id, checked === true)
                        }
                        disabled={saving}
                      />
                      <FieldContent>
                        <span className="leading-snug font-medium">
                          {column.label}
                        </span>
                        <FieldDescription>
                          {column.description}
                        </FieldDescription>
                      </FieldContent>
                    </Field>
                  </FieldLabel>
                ))}
              </FieldGroup>
            </Field>

            <Field>
              <FieldLabel htmlFor="exercise-notes">Notes</FieldLabel>
              <FieldDescription>Optional setup or technique cues.</FieldDescription>
              <Textarea
                id="exercise-notes"
                value={draft.notes}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    notes: event.target.value,
                  }))
                }
                placeholder="Grip, setup, tempo…"
                maxLength={2_000}
                disabled={saving}
              />
            </Field>

            <FieldError>{error}</FieldError>
          </FieldGroup>

          <DialogFooter className="shrink-0 border-t px-6 py-4">
            <DialogClose asChild>
              <Button type="button" variant="outline" disabled={saving}>
                Cancel
              </Button>
            </DialogClose>
            <Button
              type="submit"
              disabled={
                saving ||
                draft.name.trim().length === 0 ||
                draft.columns.length === 0
              }
            >
              {saving ? 'Creating…' : 'Create exercise'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
