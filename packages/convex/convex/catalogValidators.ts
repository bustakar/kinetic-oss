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
