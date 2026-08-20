import { ConvexError, v } from 'convex/values'

import { internalMutation, query } from './_generated/server'
import { catalogSnapshot } from './catalogValidators'

export const current = query({
  args: {},
  returns: v.union(
    v.null(),
    v.object({ ...catalogSnapshot.fields, contentHash: v.string() }),
  ),
  handler: async (ctx) => {
    const state = await ctx.db
      .query('catalogState')
      .withIndex('by_key', (q) => q.eq('key', 'active'))
      .unique()
    if (!state) return null

    const [muscleGroups, muscles, exercises] = await Promise.all([
      ctx.db.query('catalogMuscleGroups').collect(),
      ctx.db.query('catalogMuscles').collect(),
      ctx.db.query('catalogExercises').collect(),
    ])
    return {
      schemaVersion: state.schemaVersion,
      revision: state.revision,
      contentHash: state.contentHash,
      muscleGroups: muscleGroups.map(({ slug, name }) => ({ slug, name })),
      muscles: muscles.map(({ slug, name, groupSlug }) => ({
        slug,
        name,
        groupSlug,
      })),
      exercises: exercises.map(
        ({
          slug,
          name,
          defaultColumns,
          muscles: exerciseMuscles,
          family,
          deprecated,
        }) => ({
          slug,
          name,
          defaultColumns,
          muscles: exerciseMuscles,
          ...(family ? { family } : {}),
          ...(deprecated === undefined ? {} : { deprecated }),
        }),
      ),
    }
  },
})

export const publish = internalMutation({
  args: { snapshot: catalogSnapshot, contentHash: v.string() },
  returns: v.object({ revision: v.number(), changed: v.boolean() }),
  handler: async (ctx, { snapshot, contentHash }) => {
    const state = await ctx.db
      .query('catalogState')
      .withIndex('by_key', (q) => q.eq('key', 'active'))
      .unique()

    if (state?.revision === snapshot.revision) {
      if (state.contentHash !== contentHash) {
        throw new ConvexError('Catalog content changed without a revision bump')
      }
      return { revision: state.revision, changed: false }
    }
    if (state && snapshot.revision < state.revision) {
      throw new ConvexError('Catalog revision cannot move backwards')
    }

    const [groups, muscles, exercises] = await Promise.all([
      ctx.db.query('catalogMuscleGroups').collect(),
      ctx.db.query('catalogMuscles').collect(),
      ctx.db.query('catalogExercises').collect(),
    ])
    requireNoRemovedSlugs(groups, snapshot.muscleGroups, 'Muscle Group')
    requireNoRemovedSlugs(muscles, snapshot.muscles, 'Muscle')
    requireNoRemovedSlugs(exercises, snapshot.exercises, 'Exercise')

    const groupIds = new Map(groups.map((item) => [item.slug, item._id]))
    for (const item of snapshot.muscleGroups) {
      const value = { ...item, catalogRevision: snapshot.revision }
      const id = groupIds.get(item.slug)
      if (id) await ctx.db.replace(id, value)
      else await ctx.db.insert('catalogMuscleGroups', value)
    }

    const muscleIds = new Map(muscles.map((item) => [item.slug, item._id]))
    for (const item of snapshot.muscles) {
      const value = { ...item, catalogRevision: snapshot.revision }
      const id = muscleIds.get(item.slug)
      if (id) await ctx.db.replace(id, value)
      else await ctx.db.insert('catalogMuscles', value)
    }

    const exerciseIds = new Map(exercises.map((item) => [item.slug, item._id]))
    for (const item of snapshot.exercises) {
      const value = { ...item, catalogRevision: snapshot.revision }
      const id = exerciseIds.get(item.slug)
      if (id) await ctx.db.replace(id, value)
      else await ctx.db.insert('catalogExercises', value)
    }

    const nextState = {
      key: 'active' as const,
      schemaVersion: snapshot.schemaVersion,
      revision: snapshot.revision,
      contentHash,
      publishedAt: Date.now(),
    }
    if (state) await ctx.db.replace(state._id, nextState)
    else await ctx.db.insert('catalogState', nextState)
    return { revision: snapshot.revision, changed: true }
  },
})

function requireNoRemovedSlugs(
  existing: Array<{ slug: string }>,
  incoming: Array<{ slug: string }>,
  label: string,
) {
  const next = new Set(incoming.map((item) => item.slug))
  const removed = existing.find((item) => !next.has(item.slug))
  if (removed)
    throw new ConvexError(`${label} slug cannot be removed: ${removed.slug}`)
}
