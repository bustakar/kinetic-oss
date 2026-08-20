# Kinetic

Kinetic lets people compose Exercises into reusable Routines, perform them as Workouts, and order
Routines into Programs.

Convex owns authentication, authorization, catalog publication, validation, and owner-scoped
domain state. TanStack Start owns routes, presentation, and user intent. WorkOS provides identity.

Catalog data is global and Git-owned. User data is mutable, owner-scoped, and private unless its
owner explicitly publishes it. Completed Workouts retain resolved Exercise snapshots so later
catalog or Custom Exercise edits cannot rewrite history.
