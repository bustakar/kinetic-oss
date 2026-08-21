import { ConvexError, type Infer, v } from 'convex/values'

import type { Doc, Id } from './_generated/dataModel'
import type { MutationCtx } from './_generated/server'
import { mutation, query } from './_generated/server'
import { requireOwnerId } from './auth'
import { exerciseDefinition } from './exerciseValidators'

const ownedExerciseDefinition = v.object({
  ...exerciseDefinition.fields,
  notes: v.optional(v.string()),
})

const ownedExercise = v.object({
  _id: v.id('exercises'),
  _creationTime: v.number(),
  ...ownedExerciseDefinition.fields,
  updatedAt: v.number(),
})

const catalogExerciseListItem = v.object({
  source: v.object({ kind: v.literal('catalog'), slug: v.string() }),
  ...exerciseDefinition.fields,
})

const ownedExerciseListItem = v.object({
  source: v.object({ kind: v.literal('custom'), exerciseId: v.id('exercises') }),
  ...exerciseDefinition.fields,
  notes: v.optional(v.string()),
})

const exerciseListItem = v.union(catalogExerciseListItem, ownedExerciseListItem)
type ExerciseDefinition = Infer<typeof ownedExerciseDefinition>
type ExerciseListItem = Infer<typeof exerciseListItem>

export const list = query({
  args: { query: v.optional(v.string()) },
  returns: v.array(exerciseListItem),
  handler: async (ctx, { query }) => {
    const ownerId = await requireOwnerId(ctx)
    const [state, ownedExercises] = await Promise.all([
      ctx.db
        .query('catalogState')
        .withIndex('by_key', (q) => q.eq('key', 'active'))
        .unique(),
      ctx.db
        .query('exercises')
        .withIndex('by_owner', (q) => q.eq('ownerId', ownerId))
        .collect(),
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

    const exercises = [
      ...catalogExercises
        .filter((item) => item.deprecated !== true)
        .map((item) => ({
          source: { kind: 'catalog' as const, slug: item.slug },
          name: item.name,
          defaultColumns: item.defaultColumns,
          muscles: item.muscles,
        })),
      ...ownedExercises.map((item) => ({
        source: { kind: 'custom' as const, exerciseId: item._id },
        name: item.name,
        notes: item.notes,
        defaultColumns: item.defaultColumns,
        muscles: item.muscles,
      })),
    ].sort(byName)

    const normalizedQuery = query?.trim().toLowerCase()
    return normalizedQuery
      ? exercises.filter((exercise) =>
          exercise.name.toLowerCase().includes(normalizedQuery),
        )
      : exercises
  },
})

export const get = query({
  args: { exerciseId: v.id('exercises') },
  returns: v.union(v.null(), ownedExercise),
  handler: async (ctx, { exerciseId }) => {
    const ownerId = await requireOwnerId(ctx)
    const exercise = await ctx.db.get(exerciseId)
    return exercise?.ownerId === ownerId ? toOwnedExercise(exercise) : null
  },
})

export const create = mutation({
  args: ownedExerciseDefinition.fields,
  returns: ownedExercise,
  handler: async (ctx, args) => {
    const ownerId = await requireOwnerId(ctx)
    const definition = normalizeDefinition(args)
    await validateDefinition(ctx, definition)
    const exerciseId = await ctx.db.insert('exercises', {
      ownerId,
      ...definition,
      updatedAt: Date.now(),
    })
    const exercise = await ctx.db.get(exerciseId)
    if (exercise === null) throw new Error('Created exercise was not found')
    return toOwnedExercise(exercise)
  },
})

export const update = mutation({
  args: {
    exerciseId: v.id('exercises'),
    ...ownedExerciseDefinition.fields,
  },
  returns: ownedExercise,
  handler: async (ctx, { exerciseId, ...input }) => {
    const ownerId = await requireOwnerId(ctx)
    await requireOwnedExercise(ctx, exerciseId, ownerId)
    const definition = normalizeDefinition(input)
    await validateDefinition(ctx, definition)
    await ctx.db.patch(exerciseId, {
      ...definition,
      updatedAt: Date.now(),
    })
    const exercise = await ctx.db.get(exerciseId)
    if (exercise === null) throw new Error('Updated exercise was not found')
    return toOwnedExercise(exercise)
  },
})

export const remove = mutation({
  args: { exerciseId: v.id('exercises') },
  returns: v.id('exercises'),
  handler: async (ctx, { exerciseId }) => {
    const ownerId = await requireOwnerId(ctx)
    await requireOwnedExercise(ctx, exerciseId, ownerId)
    const routines = await ctx.db
      .query('routines')
      .withIndex('by_owner', (q) => q.eq('ownerId', ownerId))
      .collect()
    if (
      routines.some((routine) =>
        routine.exercises.some(
          (exercise) =>
            exercise.exercise.kind === 'custom' &&
            exercise.exercise.exerciseId === exerciseId,
        ),
      )
    ) {
      throw new ConvexError({
        code: 'EXERCISE_IN_USE',
        message: 'Exercise is used by a routine and cannot be deleted.',
      })
    }
    await ctx.db.delete(exerciseId)
    return exerciseId
  },
})

function byName(left: ExerciseListItem, right: ExerciseListItem): number {
  return (
    left.name.localeCompare(right.name) ||
    sourceKey(left).localeCompare(sourceKey(right))
  )
}

function sourceKey(exercise: ExerciseListItem): string {
  return exercise.source.kind === 'catalog'
    ? `catalog:${exercise.source.slug}`
    : `custom:${exercise.source.exerciseId}`
}

function normalizeDefinition(input: ExerciseDefinition): ExerciseDefinition {
  const name = input.name.trim()
  if (name.length === 0) invalidInput('Exercise name is required.')
  if (name.length > 120) {
    invalidInput('Exercise name must be 120 characters or fewer.')
  }

  const notes = input.notes?.trim() || undefined
  if (notes !== undefined && notes.length > 2_000) {
    invalidInput('Exercise notes must be 2000 characters or fewer.')
  }

  if (new Set(input.defaultColumns).size !== input.defaultColumns.length) {
    invalidInput('Exercise default columns must be unique.')
  }
  if (input.defaultColumns.length === 0) {
    invalidInput('Exercise must define at least one set column.')
  }

  const muscleSlugs = input.muscles.map((muscle) => muscle.slug)
  if (new Set(muscleSlugs).size !== muscleSlugs.length) {
    invalidInput('Exercise muscles must be unique.')
  }

  return {
    name,
    notes,
    defaultColumns: input.defaultColumns,
    muscles: input.muscles,
  }
}

async function validateDefinition(
  ctx: MutationCtx,
  definition: ExerciseDefinition,
): Promise<void> {
  if (definition.muscles.length === 0) return

  const state = await ctx.db
    .query('catalogState')
    .withIndex('by_key', (q) => q.eq('key', 'active'))
    .unique()
  const muscles =
    state === null
      ? []
      : await ctx.db
          .query('catalogMuscles')
          .withIndex('by_revision', (q) =>
            q.eq('catalogRevision', state.revision),
          )
          .collect()
  const knownSlugs = new Set(muscles.map((muscle) => muscle.slug))
  const unknownSlug = definition.muscles.find(
    (muscle) => !knownSlugs.has(muscle.slug),
  )?.slug
  if (unknownSlug !== undefined) {
    invalidInput(`Unknown muscle slug: ${unknownSlug}.`)
  }
}

async function requireOwnedExercise(
  ctx: MutationCtx,
  exerciseId: Id<'exercises'>,
  ownerId: string,
): Promise<Doc<'exercises'>> {
  const exercise = await ctx.db.get(exerciseId)
  if (exercise === null || exercise.ownerId !== ownerId) {
    throw new ConvexError({
      code: 'NOT_FOUND',
      message: 'Exercise not found.',
    })
  }
  return exercise
}

function toOwnedExercise(exercise: Doc<'exercises'>) {
  return {
    _id: exercise._id,
    _creationTime: exercise._creationTime,
    name: exercise.name,
    notes: exercise.notes,
    defaultColumns: exercise.defaultColumns,
    muscles: exercise.muscles,
    updatedAt: exercise.updatedAt,
  }
}

function invalidInput(message: string): never {
  throw new ConvexError({ code: 'INVALID_INPUT', message })
}
