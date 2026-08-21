import { ConvexError, type Infer, v } from 'convex/values'

import type { Doc, Id } from './_generated/dataModel'
import type { MutationCtx } from './_generated/server'
import { mutation, query } from './_generated/server'
import { requireOwnerId } from './auth'
import { exerciseDefinition } from './exerciseValidators'

const customExerciseDefinition = v.object({
  ...exerciseDefinition.fields,
  notes: v.optional(v.string()),
})

const customExercise = v.object({
  _id: v.id('exercises'),
  _creationTime: v.number(),
  ...customExerciseDefinition.fields,
  updatedAt: v.number(),
})

const customExerciseOrNull = v.union(v.null(), customExercise)
type ExerciseDefinition = Infer<typeof customExerciseDefinition>

export const get = query({
  args: { exerciseId: v.id('exercises') },
  returns: customExerciseOrNull,
  handler: async (ctx, { exerciseId }) => {
    const ownerId = await requireOwnerId(ctx)
    const exercise = await ctx.db.get(exerciseId)
    return exercise?.ownerId === ownerId ? toCustomExercise(exercise) : null
  },
})

export const create = mutation({
  args: customExerciseDefinition.fields,
  returns: customExercise,
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
    return toCustomExercise(exercise)
  },
})

export const update = mutation({
  args: {
    exerciseId: v.id('exercises'),
    ...customExerciseDefinition.fields,
  },
  returns: customExercise,
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
    return toCustomExercise(exercise)
  },
})

export const remove = mutation({
  args: { exerciseId: v.id('exercises') },
  returns: v.id('exercises'),
  handler: async (ctx, { exerciseId }) => {
    const ownerId = await requireOwnerId(ctx)
    await requireOwnedExercise(ctx, exerciseId, ownerId)
    await ctx.db.delete(exerciseId)
    return exerciseId
  },
})

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
  const repetitionColumns =
    Number(input.defaultColumns.includes('reps')) +
    Number(input.defaultColumns.includes('time'))
  if (repetitionColumns !== 1) {
    invalidInput('Exercise must use exactly one of reps or time.')
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
      message: 'Custom exercise not found.',
    })
  }
  return exercise
}

function toCustomExercise(exercise: Doc<'exercises'>) {
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
