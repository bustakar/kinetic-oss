import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { z } from 'zod'

const slug = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
const setColumnType = z.enum(['reps', 'weight', 'time'])

const muscleGroup = z.object({ slug, name: z.string().min(1) })
const muscle = z.object({
  slug,
  name: z.string().min(1),
  groupSlug: slug,
})
const exercise = z.object({
  slug,
  name: z.string().min(1),
  defaultColumns: z.array(setColumnType).min(1),
  muscles: z
    .array(
      z.object({
        slug,
        role: z.enum(['primary', 'secondary']),
      }),
    )
    .min(1),
  family: slug.optional(),
  deprecated: z.boolean().optional(),
})

const manifest = z.object({
  schemaVersion: z.number().int().positive(),
  revision: z.number().int().positive(),
})
const musclesFile = z.object({
  schemaVersion: z.number().int().positive(),
  muscleGroups: z.array(muscleGroup),
  muscles: z.array(muscle),
})
const exercisesFile = z.object({
  schemaVersion: z.number().int().positive(),
  exercises: z.array(exercise),
})

export type CatalogSnapshot = {
  schemaVersion: number
  revision: number
  muscleGroups: z.infer<typeof muscleGroup>[]
  muscles: z.infer<typeof muscle>[]
  exercises: z.infer<typeof exercise>[]
}

export function loadCatalog(root = resolve(import.meta.dirname, '..')) {
  const version = manifest.parse(readJson(root, 'data/catalog-manifest.json'))
  const muscleData = musclesFile.parse(readJson(root, 'data/muscles.json'))
  const exerciseData = exercisesFile.parse(
    readJson(root, 'data/exercises.json'),
  )
  if (
    muscleData.schemaVersion !== version.schemaVersion ||
    exerciseData.schemaVersion !== version.schemaVersion
  ) {
    throw new Error('Catalog files must use the manifest schema version')
  }

  const snapshot: CatalogSnapshot = {
    ...version,
    muscleGroups: muscleData.muscleGroups,
    muscles: muscleData.muscles,
    exercises: exerciseData.exercises,
  }
  validateCatalog(snapshot)
  return snapshot
}

export function validateCatalog(snapshot: CatalogSnapshot) {
  const groups = uniqueSlugs(snapshot.muscleGroups, 'Muscle Group')
  const muscles = uniqueSlugs(snapshot.muscles, 'Muscle')
  uniqueSlugs(snapshot.exercises, 'Exercise')

  for (const item of snapshot.muscles) {
    if (!groups.has(item.groupSlug)) {
      throw new Error(
        `Muscle ${item.slug} references unknown group ${item.groupSlug}`,
      )
    }
  }
  for (const item of snapshot.exercises) {
    const references = new Set<string>()
    let hasPrimary = false
    for (const reference of item.muscles) {
      if (!muscles.has(reference.slug)) {
        throw new Error(
          `Exercise ${item.slug} references unknown Muscle ${reference.slug}`,
        )
      }
      if (references.has(reference.slug)) {
        throw new Error(
          `Exercise ${item.slug} repeats Muscle ${reference.slug}`,
        )
      }
      references.add(reference.slug)
      hasPrimary ||= reference.role === 'primary'
    }
    if (!hasPrimary)
      throw new Error(`Exercise ${item.slug} requires a primary Muscle`)
  }
}

export function catalogHash(snapshot: CatalogSnapshot) {
  return createHash('sha256').update(JSON.stringify(snapshot)).digest('hex')
}

function uniqueSlugs(items: Array<{ slug: string }>, label: string) {
  const result = new Set<string>()
  for (const item of items) {
    if (result.has(item.slug))
      throw new Error(`Duplicate ${label} slug: ${item.slug}`)
    result.add(item.slug)
  }
  return result
}

function readJson(root: string, path: string): unknown {
  return JSON.parse(readFileSync(resolve(root, path), 'utf8'))
}
