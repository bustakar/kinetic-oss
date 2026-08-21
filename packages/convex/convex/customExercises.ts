import { ConvexError, type Infer, v } from 'convex/values'

import type { Doc, Id } from './_generated/dataModel'
import type { MutationCtx, QueryCtx } from './_generated/server'
import { mutation, query } from './_generated/server'
import { requireOwnerId } from './auth'
import { muscleReference, setColumnType } from './catalogValidators'
import { visibility } from './domainValidators'

const exerciseDefinition = v.object({
  name: v.string(),
  notes: v.optional(v.string()),
  defaultColumns: v.array(setColumnType),
  muscles: v.array(muscleReference),
})

const customExercise = v.object({
  _id: v.id('exercises'),
  _creationTime: v.number(),
  ...exerciseDefinition.fields,
  visibility,
  updatedAt: v.number(),
})

const customExerciseOrNull = v.union(v.null(), customExercise)
type ExerciseDefinition = Infer<typeof exerciseDefinition>
type CustomExercise = Infer<typeof customExercise>
type Visibility = Infer<typeof visibility>
type CreateInput = ExerciseDefinition & { visibility?: Visibility }
type UpdateInput = ExerciseDefinition & { visibility: Visibility }

export const listMine = query({
  args: {},
  returns: v.array(customExercise),
  handler: async (ctx) => {
    const ownerId = await requireOwnerId(ctx)
    return await listForOwner(ctx, ownerId)
  },
})

export const get = query({
  args: { exerciseId: v.id('exercises') },
  returns: customExerciseOrNull,
  handler: async (ctx, { exerciseId }) => {
    const identity = await ctx.auth.getUserIdentity()
    return await getForViewer(ctx, exerciseId, identity?.subject)
  },
})

export const create = mutation({
  args: {
    ...exerciseDefinition.fields,
    visibility: v.optional(visibility),
  },
  returns: customExercise,
  handler: async (ctx, args) => {
    const ownerId = await requireOwnerId(ctx)
    return await createForOwner(ctx, ownerId, args)
  },
})

export const update = mutation({
  args: {
    exerciseId: v.id('exercises'),
    ...exerciseDefinition.fields,
    visibility,
  },
  returns: customExercise,
  handler: async (ctx, { exerciseId, ...input }) => {
    const ownerId = await requireOwnerId(ctx)
    return await updateForOwner(ctx, ownerId, exerciseId, input)
  },
})

export const remove = mutation({
  args: { exerciseId: v.id('exercises') },
  returns: v.id('exercises'),
  handler: async (ctx, { exerciseId }) => {
    const ownerId = await requireOwnerId(ctx)
    return await removeForOwner(ctx, ownerId, exerciseId)
  },
})

export async function listForOwner(
  ctx: QueryCtx,
  ownerId: string,
): Promise<CustomExercise[]> {
  const exercises = await ctx.db
    .query('exercises')
    .withIndex('by_owner', (q) => q.eq('ownerId', ownerId))
    .collect()
  return exercises.map(toCustomExercise).sort(byName)
}

export async function getForViewer(
  ctx: QueryCtx,
  exerciseId: Id<'exercises'>,
  viewerId?: string,
): Promise<CustomExercise | null> {
  const exercise = await ctx.db.get(exerciseId)
  if (
    exercise === null ||
    (exercise.visibility === 'private' && exercise.ownerId !== viewerId)
  ) {
    return null
  }
  return toCustomExercise(exercise)
}

export async function createForOwner(
  ctx: MutationCtx,
  ownerId: string,
  input: CreateInput,
): Promise<CustomExercise> {
  const definition = normalizeDefinition(input)
  await validateDefinition(ctx, definition)
  const exerciseId = await ctx.db.insert('exercises', {
    ownerId,
    ...definition,
    visibility: input.visibility ?? 'private',
    updatedAt: Date.now(),
  })
  const exercise = await ctx.db.get(exerciseId)
  if (exercise === null) throw new Error('Created exercise was not found')
  return toCustomExercise(exercise)
}

export async function updateForOwner(
  ctx: MutationCtx,
  ownerId: string,
  exerciseId: Id<'exercises'>,
  input: UpdateInput,
): Promise<CustomExercise> {
  await requireOwnedExercise(ctx, exerciseId, ownerId)
  const definition = normalizeDefinition(input)
  await validateDefinition(ctx, definition)
  await ctx.db.patch(exerciseId, {
    ...definition,
    visibility: input.visibility,
    updatedAt: Date.now(),
  })
  const exercise = await ctx.db.get(exerciseId)
  if (exercise === null) throw new Error('Updated exercise was not found')
  return toCustomExercise(exercise)
}

export async function removeForOwner(
  ctx: MutationCtx,
  ownerId: string,
  exerciseId: Id<'exercises'>,
): Promise<Id<'exercises'>> {
  await requireOwnedExercise(ctx, exerciseId, ownerId)
  await ctx.db.delete(exerciseId)
  return exerciseId
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
    visibility: exercise.visibility,
    updatedAt: exercise.updatedAt,
  }
}

function byName(left: CustomExercise, right: CustomExercise): number {
  return left.name.localeCompare(right.name) || left._id.localeCompare(right._id)
}

function invalidInput(message: string): never {
  throw new ConvexError({ code: 'INVALID_INPUT', message })
}
