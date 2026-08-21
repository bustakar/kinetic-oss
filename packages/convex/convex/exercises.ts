import { type Infer, v } from 'convex/values'

import { query } from './_generated/server'
import { requireOwnerId } from './auth'
import { listForOwner } from './customExercises'
import { visibility } from './domainValidators'
import { exerciseDefinition } from './exerciseValidators'

const catalogExercise = v.object({
  source: v.object({ kind: v.literal('catalog'), slug: v.string() }),
  ...exerciseDefinition.fields,
})

const customExercise = v.object({
  source: v.object({ kind: v.literal('custom'), exerciseId: v.id('exercises') }),
  ...exerciseDefinition.fields,
  notes: v.optional(v.string()),
  visibility,
})

const exercise = v.union(catalogExercise, customExercise)
type Exercise = Infer<typeof exercise>

export const list = query({
  args: {},
  returns: v.array(exercise),
  handler: async (ctx) => {
    const ownerId = await requireOwnerId(ctx)
    const [state, customExercises] = await Promise.all([
      ctx.db
        .query('catalogState')
        .withIndex('by_key', (q) => q.eq('key', 'active'))
        .unique(),
      listForOwner(ctx, ownerId),
    ])
    const catalogExercises =
      state === null
        ? []
        : await ctx.db
            .query('catalogExercises')
            .withIndex('by_revision', (q) =>
              q.eq('catalogRevision', state.revision),
            )
            .collect()

    return [
      ...catalogExercises
        .filter((item) => item.deprecated !== true)
        .map((item) => ({
          source: { kind: 'catalog' as const, slug: item.slug },
          name: item.name,
          defaultColumns: item.defaultColumns,
          muscles: item.muscles,
        })),
      ...customExercises.map((item) => ({
        source: { kind: 'custom' as const, exerciseId: item._id },
        name: item.name,
        notes: item.notes,
        defaultColumns: item.defaultColumns,
        muscles: item.muscles,
        visibility: item.visibility,
      })),
    ].sort(byName)
  },
})

function byName(left: Exercise, right: Exercise): number {
  return (
    left.name.localeCompare(right.name) ||
    sourceKey(left).localeCompare(sourceKey(right))
  )
}

function sourceKey(exercise: Exercise): string {
  return exercise.source.kind === 'catalog'
    ? `catalog:${exercise.source.slug}`
    : `custom:${exercise.source.exerciseId}`
}
