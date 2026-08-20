import { expect, test } from 'vitest'

import { loadCatalog, validateCatalog } from './catalog'

test('the checked-in catalog contains only Muscles and Exercises', () => {
  const catalog = loadCatalog()

  expect(catalog).toMatchObject({ schemaVersion: 1, revision: 1 })
  expect(catalog.muscleGroups).toHaveLength(12)
  expect(catalog.muscles).toHaveLength(30)
  expect(catalog.exercises).toHaveLength(377)
  expect(Object.keys(catalog).sort()).toEqual([
    'exercises',
    'muscleGroups',
    'muscles',
    'revision',
    'schemaVersion',
  ])
})

test('catalog validation rejects broken graph references', () => {
  const catalog = structuredClone(loadCatalog())
  catalog.exercises[0].muscles[0].slug = 'missing-muscle'

  expect(() => validateCatalog(catalog)).toThrow(/references unknown Muscle/)
})

test('catalog validation rejects duplicate slugs', () => {
  const catalog = structuredClone(loadCatalog())
  catalog.exercises.push(structuredClone(catalog.exercises[0]))

  expect(() => validateCatalog(catalog)).toThrow(/Duplicate Exercise slug/)
})

test('catalog validation requires a primary Muscle', () => {
  const catalog = structuredClone(loadCatalog())
  catalog.exercises[0].muscles = catalog.exercises[0].muscles.map((muscle) => ({
    ...muscle,
    role: 'secondary',
  }))

  expect(() => validateCatalog(catalog)).toThrow(/requires a primary Muscle/)
})
