import { convexTest } from 'convex-test'
import { afterEach, describe, expect, test, vi } from 'vitest'

import { api, internal } from '../convex/_generated/api'
import schema from '../convex/schema'

const modules = import.meta.glob('../convex/**/*.*s')
const firstHash = 'a'.repeat(64)
const secondHash = 'b'.repeat(64)

const snapshot = {
  schemaVersion: 1,
  revision: 1,
  muscleGroups: [{ slug: 'legs', name: 'Legs' }],
  muscles: [{ slug: 'quads', name: 'Quadriceps', groupSlug: 'legs' }],
  exercises: [
    {
      slug: 'squat',
      name: 'Squat',
      defaultColumns: ['reps', 'weight'] as const,
      muscles: [{ slug: 'quads', role: 'primary' as const }],
      family: 'squat',
    },
  ],
}

describe('catalog publication', () => {
  afterEach(() => vi.restoreAllMocks())

  test('publishes one snapshot and exposes it as the current catalog', async () => {
    const t = convexTest(schema, modules)

    await expect(
      t.mutation(internal.catalog.applySnapshot, {
        snapshot,
        contentHash: firstHash,
      }),
    ).resolves.toEqual({ changed: true, revision: 1 })

    await expect(t.query(api.catalog.current, {})).resolves.toEqual({
      ...snapshot,
      contentHash: firstHash,
    })
  })

  test('rejects an exercise without set columns', async () => {
    const t = convexTest(schema, modules)
    const invalidSnapshot = {
      ...snapshot,
      exercises: [
        {
          ...snapshot.exercises[0],
          defaultColumns: [] as const,
        },
      ],
    }

    await expect(
      t.mutation(internal.catalog.applySnapshot, {
        snapshot: invalidSnapshot,
        contentHash: firstHash,
      }),
    ).rejects.toThrow('must define a set column')
    await expect(t.query(api.catalog.current, {})).resolves.toBeNull()
  })

  test('is idempotent and rejects reused or older revisions', async () => {
    const t = convexTest(schema, modules)

    await t.mutation(internal.catalog.applySnapshot, {
      snapshot,
      contentHash: firstHash,
    })
    await expect(
      t.mutation(internal.catalog.applySnapshot, {
        snapshot,
        contentHash: firstHash,
      }),
    ).resolves.toEqual({ changed: false, revision: 1 })
    await expect(
      t.mutation(internal.catalog.applySnapshot, {
        snapshot,
        contentHash: secondHash,
      }),
    ).rejects.toThrow('already published with different content')

    const revisionTwo = { ...snapshot, revision: 2 }
    await t.mutation(internal.catalog.applySnapshot, {
      snapshot: revisionTwo,
      contentHash: secondHash,
    })
    await expect(
      t.mutation(internal.catalog.applySnapshot, {
        snapshot,
        contentHash: firstHash,
      }),
    ).rejects.toThrow('older than active revision 2')
  })

  test('keeps published slugs stable across revisions', async () => {
    const t = convexTest(schema, modules)
    await t.mutation(internal.catalog.applySnapshot, {
      snapshot,
      contentHash: firstHash,
    })

    await expect(
      t.mutation(internal.catalog.applySnapshot, {
        snapshot: { ...snapshot, revision: 2, exercises: [] },
        contentHash: secondHash,
      }),
    ).rejects.toThrow('Published exercise slug squat cannot be removed')
    await expect(t.query(api.catalog.current, {})).resolves.toMatchObject({
      revision: 1,
      contentHash: firstHash,
    })
  })

  test('validates the catalog graph at the mutation boundary', async () => {
    const t = convexTest(schema, modules)

    await expect(
      t.mutation(internal.catalog.applySnapshot, {
        snapshot: {
          ...snapshot,
          muscles: [{ ...snapshot.muscles[0], groupSlug: 'missing' }],
        },
        contentHash: firstHash,
      }),
    ).rejects.toThrow('references unknown group missing')
    await expect(t.query(api.catalog.current, {})).resolves.toBeNull()
  })

  test('requires a SHA-256 content hash', async () => {
    const t = convexTest(schema, modules)

    await expect(
      t.mutation(internal.catalog.applySnapshot, {
        snapshot,
        contentHash: 'not-a-hash',
      }),
    ).rejects.toThrow('must be a lowercase SHA-256 digest')
  })

  test('publishes catalog files from one exact Git commit', async () => {
    const t = convexTest(schema, modules)
    const commit = 'c'.repeat(40)
    const files: Record<string, unknown> = {
      'manifest.json': {
        schemaVersion: snapshot.schemaVersion,
        revision: snapshot.revision,
      },
      'muscle-groups.json': snapshot.muscleGroups,
      'muscles.json': snapshot.muscles,
      'exercises.json': snapshot.exercises,
    }
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const name = String(input).split('/').at(-1)
      return name !== undefined && Object.hasOwn(files, name)
        ? new Response(JSON.stringify(files[name]))
        : new Response(null, { status: 404 })
    })

    await expect(
      t.action(internal.catalog.publish, { commit }),
    ).resolves.toEqual({ changed: true, revision: 1 })
    expect(fetchMock).toHaveBeenCalledTimes(4)
    for (const name of Object.keys(files)) {
      expect(fetchMock).toHaveBeenCalledWith(
        `https://raw.githubusercontent.com/bustakar/kinetic-oss/${commit}/data/${name}`,
      )
    }
    await expect(t.query(api.catalog.current, {})).resolves.toMatchObject({
      revision: 1,
      contentHash: expect.stringMatching(/^[a-f0-9]{64}$/),
    })
  })

  test('rejects a moving or abbreviated Git ref before fetching', async () => {
    const t = convexTest(schema, modules)
    const fetchMock = vi.spyOn(globalThis, 'fetch')

    await expect(
      t.action(internal.catalog.publish, { commit: 'main' }),
    ).rejects.toThrow('must be a full lowercase Git SHA')
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
