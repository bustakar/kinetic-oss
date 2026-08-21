import { convexTest } from 'convex-test'
import { describe, expect, test, vi } from 'vitest'

import { api, internal } from '../convex/_generated/api'
import schema from '../convex/schema'

const modules = import.meta.glob('../convex/**/*.*s')
const definition = {
  name: ' Ring Press ',
  notes: '  A useful variation.  ',
  defaultColumns: ['reps', 'weight'] as const,
  muscles: [] as const,
}

describe('custom exercises', () => {
  test('requires authentication for owner operations', async () => {
    const t = convexTest(schema, modules)
    const exercise = await t
      .withIdentity({ subject: 'user_alex' })
      .mutation(api.customExercises.create, definition)

    await expect(t.query(api.customExercises.listMine, {})).rejects.toMatchObject({
      data: { code: 'UNAUTHENTICATED' },
    })
    await expect(
      t.mutation(api.customExercises.create, definition),
    ).rejects.toMatchObject({ data: { code: 'UNAUTHENTICATED' } })
    await expect(
      t.mutation(api.customExercises.update, {
        exerciseId: exercise._id,
        ...definition,
        visibility: 'private',
      }),
    ).rejects.toMatchObject({ data: { code: 'UNAUTHENTICATED' } })
    await expect(
      t.mutation(api.customExercises.remove, { exerciseId: exercise._id }),
    ).rejects.toMatchObject({ data: { code: 'UNAUTHENTICATED' } })
  })

  test('creates private exercises by default and lists only the owner', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-08-21T08:00:00Z'))
    const t = convexTest(schema, modules)
    const alex = t.withIdentity({ subject: 'user_alex' })
    const sam = t.withIdentity({ subject: 'user_sam' })

    const exercise = await alex.mutation(api.customExercises.create, definition)

    expect(exercise).toMatchObject({
      name: 'Ring Press',
      notes: 'A useful variation.',
      visibility: 'private',
      updatedAt: Date.now(),
    })
    await expect(alex.query(api.customExercises.listMine, {})).resolves.toEqual([
      exercise,
    ])
    await expect(sam.query(api.customExercises.listMine, {})).resolves.toEqual([])
    await expect(
      t.query(api.customExercises.get, { exerciseId: exercise._id }),
    ).resolves.toBeNull()

    vi.useRealTimers()
  })

  test('exposes public exercises without exposing private owner data', async () => {
    const t = convexTest(schema, modules)
    const alex = t.withIdentity({ subject: 'user_alex' })
    const sam = t.withIdentity({ subject: 'user_sam' })
    const exercise = await alex.mutation(api.customExercises.create, {
      ...definition,
      visibility: 'public',
    })

    await expect(
      sam.query(api.customExercises.get, { exerciseId: exercise._id }),
    ).resolves.toEqual(exercise)
    expect(exercise).not.toHaveProperty('ownerId')
  })

  test('lets only the owner update and remove an exercise', async () => {
    const t = convexTest(schema, modules)
    const alex = t.withIdentity({ subject: 'user_alex' })
    const sam = t.withIdentity({ subject: 'user_sam' })
    const exercise = await alex.mutation(api.customExercises.create, definition)
    const update = {
      exerciseId: exercise._id,
      name: 'Ring Push-Up',
      notes: undefined,
      defaultColumns: ['reps'] as const,
      muscles: [],
      visibility: 'public' as const,
    }

    await expect(
      sam.mutation(api.customExercises.update, update),
    ).rejects.toMatchObject({ data: { code: 'NOT_FOUND' } })
    const updated = await alex.mutation(api.customExercises.update, update)
    expect(updated).toMatchObject({
      name: 'Ring Push-Up',
      visibility: 'public',
    })
    expect(updated.notes).toBeUndefined()
    await expect(
      sam.mutation(api.customExercises.remove, { exerciseId: exercise._id }),
    ).rejects.toMatchObject({ data: { code: 'NOT_FOUND' } })
    await expect(
      alex.mutation(api.customExercises.remove, { exerciseId: exercise._id }),
    ).resolves.toBe(exercise._id)
    await expect(
      alex.query(api.customExercises.get, { exerciseId: exercise._id }),
    ).resolves.toBeNull()
  })

  test('validates measurement columns and active catalog muscles', async () => {
    const t = convexTest(schema, modules)
    const alex = t.withIdentity({ subject: 'user_alex' })

    await expect(
      alex.mutation(api.customExercises.create, {
        ...definition,
        defaultColumns: ['reps', 'time'],
      }),
    ).rejects.toThrow('exactly one of reps or time')
    await expect(
      alex.mutation(api.customExercises.create, {
        ...definition,
        muscles: [{ slug: 'missing', role: 'primary' }],
      }),
    ).rejects.toThrow('Unknown muscle slug: missing')

    await t.mutation(internal.catalog.applySnapshot, {
      snapshot: {
        schemaVersion: 1,
        revision: 1,
        muscleGroups: [{ slug: 'chest', name: 'Chest' }],
        muscles: [{ slug: 'pectoralis', name: 'Pectoralis', groupSlug: 'chest' }],
        exercises: [],
      },
      contentHash: 'a'.repeat(64),
    })
    await expect(
      alex.mutation(api.customExercises.create, {
        ...definition,
        muscles: [{ slug: 'pectoralis', role: 'primary' }],
      }),
    ).resolves.toMatchObject({
      muscles: [{ slug: 'pectoralis', role: 'primary' }],
    })
  })
})
