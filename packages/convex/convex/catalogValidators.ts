import { v } from 'convex/values'

import { exerciseDefinition } from './exerciseValidators'

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
  ...exerciseDefinition.fields,
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
