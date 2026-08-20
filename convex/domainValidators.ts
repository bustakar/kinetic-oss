import { v } from 'convex/values'

import { muscleRole, setColumnType } from './catalogValidators'

export const visibility = v.union(v.literal('private'), v.literal('public'))

export const exerciseReference = v.union(
  v.object({ kind: v.literal('catalog'), slug: v.string() }),
  v.object({ kind: v.literal('custom'), exerciseId: v.id('exercises') }),
)

export const setColumn = v.object({
  id: v.string(),
  type: setColumnType,
  name: v.optional(v.string()),
})

export const setMeasurement = v.object({
  columnId: v.string(),
  value: v.number(),
})

export const routineSet = v.object({
  id: v.string(),
  measurements: v.array(setMeasurement),
})

export const routineExercise = v.object({
  id: v.string(),
  exercise: exerciseReference,
  notes: v.optional(v.string()),
  restSeconds: v.optional(v.number()),
  columns: v.array(setColumn),
  sets: v.array(routineSet),
})

export const exerciseSnapshot = v.object({
  source: v.union(
    v.object({ kind: v.literal('catalog'), slug: v.string() }),
    v.object({ kind: v.literal('custom'), exerciseId: v.id('exercises') }),
  ),
  name: v.string(),
  columns: v.array(setColumn),
  muscles: v.array(v.object({ slug: v.string(), role: muscleRole })),
})

export const workoutSet = v.object({
  id: v.string(),
  completed: v.boolean(),
  measurements: v.array(setMeasurement),
})

export const workoutExercise = v.object({
  id: v.string(),
  exercise: exerciseSnapshot,
  notes: v.optional(v.string()),
  restSeconds: v.optional(v.number()),
  sets: v.array(workoutSet),
})

export const workoutSource = v.union(
  v.object({ kind: v.literal('adHoc') }),
  v.object({ kind: v.literal('routine'), routineId: v.id('routines') }),
  v.object({
    kind: v.literal('program'),
    programId: v.id('programs'),
    slotId: v.string(),
  }),
)

export const programSlot = v.union(
  v.object({
    id: v.string(),
    kind: v.literal('routine'),
    routineId: v.id('routines'),
  }),
  v.object({ id: v.string(), kind: v.literal('rest') }),
)
