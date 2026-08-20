import { convexTest } from 'convex-test'
import { expect, test } from 'vitest'

import { api, internal } from './_generated/api'
import schema from './schema'
import { modules } from './test.setup'

const snapshot = {
  schemaVersion: 1,
  revision: 1,
  muscleGroups: [{ slug: 'chest', name: 'Chest' }],
  muscles: [
    {
      slug: 'pectoralis-major',
      name: 'Pectoralis Major',
      groupSlug: 'chest',
    },
  ],
  exercises: [
    {
      slug: 'push-up',
      name: 'Push-up',
      defaultColumns: ['reps' as const],
      muscles: [{ slug: 'pectoralis-major', role: 'primary' as const }],
    },
  ],
}

test('publishing atomically exposes normalized catalog rows', async () => {
  const t = convexTest(schema, modules)

  await expect(
    t.mutation(internal.catalog.publish, { snapshot, contentHash: 'hash-1' }),
  ).resolves.toEqual({ revision: 1, changed: true })
  await expect(t.query(api.catalog.current, {})).resolves.toMatchObject({
    ...snapshot,
    contentHash: 'hash-1',
  })
})

test('publishing is idempotent but requires revision bumps', async () => {
  const t = convexTest(schema, modules)
  await t.mutation(internal.catalog.publish, {
    snapshot,
    contentHash: 'hash-1',
  })

  await expect(
    t.mutation(internal.catalog.publish, { snapshot, contentHash: 'hash-1' }),
  ).resolves.toEqual({ revision: 1, changed: false })
  await expect(
    t.mutation(internal.catalog.publish, { snapshot, contentHash: 'changed' }),
  ).rejects.toThrow('Catalog content changed without a revision bump')
})

test('publishing rejects removed catalog slugs', async () => {
  const t = convexTest(schema, modules)
  await t.mutation(internal.catalog.publish, {
    snapshot,
    contentHash: 'hash-1',
  })

  await expect(
    t.mutation(internal.catalog.publish, {
      snapshot: { ...snapshot, revision: 2, exercises: [] },
      contentHash: 'hash-2',
    }),
  ).rejects.toThrow('Exercise slug cannot be removed: push-up')
})
