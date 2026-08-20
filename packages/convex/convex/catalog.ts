import { v } from 'convex/values'

import { internal } from './_generated/api'
import { internalAction, internalMutation, query } from './_generated/server'
import {
  catalogPublicationResult,
  catalogSnapshot,
} from './catalogValidators'
import type { CatalogSnapshot } from './catalogModel'
import { validateCatalogSnapshot } from './catalogModel'

const catalogBaseUrl = 'https://raw.githubusercontent.com/bustakar/kinetic-oss'

export const publish = internalAction({
  args: { commit: v.string() },
  returns: catalogPublicationResult,
  handler: async (
    ctx,
    { commit },
  ): Promise<{ revision: number; changed: boolean }> => {
    if (!/^[a-f0-9]{40}$/.test(commit)) {
      throw new Error('Catalog commit must be a full lowercase Git SHA')
    }

    const [manifest, muscleGroups, muscles, exercises] = await Promise.all([
      fetchCatalogFile(commit, 'manifest.json'),
      fetchCatalogFile(commit, 'muscle-groups.json'),
      fetchCatalogFile(commit, 'muscles.json'),
      fetchCatalogFile(commit, 'exercises.json'),
    ])
    if (!isRecord(manifest)) throw new Error('Catalog manifest must be an object')

    // applySnapshot's argument validator is the runtime parser for remote JSON.
    const snapshot = {
      ...manifest,
      muscleGroups,
      muscles,
      exercises,
    } as CatalogSnapshot
    const contentHash = await sha256(JSON.stringify(snapshot))

    return await ctx.runMutation(internal.catalog.applySnapshot, {
      snapshot,
      contentHash,
    })
  },
})

export const current = query({
  args: {},
  returns: v.union(
    v.null(),
    v.object({
      ...catalogSnapshot.fields,
      contentHash: v.string(),
    }),
  ),
  handler: async (ctx) => {
    const state = await ctx.db
      .query('catalogState')
      .withIndex('by_key', (q) => q.eq('key', 'active'))
      .unique()
    if (state === null) return null

    const [muscleGroups, muscles, exercises] = await Promise.all([
      ctx.db
        .query('catalogMuscleGroups')
        .withIndex('by_revision', (q) => q.eq('catalogRevision', state.revision))
        .collect(),
      ctx.db
        .query('catalogMuscles')
        .withIndex('by_revision', (q) => q.eq('catalogRevision', state.revision))
        .collect(),
      ctx.db
        .query('catalogExercises')
        .withIndex('by_revision', (q) => q.eq('catalogRevision', state.revision))
        .collect(),
    ])

    return {
      schemaVersion: state.schemaVersion,
      revision: state.revision,
      contentHash: state.contentHash,
      muscleGroups: muscleGroups.map(stripCatalogMetadata).sort(bySlug),
      muscles: muscles.map(stripCatalogMetadata).sort(bySlug),
      exercises: exercises.map(stripCatalogMetadata).sort(bySlug),
    }
  },
})

export const applySnapshot = internalMutation({
  args: {
    snapshot: catalogSnapshot,
    contentHash: v.string(),
  },
  returns: catalogPublicationResult,
  handler: async (ctx, { snapshot, contentHash }) => {
    validateCatalogSnapshot(snapshot)
    if (!/^[a-f0-9]{64}$/.test(contentHash)) {
      throw new Error('Catalog content hash must be a lowercase SHA-256 digest')
    }

    const state = await ctx.db
      .query('catalogState')
      .withIndex('by_key', (q) => q.eq('key', 'active'))
      .unique()

    if (state !== null) {
      if (snapshot.revision < state.revision) {
        throw new Error(
          `Catalog revision ${snapshot.revision} is older than active revision ${state.revision}`,
        )
      }
      if (snapshot.revision === state.revision) {
        if (contentHash !== state.contentHash) {
          throw new Error(
            `Catalog revision ${snapshot.revision} was already published with different content`,
          )
        }
        return { revision: snapshot.revision, changed: false }
      }
    }

    const [existingGroups, existingMuscles, existingExercises] = await Promise.all([
      ctx.db.query('catalogMuscleGroups').collect(),
      ctx.db.query('catalogMuscles').collect(),
      ctx.db.query('catalogExercises').collect(),
    ])
    const groupsBySlug = new Map(
      snapshot.muscleGroups.map((item) => [item.slug, item]),
    )
    const musclesBySlug = new Map(snapshot.muscles.map((item) => [item.slug, item]))
    const exercisesBySlug = new Map(
      snapshot.exercises.map((item) => [item.slug, item]),
    )

    rejectRemovedSlugs(existingGroups, groupsBySlug, 'muscle group')
    rejectRemovedSlugs(existingMuscles, musclesBySlug, 'muscle')
    rejectRemovedSlugs(existingExercises, exercisesBySlug, 'exercise')

    const existingGroupsBySlug = new Map(
      existingGroups.map((item) => [item.slug, item]),
    )
    const existingMusclesBySlug = new Map(
      existingMuscles.map((item) => [item.slug, item]),
    )
    const existingExercisesBySlug = new Map(
      existingExercises.map((item) => [item.slug, item]),
    )

    for (const item of snapshot.muscleGroups) {
      const existing = existingGroupsBySlug.get(item.slug)
      const value = { ...item, catalogRevision: snapshot.revision }
      if (existing === undefined) await ctx.db.insert('catalogMuscleGroups', value)
      else await ctx.db.replace(existing._id, value)
    }
    for (const item of snapshot.muscles) {
      const existing = existingMusclesBySlug.get(item.slug)
      const value = { ...item, catalogRevision: snapshot.revision }
      if (existing === undefined) await ctx.db.insert('catalogMuscles', value)
      else await ctx.db.replace(existing._id, value)
    }
    for (const item of snapshot.exercises) {
      const existing = existingExercisesBySlug.get(item.slug)
      const value = { ...item, catalogRevision: snapshot.revision }
      if (existing === undefined) await ctx.db.insert('catalogExercises', value)
      else await ctx.db.replace(existing._id, value)
    }

    const nextState = {
      key: 'active' as const,
      schemaVersion: snapshot.schemaVersion,
      revision: snapshot.revision,
      contentHash,
      publishedAt: Date.now(),
    }
    if (state === null) await ctx.db.insert('catalogState', nextState)
    else await ctx.db.replace(state._id, nextState)

    return { revision: snapshot.revision, changed: true }
  },
})

function stripCatalogMetadata<
  T extends { _id: unknown; _creationTime: number; catalogRevision: number },
>(
  item: T,
): Omit<T, '_id' | '_creationTime' | 'catalogRevision'> {
  const {
    _id: _id,
    _creationTime: _creationTime,
    catalogRevision: _revision,
    ...value
  } = item
  return value
}

function bySlug(a: { slug: string }, b: { slug: string }): number {
  return a.slug.localeCompare(b.slug)
}

async function fetchCatalogFile(commit: string, name: string): Promise<unknown> {
  const url = `${catalogBaseUrl}/${commit}/data/${name}`
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Could not fetch ${name} at ${commit}: HTTP ${response.status}`)
  }
  return await response.json()
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

async function sha256(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value)
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, '0'),
  ).join('')
}

function rejectRemovedSlugs<T extends { slug: string }>(
  existing: T[],
  nextBySlug: ReadonlyMap<string, unknown>,
  kind: string,
): void {
  const removed = existing.find((item) => !nextBySlug.has(item.slug))
  if (removed !== undefined) {
    throw new Error(
      `Published ${kind} slug ${removed.slug} cannot be removed; deprecate it instead`,
    )
  }
}
