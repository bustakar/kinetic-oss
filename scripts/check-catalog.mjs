import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const dataUrl = new URL('../data/', import.meta.url)
const manifest = read('manifest.json')
const muscleGroups = read('muscle-groups.json')
const muscles = read('muscles.json')
const exercises = read('exercises.json')

exactKeys(manifest, ['revision', 'schemaVersion'], 'Manifest')
assert.equal(manifest.schemaVersion, 1, 'Unsupported catalog schemaVersion')
positiveInteger(manifest.revision, 'Manifest revision')

const groupSlugs = uniqueRecords(muscleGroups, 'Muscle Group', (item) => {
  exactKeys(item, ['name', 'slug'], `Muscle Group ${item.slug}`)
  identity(item, 'Muscle Group')
})

const muscleSlugs = uniqueRecords(muscles, 'Muscle', (item) => {
  exactKeys(item, ['groupSlug', 'name', 'slug'], `Muscle ${item.slug}`)
  identity(item, 'Muscle')
  slug(item.groupSlug, `Muscle ${item.slug} groupSlug`)
  assert(groupSlugs.has(item.groupSlug), `Muscle ${item.slug} references an unknown group`)
})

uniqueRecords(exercises, 'Exercise', (item) => {
  exactKeys(
    item,
    ['defaultColumns', 'deprecated', 'family', 'muscles', 'name', 'slug'],
    `Exercise ${item.slug}`,
    ['deprecated', 'family'],
  )
  identity(item, 'Exercise')
  assert(Array.isArray(item.defaultColumns) && item.defaultColumns.length > 0)
  for (const column of item.defaultColumns) {
    assert(['reps', 'time', 'weight'].includes(column), `Exercise ${item.slug} has an invalid column`)
  }
  const columns = new Set(item.defaultColumns)
  assert.equal(columns.size, item.defaultColumns.length, `Exercise ${item.slug} repeats a column`)
  assert.equal(
    Number(columns.has('reps')) + Number(columns.has('time')),
    1,
    `Exercise ${item.slug} requires exactly one reps or time column`,
  )
  assert(Array.isArray(item.muscles) && item.muscles.length > 0)
  const references = new Set()
  let hasPrimary = false
  for (const reference of item.muscles) {
    exactKeys(reference, ['role', 'slug'], `Exercise ${item.slug} Muscle`)
    slug(reference.slug, `Exercise ${item.slug} Muscle slug`)
    assert(muscleSlugs.has(reference.slug), `Exercise ${item.slug} references an unknown Muscle`)
    assert(!references.has(reference.slug), `Exercise ${item.slug} repeats Muscle ${reference.slug}`)
    assert(['primary', 'secondary'].includes(reference.role), `Exercise ${item.slug} has an invalid role`)
    references.add(reference.slug)
    hasPrimary ||= reference.role === 'primary'
  }
  assert(hasPrimary, `Exercise ${item.slug} requires a primary Muscle`)
  if (item.family !== undefined) slug(item.family, `Exercise ${item.slug} family`)
  if (item.deprecated !== undefined) assert.equal(typeof item.deprecated, 'boolean')
})

console.log(
  `Catalog valid: ${muscleGroups.length} groups, ${muscles.length} muscles, ${exercises.length} exercises`,
)

function read(name) {
  return JSON.parse(readFileSync(new URL(name, dataUrl), 'utf8'))
}

function uniqueRecords(records, label, validate) {
  assert(Array.isArray(records), `${label} data must be an array`)
  const slugs = new Set()
  for (const item of records) {
    assert(item && typeof item === 'object' && !Array.isArray(item), `${label} must be an object`)
    validate(item)
    assert(!slugs.has(item.slug), `Duplicate ${label} slug: ${item.slug}`)
    slugs.add(item.slug)
  }
  return slugs
}

function identity(item, label) {
  slug(item.slug, `${label} slug`)
  assert.equal(typeof item.name, 'string', `${label} ${item.slug} name must be a string`)
  assert(item.name.trim(), `${label} ${item.slug} name cannot be empty`)
}

function slug(value, label) {
  assert.equal(typeof value, 'string', `${label} must be a string`)
  assert(/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value), `${label} is invalid: ${value}`)
}

function positiveInteger(value, label) {
  assert(Number.isInteger(value) && value > 0, `${label} must be a positive integer`)
}

function exactKeys(value, allowed, label, optional = []) {
  const required = allowed.filter((key) => !optional.includes(key))
  for (const key of required) assert(Object.hasOwn(value, key), `${label} is missing ${key}`)
  for (const key of Object.keys(value)) assert(allowed.includes(key), `${label} has unknown field ${key}`)
}
