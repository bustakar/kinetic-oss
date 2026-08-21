import type { Infer } from 'convex/values'

import type { catalogSnapshot } from './catalogValidators'

export type CatalogSnapshot = Infer<typeof catalogSnapshot>

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

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
