import { v } from 'convex/values'

export const setColumnType = v.union(
  v.literal('reps'),
  v.literal('weight'),
  v.literal('time'),
)

export const muscleRole = v.union(v.literal('primary'), v.literal('secondary'))

export const catalogSnapshot = v.object({
  schemaVersion: v.number(),
  revision: v.number(),
  muscleGroups: v.array(v.object({ slug: v.string(), name: v.string() })),
  muscles: v.array(
    v.object({
      slug: v.string(),
      name: v.string(),
      groupSlug: v.string(),
    }),
  ),
  exercises: v.array(
    v.object({
      slug: v.string(),
      name: v.string(),
      defaultColumns: v.array(setColumnType),
      muscles: v.array(v.object({ slug: v.string(), role: muscleRole })),
      family: v.optional(v.string()),
      deprecated: v.optional(v.boolean()),
    }),
  ),
})
