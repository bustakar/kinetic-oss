import type { Infer } from 'convex/values'

import type { catalogSnapshot } from './catalogValidators'

export type CatalogSnapshot = Infer<typeof catalogSnapshot>

export type CatalogFiles = {
  manifest: unknown
  muscleGroups: unknown
  muscles: unknown
  exercises: unknown
}

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

export function parseCatalogFiles(files: CatalogFiles): CatalogSnapshot {
  const manifest = record(files.manifest, 'Manifest')
  exactKeys(manifest, ['revision', 'schemaVersion'], 'Manifest')

  const snapshot: CatalogSnapshot = {
    schemaVersion: number(manifest.schemaVersion, 'Manifest schemaVersion'),
    revision: number(manifest.revision, 'Manifest revision'),
    muscleGroups: array(files.muscleGroups, 'Muscle group data').map((value) => {
      const item = record(value, 'Muscle group')
      exactKeys(item, ['deprecated', 'name', 'slug'], 'Muscle group', ['deprecated'])
      return {
        slug: string(item.slug, 'Muscle group slug'),
        name: string(item.name, 'Muscle group name'),
        ...(item.deprecated === undefined
          ? {}
          : { deprecated: boolean(item.deprecated, 'Muscle group deprecated') }),
      }
    }),
    muscles: array(files.muscles, 'Muscle data').map((value) => {
      const item = record(value, 'Muscle')
      exactKeys(
        item,
        ['deprecated', 'groupSlug', 'name', 'slug'],
        'Muscle',
        ['deprecated'],
      )
      return {
        slug: string(item.slug, 'Muscle slug'),
        name: string(item.name, 'Muscle name'),
        groupSlug: string(item.groupSlug, 'Muscle groupSlug'),
        ...(item.deprecated === undefined
          ? {}
          : { deprecated: boolean(item.deprecated, 'Muscle deprecated') }),
      }
    }),
    exercises: array(files.exercises, 'Exercise data').map((value) => {
      const item = record(value, 'Exercise')
      exactKeys(
        item,
        ['defaultColumns', 'deprecated', 'family', 'muscles', 'name', 'slug'],
        'Exercise',
        ['deprecated', 'family'],
      )
      return {
        slug: string(item.slug, 'Exercise slug'),
        name: string(item.name, 'Exercise name'),
        defaultColumns: array(item.defaultColumns, 'Exercise defaultColumns').map(
          setColumn,
        ),
        muscles: array(item.muscles, 'Exercise muscles').map((value) => {
          const reference = record(value, 'Exercise muscle')
          exactKeys(reference, ['role', 'slug'], 'Exercise muscle')
          return {
            slug: string(reference.slug, 'Exercise muscle slug'),
            role: muscleRole(reference.role),
          }
        }),
        ...(item.family === undefined
          ? {}
          : { family: string(item.family, 'Exercise family') }),
        ...(item.deprecated === undefined
          ? {}
          : { deprecated: boolean(item.deprecated, 'Exercise deprecated') }),
      }
    }),
  }

  validateCatalogSnapshot(snapshot)
  return snapshot
}

export function validateCatalogSnapshot(snapshot: CatalogSnapshot): void {
  if (snapshot.schemaVersion !== 1) {
    throw new Error(`Unsupported catalog schema version: ${snapshot.schemaVersion}`)
  }
  if (!Number.isSafeInteger(snapshot.revision) || snapshot.revision < 1) {
    throw new Error('Catalog revision must be a positive integer')
  }

  const groupSlugs = validateEntries('muscle group', snapshot.muscleGroups)
  const muscleSlugs = validateEntries('muscle', snapshot.muscles)
  validateEntries('exercise', snapshot.exercises)

  for (const muscle of snapshot.muscles) {
    if (!groupSlugs.has(muscle.groupSlug)) {
      throw new Error(
        `Muscle ${muscle.slug} references unknown group ${muscle.groupSlug}`,
      )
    }
  }

  for (const exercise of snapshot.exercises) {
    if (exercise.family !== undefined && !slugPattern.test(exercise.family)) {
      throw new Error(`Invalid exercise family slug: ${exercise.family}`)
    }
    if (exercise.defaultColumns.length === 0) {
      throw new Error(`Exercise ${exercise.slug} must define a set column`)
    }
    if (new Set(exercise.defaultColumns).size !== exercise.defaultColumns.length) {
      throw new Error(`Exercise ${exercise.slug} has duplicate set columns`)
    }
    const repetitionColumns = Number(exercise.defaultColumns.includes('reps'))
      + Number(exercise.defaultColumns.includes('time'))
    if (repetitionColumns !== 1) {
      throw new Error(`Exercise ${exercise.slug} must use exactly one of reps or time`)
    }

    const referencedMuscles = new Set<string>()
    let hasPrimaryMuscle = false
    for (const muscle of exercise.muscles) {
      if (!muscleSlugs.has(muscle.slug)) {
        throw new Error(
          `Exercise ${exercise.slug} references unknown muscle ${muscle.slug}`,
        )
      }
      if (referencedMuscles.has(muscle.slug)) {
        throw new Error(
          `Exercise ${exercise.slug} references muscle ${muscle.slug} more than once`,
        )
      }
      referencedMuscles.add(muscle.slug)
      hasPrimaryMuscle ||= muscle.role === 'primary'
    }
    if (!hasPrimaryMuscle) {
      throw new Error(`Exercise ${exercise.slug} must define a primary muscle`)
    }
  }
}

function validateEntries(
  kind: string,
  entries: ReadonlyArray<{ slug: string; name: string }>,
): Set<string> {
  const slugs = new Set<string>()
  for (const entry of entries) {
    if (!slugPattern.test(entry.slug)) {
      throw new Error(`Invalid ${kind} slug: ${entry.slug}`)
    }
    if (entry.name.trim().length === 0) {
      throw new Error(`${kind} ${entry.slug} must have a name`)
    }
    if (slugs.has(entry.slug)) {
      throw new Error(`Duplicate ${kind} slug: ${entry.slug}`)
    }
    slugs.add(entry.slug)
  }
  return slugs
}

function record(value: unknown, label: string): Record<string, unknown> {
  if (!isRecord(value)) throw new Error(`${label} must be an object`)
  return value
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function array(value: unknown, label: string): unknown[] {
  if (!Array.isArray(value)) throw new Error(`${label} must be an array`)
  return value
}

function string(value: unknown, label: string): string {
  if (typeof value !== 'string') throw new Error(`${label} must be a string`)
  return value
}

function number(value: unknown, label: string): number {
  if (typeof value !== 'number') throw new Error(`${label} must be a number`)
  return value
}

function boolean(value: unknown, label: string): boolean {
  if (typeof value !== 'boolean') throw new Error(`${label} must be a boolean`)
  return value
}

function setColumn(value: unknown): 'reps' | 'time' | 'weight' {
  if (value !== 'reps' && value !== 'time' && value !== 'weight') {
    throw new Error(`Invalid exercise set column: ${String(value)}`)
  }
  return value
}

function muscleRole(value: unknown): 'primary' | 'secondary' {
  if (value !== 'primary' && value !== 'secondary') {
    throw new Error(`Invalid exercise muscle role: ${String(value)}`)
  }
  return value
}

function exactKeys(
  value: Record<string, unknown>,
  allowed: string[],
  label: string,
  optional: string[] = [],
): void {
  for (const key of allowed) {
    if (!optional.includes(key) && !Object.hasOwn(value, key)) {
      throw new Error(`${label} is missing ${key}`)
    }
  }
  for (const key of Object.keys(value)) {
    if (!allowed.includes(key)) throw new Error(`${label} has unknown field ${key}`)
  }
}
