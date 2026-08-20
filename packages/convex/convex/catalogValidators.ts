import { v } from 'convex/values'

export const setColumnType = v.union(
  v.literal('reps'),
  v.literal('time'),
  v.literal('weight'),
)

export const muscleRole = v.union(v.literal('primary'), v.literal('secondary'))

export const muscleReference = v.object({
  slug: v.string(),
  role: muscleRole,
})

export const catalogMuscleGroup = v.object({
  slug: v.string(),
  name: v.string(),
  deprecated: v.optional(v.boolean()),
})

export const catalogMuscle = v.object({
  slug: v.string(),
  name: v.string(),
  groupSlug: v.string(),
  deprecated: v.optional(v.boolean()),
})

export const catalogExercise = v.object({
  slug: v.string(),
  name: v.string(),
  defaultColumns: v.array(setColumnType),
  muscles: v.array(muscleReference),
  family: v.optional(v.string()),
  deprecated: v.optional(v.boolean()),
})

export const catalogSnapshot = v.object({
  schemaVersion: v.number(),
  revision: v.number(),
  muscleGroups: v.array(catalogMuscleGroup),
  muscles: v.array(catalogMuscle),
  exercises: v.array(catalogExercise),
})

export const catalogPublicationResult = v.object({
  revision: v.number(),
  changed: v.boolean(),
})
