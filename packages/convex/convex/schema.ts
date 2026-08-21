import { defineSchema, defineTable } from 'convex/server'
import { v } from 'convex/values'

import {
  programSlot,
  routineExercise,
  visibility,
  workoutExercise,
  workoutSource,
} from './domainValidators'
import { exerciseDefinition } from './exerciseValidators'

const owned = {
  ownerId: v.string(),
  visibility,
  updatedAt: v.number(),
}

export default defineSchema({
  catalogState: defineTable({
    key: v.literal('active'),
    schemaVersion: v.number(),
    revision: v.number(),
    contentHash: v.string(),
    publishedAt: v.number(),
  }).index('by_key', ['key']),

  catalogMuscleGroups: defineTable({
    slug: v.string(),
    name: v.string(),
    deprecated: v.optional(v.boolean()),
    catalogRevision: v.number(),
  })
    .index('by_slug', ['slug'])
    .index('by_revision', ['catalogRevision']),

  catalogMuscles: defineTable({
    slug: v.string(),
    name: v.string(),
    groupSlug: v.string(),
    deprecated: v.optional(v.boolean()),
    catalogRevision: v.number(),
  })
    .index('by_slug', ['slug'])
    .index('by_group', ['groupSlug'])
    .index('by_revision', ['catalogRevision']),

  catalogExercises: defineTable({
    slug: v.string(),
    ...exerciseDefinition.fields,
    family: v.optional(v.string()),
    deprecated: v.optional(v.boolean()),
    catalogRevision: v.number(),
  })
    .index('by_slug', ['slug'])
    .index('by_family', ['family'])
    .index('by_revision', ['catalogRevision']),

  exercises: defineTable({
    ownerId: v.string(),
    updatedAt: v.number(),
    ...exerciseDefinition.fields,
    notes: v.optional(v.string()),
  })
    .index('by_owner', ['ownerId']),

  routines: defineTable({
    ...owned,
    name: v.string(),
    notes: v.optional(v.string()),
    exercises: v.array(routineExercise),
  })
    .index('by_owner', ['ownerId'])
    .index('by_owner_visibility', ['ownerId', 'visibility'])
    .index('by_visibility', ['visibility']),

  workouts: defineTable({
    ...owned,
    source: workoutSource,
    status: v.union(v.literal('active'), v.literal('completed')),
    startedAt: v.number(),
    completedAt: v.optional(v.number()),
    notes: v.optional(v.string()),
    exercises: v.array(workoutExercise),
  })
    .index('by_owner', ['ownerId'])
    .index('by_owner_visibility', ['ownerId', 'visibility'])
    .index('by_owner_status', ['ownerId', 'status'])
    .index('by_owner_started', ['ownerId', 'startedAt'])
    .index('by_visibility', ['visibility']),

  programs: defineTable({
    ...owned,
    name: v.string(),
    notes: v.optional(v.string()),
    slots: v.array(programSlot),
  })
    .index('by_owner', ['ownerId'])
    .index('by_owner_visibility', ['ownerId', 'visibility'])
    .index('by_visibility', ['visibility']),
})
